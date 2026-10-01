// Sign the bonus ex15 smart-wallet challenge.
//
// The Evaluator's `smartWalletChallenge(student)` returns:
//   keccak256(abi.encode(evaluator, student, "Permit101:1271"))
//
// The student's wallet's `isValidSignature(hash, sig)` must return the ERC-1271
// magic value 0x1626ba7e when called with this hash and the signature this
// script produces.
//
// A simple wallet implementation validates by recovering an owner EOA.
// Whatever signature format your wallet expects, produce it here.
//
// Run:
//   npx hardhat run --network sepolia scripts/sign-1271.ts
import { ethers } from "hardhat";

async function main() {
  const evaluatorAddress = requireEnv("EVALUATOR_ADDRESS");
  const [signer] = await ethers.getSigners();

  const evaluator = await ethers.getContractAt("Evaluator", evaluatorAddress, signer);
  const challenge: string = await evaluator.smartWalletChallenge(signer.address);
  console.log(`challenge hash = ${challenge}`);

  // Default flow: sign the raw 32-byte hash directly (no EIP-191 prefix).
  // Adapt to your wallet: some ERC-1271 wallets expect an EIP-191 or EIP-712
  // signed digest instead.
  const signature = await signer.signMessage(ethers.getBytes(challenge));
  console.log(`signature (EIP-191 wrapped) = ${signature}`);
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
