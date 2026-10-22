// Generates the signatures expected by FakeMeebitsClaimer.claimAToken().
// Each signature authorizes a single (fakeMeebitsAddress, tokenId) pair.
// Run: npx hardhat run scripts/sign-tokens.ts --network sepolia

import { encodeAbiParameters, keccak256, parseAbiParameters } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const FAKE_MEEBITS_ADDRESS = process.env.FAKE_MEEBITS_ADDRESS as `0x${string}`;
const SIGNER_PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
const TOKEN_COUNT = Number(process.env.SIG_TOKEN_COUNT ?? 100);

async function main(): Promise<void> {
  if (!FAKE_MEEBITS_ADDRESS) throw new Error("FAKE_MEEBITS_ADDRESS not set");
  if (!SIGNER_PRIVATE_KEY) throw new Error("PRIVATE_KEY not set");

  const account = privateKeyToAccount(SIGNER_PRIVATE_KEY);
  console.log(`Signing from ${account.address}`);
  console.log(`Target FakeMeebits: ${FAKE_MEEBITS_ADDRESS}`);
  console.log(`Signing tokens 0..${TOKEN_COUNT - 1}`);

  const signatures: Array<{ tokenNumber: number; signature: `0x${string}` }> = [];

  for (let tokenId = 0; tokenId < TOKEN_COUNT; tokenId++) {
    const encoded = encodeAbiParameters(
      parseAbiParameters("address, uint256"),
      [FAKE_MEEBITS_ADDRESS, BigInt(tokenId)]
    );
    const hash = keccak256(encoded);
    const signature = await account.signMessage({ message: { raw: hash } });
    signatures.push({ tokenNumber: tokenId, signature });
  }

  const outputPath = path.join(__dirname, "..", "signatures", "output-sig.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(signatures, null, 2));
  console.log(`Wrote ${signatures.length} signatures to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
