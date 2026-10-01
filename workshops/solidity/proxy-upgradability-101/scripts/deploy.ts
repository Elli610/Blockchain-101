// Deploys the Proxy and Upgradability 101 workshop contracts to Sepolia.
//
// Usage:
//   npx hardhat run --network sepolia scripts/deploy.ts
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Chain id: ${(await ethers.provider.getNetwork()).chainId}`);

  const TD = await ethers.getContractFactory("TDERC20_PROXY");
  const td = await TD.deploy("TD-Proxy-101", "TD-PROXY-101", 0);
  await td.waitForDeployment();
  console.log(`TDERC20_PROXY deployed at ${td.target}`);

  const Evaluator = await ethers.getContractFactory("Evaluator");
  const evaluator = await Evaluator.deploy(td.target);
  await evaluator.waitForDeployment();
  console.log(`Evaluator deployed at ${evaluator.target}`);

  const tx = await td.setTeacher(evaluator.target, true);
  await tx.wait();
  console.log(`Granted teacher role to Evaluator`);

  console.log(`\nAdd these to your .env:`);
  console.log(`TDERC20_ADDRESS=${td.target}`);
  console.log(`EVALUATOR_ADDRESS=${evaluator.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
