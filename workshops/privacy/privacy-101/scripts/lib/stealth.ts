// ERC-5564 scheme 1 (secp256k1 with view tags), implemented with ethers only.
//
// Convention used throughout this workshop (it must match on both sides):
//   S        = ephemeralPrivateKey * viewingPublicKey          (ECDH point)
//   s        = keccak256(S.x || S.y)                           (64 bytes hashed)
//   viewTag  = first byte of s
//   P        = spendingPublicKey + (s mod n) * G
//   p        = (spendingPrivateKey + s) mod n
import { ethers } from "ethers";

export const SCHEME_ID = 1n;
export const SECP256K1_N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

export interface StealthKeys {
  spendingPrivateKey: string;
  viewingPrivateKey: string;
  metaAddress: string;
}

export interface StealthPayment {
  stealthAddress: string;
  ephemeralPublicKey: string;
  viewTag: string;
}

export function generateStealthKeys(): StealthKeys {
  const spending = new ethers.SigningKey(ethers.hexlify(ethers.randomBytes(32)));
  const viewing = new ethers.SigningKey(ethers.hexlify(ethers.randomBytes(32)));
  return {
    spendingPrivateKey: spending.privateKey,
    viewingPrivateKey: viewing.privateKey,
    metaAddress: buildMetaAddress(spending.compressedPublicKey, viewing.compressedPublicKey),
  };
}

/// 66 bytes: compressed spending public key followed by compressed viewing public key.
export function buildMetaAddress(spendingPublicKey: string, viewingPublicKey: string): string {
  return ethers.concat([
    ethers.SigningKey.computePublicKey(spendingPublicKey, true),
    ethers.SigningKey.computePublicKey(viewingPublicKey, true),
  ]);
}

export function parseMetaAddress(metaAddress: string): { spendingPublicKey: string; viewingPublicKey: string } {
  const bytes = ethers.getBytes(metaAddress);
  if (bytes.length !== 66) throw new Error(`stealth meta-address must be 66 bytes, got ${bytes.length}`);
  return {
    spendingPublicKey: ethers.hexlify(bytes.slice(0, 33)),
    viewingPublicKey: ethers.hexlify(bytes.slice(33)),
  };
}

function hashSharedSecret(privateKey: string, publicKey: string): { scalar: string; viewTag: string } {
  // computeSharedSecret returns the uncompressed point 0x04 || x || y.
  const point = new ethers.SigningKey(privateKey).computeSharedSecret(publicKey);
  const hash = ethers.keccak256(ethers.dataSlice(point, 1));
  const scalar = ethers.toBeHex(BigInt(hash) % SECP256K1_N, 32);
  return { scalar, viewTag: ethers.dataSlice(hash, 0, 1) };
}

/// Sender side: derive a one-time address for the owner of `metaAddress`.
export function generateStealthAddress(metaAddress: string, ephemeralPrivateKey?: string): StealthPayment {
  const { spendingPublicKey, viewingPublicKey } = parseMetaAddress(metaAddress);
  const ephemeral = new ethers.SigningKey(ephemeralPrivateKey ?? ethers.hexlify(ethers.randomBytes(32)));
  const { scalar, viewTag } = hashSharedSecret(ephemeral.privateKey, viewingPublicKey);
  const stealthPublicKey = ethers.SigningKey.addPoints(
    spendingPublicKey,
    new ethers.SigningKey(scalar).publicKey,
    false,
  );
  return {
    stealthAddress: ethers.computeAddress(stealthPublicKey),
    ephemeralPublicKey: ephemeral.compressedPublicKey,
    viewTag,
  };
}

/// Recipient side: returns the stealth private key if the announcement is
/// for these keys, null otherwise. Only the viewing key is needed to decide.
export function recoverStealthPrivateKey(
  spendingPrivateKey: string,
  viewingPrivateKey: string,
  ephemeralPublicKey: string,
  announcedViewTag: string,
  announcedStealthAddress: string,
): string | null {
  let secret: { scalar: string; viewTag: string };
  try {
    secret = hashSharedSecret(viewingPrivateKey, ephemeralPublicKey);
  } catch {
    // Announcements are unauthenticated: the ephemeral key may be garbage.
    return null;
  }
  if (secret.viewTag.toLowerCase() !== announcedViewTag.toLowerCase()) return null;

  const stealthPrivateKey = ethers.toBeHex((BigInt(spendingPrivateKey) + BigInt(secret.scalar)) % SECP256K1_N, 32);
  if (ethers.computeAddress(stealthPrivateKey).toLowerCase() !== announcedStealthAddress.toLowerCase()) return null;
  return stealthPrivateKey;
}
