// Deploys the Privacy 101 workshop contracts to Sepolia.
//
// Usage:
//   npx hardhat run --network sepolia scripts/deploy.ts
//
// Prerequisites (see .env.example):
//   PRIVATE_KEY, SEPOLIA_RPC_URL
//
// After deploying, run scripts/seed-tracing.ts to create the Part 1 scenarios.
import { ethers } from "hardhat";
import { CANONICAL_ERC6538_REGISTRY, SEMAPHORE_SEPOLIA, deployWorkshop } from "./lib/deploy";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Chain id: ${(await ethers.provider.getNetwork()).chainId}`);

  const registry = process.env.ERC6538_REGISTRY_ADDRESS || CANONICAL_ERC6538_REGISTRY;
  const semaphore = process.env.SEMAPHORE_ADDRESS || SEMAPHORE_SEPOLIA;
  console.log(`Using ERC-6538 registry at ${registry}`);
  console.log(`Using Semaphore at ${semaphore}`);

  const workshop = await deployWorkshop({ registry, semaphore }, process.env.POSEIDON_T3_ADDRESS || undefined);

  console.log(`\nFirst block to scan: ${await ethers.provider.getBlockNumber()}`);
  console.log(`\nAdd these to your .env:`);
  console.log(`TDERC20_ADDRESS=${workshop.td.target}`);
  console.log(`EVALUATOR_TRACING_ADDRESS=${workshop.tracing.target}`);
  console.log(`EVALUATOR_OFFCHAIN_ADDRESS=${workshop.offchain.target}`);
  console.log(`EVALUATOR_STEALTH_ADDRESS=${workshop.stealth.target}`);
  console.log(`EVALUATOR_VOTING_ADDRESS=${workshop.voting.target}`);
  console.log(`EVALUATOR_POOL_ADDRESS=${workshop.pool.target}`);
  console.log(`NAIVE_MIXER_ADDRESS=${workshop.naiveMixer.target}`);
  console.log(`TIMING_MIXER_ADDRESS=${workshop.timingMixer.target}`);
  console.log(`CROWD_MIXER_ADDRESS=${workshop.crowdMixer.target}`);
  console.log(`POSEIDON_T3_ADDRESS=${workshop.poseidonT3}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
