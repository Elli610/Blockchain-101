// Sign the "Greeting" EIP-712 struct expected by:
//   Evaluator.ex2_signTypedGreeting
//   Evaluator.ex3_recoverInSolution
//   Evaluator.ex4_rejectMalleable  (submit the canonical variant)
//
// The same signature works for all three, as long as `nonce` matches
// Evaluator.evaluatorNonce(msg.sender) and `content` matches
// Evaluator.getContentFor(msg.sender). Note: ex2 and ex3 each consume the
// nonce; you will need to re-sign after each successful call.
//
// Run:
//   DEADLINE_MINUTES=30 npx hardhat run --network sepolia scripts/sign-typed.ts
import { ethers } from "hardhat";

async function main() {
  const evaluatorAddress = requireEnv("EVALUATOR_ADDRESS");

  const [signer] = await ethers.getSigners();
  const evaluator = await ethers.getContractAt("Evaluator", evaluatorAddress, signer);

  const chainId = (await ethers.provider.getNetwork()).chainId;
  const content: string = await evaluator.getContentFor(signer.address);
  const nonce: bigint = await evaluator.evaluatorNonce(signer.address);
  const deadline = Math.floor(Date.now() / 1000) + 60 * Number(process.env.DEADLINE_MINUTES ?? 30);

  const domain = {
    name: "Permit101Evaluator",
    version: "1",
    chainId,
    verifyingContract: evaluatorAddress,
  };
  const types = {
    Greeting: [
      { name: "who", type: "address" },
      { name: "content", type: "string" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };
  const value = {
    who: signer.address,
    content,
    nonce,
    deadline,
  };

  const signature = await signer.signTypedData(domain, types, value);
  const { v, r, s } = ethers.Signature.from(signature);

  console.log(`content = "${content}"`);
  console.log(`nonce   = ${nonce}`);
  console.log(`deadline= ${deadline}`);
  console.log(`v = ${v}`);
  console.log(`r = ${r}`);
  console.log(`s = ${s}`);
  console.log(`signature = ${signature}`);
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
