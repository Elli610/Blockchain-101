// Deploys the ERC4626-101 workshop contracts.
// To verify on Etherscan (example):
//   npx hardhat verify --network sepolia <address> <constructor arg 1> ...
import { ethers } from "hardhat";

async function main() {
  const ERC4626_101 = await ethers.getContractFactory("ERC4626_101");
  const MockUnderlying = await ethers.getContractFactory("MockUnderlying");
  const Evaluator = await ethers.getContractFactory("Evaluator");

  const erc4626Points = await ERC4626_101.deploy(
    "ERC4626-101",
    "ERC4626-101",
    0
  );
  await erc4626Points.waitForDeployment();
  console.log(`ERC4626_101 (points) deployed at ${erc4626Points.target}`);

  const underlying = await MockUnderlying.deploy();
  await underlying.waitForDeployment();
  console.log(`MockUnderlying deployed at ${underlying.target}`);

  const evaluator = await Evaluator.deploy(
    erc4626Points.target,
    underlying.target
  );
  await evaluator.waitForDeployment();
  console.log(`Evaluator deployed at ${evaluator.target}`);

  // Grant the Evaluator the teacher role so it can distribute points
  await erc4626Points.setTeacher(evaluator.target, true);

  // Populate the random vault names/symbols the students will be assigned
  const randomNames: string[] = [];
  const randomSymbols: string[] = [];
  for (let i = 0; i < 20; i++) {
    const seed = Math.random().toString(36).substring(2, 6).toUpperCase();
    randomNames.push(`Yield Vault ${seed}`);
    randomSymbols.push(`yv${seed}`);
  }

  console.log("Random names:", randomNames);
  console.log("Random symbols:", randomSymbols);
  await evaluator.setRandomNamesAndSymbols(randomNames, randomSymbols);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
