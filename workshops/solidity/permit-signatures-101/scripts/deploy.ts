// Deploys the Permit and Signatures 101 workshop contracts to Sepolia.
//
// Usage:
//   npx hardhat run --network sepolia scripts/deploy.ts
//
// Prerequisites (see .env.example):
//   PRIVATE_KEY, SEPOLIA_RPC_URL
//
// The canonical Permit2 address is the same on every EVM chain:
//   0x000000000022D473030F116dDEE9F6B43aC78BA3
import { ethers } from "hardhat";

const CANONICAL_PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Chain id: ${(await ethers.provider.getNetwork()).chainId}`);

  const TD = await ethers.getContractFactory("TDERC20_PERMIT");
  const td = await TD.deploy("TD-Permit-101", "TD-PERMIT-101", 0);
  await td.waitForDeployment();
  console.log(`TDERC20_PERMIT deployed at ${td.target}`);

  const Mock = await ethers.getContractFactory("MockUnderlying");
  const mock = await Mock.deploy();
  await mock.waitForDeployment();
  console.log(`MockUnderlying deployed at ${mock.target}`);

  const permit2Address = process.env.PERMIT2_ADDRESS || CANONICAL_PERMIT2;
  console.log(`Using Permit2 at ${permit2Address}`);

  const Evaluator = await ethers.getContractFactory("Evaluator");
  const evaluator = await Evaluator.deploy(td.target, mock.target, permit2Address);
  await evaluator.waitForDeployment();
  console.log(`Evaluator deployed at ${evaluator.target}`);

  const tx = await td.setTeacher(evaluator.target, true);
  await tx.wait();
  console.log(`Granted teacher role to Evaluator`);

  const domainSeparator = await evaluator.DOMAIN_SEPARATOR();
  console.log(`\nEvaluator DOMAIN_SEPARATOR: ${domainSeparator}`);

  console.log(`\nAdd these to your .env:`);
  console.log(`TDERC20_ADDRESS=${td.target}`);
  console.log(`MOCK_UNDERLYING_ADDRESS=${mock.target}`);
  console.log(`EVALUATOR_ADDRESS=${evaluator.target}`);
  console.log(`PERMIT2_ADDRESS=${permit2Address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
