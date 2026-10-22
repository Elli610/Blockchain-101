// Smoke test the deployed Evaluator from the deployer wallet.
// Run: npx hardhat run scripts/smoke-test.ts --network sepolia

import { ethers } from "hardhat";

const POINTS = "0x96eA03b5ecfF6EeeD96EE8EcEf1153Aa79a03997";
const EVALUATOR = "0x2822168E32E642a93DC677384d8f3F13E5b0EfC2";

async function main(): Promise<void> {
  const [me] = await ethers.getSigners();
  const addr = await me.getAddress();
  const points = await ethers.getContractAt("ERC20Points", POINTS);
  const evaluator = await ethers.getContractAt("Evaluator", EVALUATOR);

  console.log(`Caller: ${addr}`);
  const before = await points.balanceOf(addr);
  console.log(`Points before: ${ethers.formatUnits(before, 18)}`);

  if (!(await evaluator.hasSubmitted(addr))) {
    console.log("Calling submitExercise()...");
    await (await evaluator.submitExercise()).wait();
  } else {
    console.log("Already submitted.");
  }

  console.log("Calling ex1_claimedFakeBAYC()...");
  await (await evaluator.ex1_claimedFakeBAYC()).wait();

  const after = await points.balanceOf(addr);
  console.log(`Points after:  ${ethers.formatUnits(after, 18)}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
