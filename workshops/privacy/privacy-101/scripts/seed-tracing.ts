// Creates the Part 1 scenarios on-chain and registers them in EvaluatorTracing.
//
// Usage:
//   npx hardhat run --network sepolia scripts/seed-tracing.ts
//
// The signer must be the deployer: it operates the mixers and is a teacher
// of the Evaluator. Each set sends about 45 transactions and spends roughly
// 25 gas stipends plus a few denominations that are not recovered.
// Running the script again adds more sets.
import { ethers } from "hardhat";
import { requireEnv } from "./lib/env";
import { seedScenarioSet } from "./lib/tracing";

async function main() {
  const [operator] = await ethers.getSigners();
  const contracts = {
    evaluator: (await ethers.getContractAt("EvaluatorTracing", requireEnv("EVALUATOR_TRACING_ADDRESS"))) as any,
    naiveMixer: (await ethers.getContractAt("NaiveMixer", requireEnv("NAIVE_MIXER_ADDRESS"))) as any,
    timingMixer: (await ethers.getContractAt("FixedMixer", requireEnv("TIMING_MIXER_ADDRESS"))) as any,
    crowdMixer: (await ethers.getContractAt("FixedMixer", requireEnv("CROWD_MIXER_ADDRESS"))) as any,
  };
  const sets = Number(process.env.TRACING_SETS || 4);
  const gasStipend = ethers.parseEther(process.env.TRACING_GAS_STIPEND || "0.0005");

  const first = Number(await contracts.evaluator.numSets());
  for (let setId = first; setId < first + sets; setId++) {
    const seeded = await seedScenarioSet(operator, contracts, setId, gasStipend, console.log);
    // Keep the answers: they are not recoverable from the Evaluator.
    console.log(JSON.stringify(seeded));
  }
  console.log(`EvaluatorTracing now holds ${await contracts.evaluator.numSets()} scenario sets`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
