// Part 8 helper: compiles circuits/minipool and writes its Solidity verifier
// to contracts/Verifier.sol. Equivalent to nargo compile + bb write_vk +
// bb write_solidity_verifier.
//
// Usage:
//   npx hardhat run scripts/pool-verifier.ts
//   CIRCUIT=circuits/my_other_circuit VERIFIER=contracts/Other.sol npx hardhat run scripts/pool-verifier.ts
import * as fs from "fs";
import { compileCircuit, Prover } from "./lib/noir";

async function main() {
  const circuitDir = process.env.CIRCUIT || "circuits/minipool";
  const output = process.env.VERIFIER || "contracts/Verifier.sol";

  const prover = await Prover.create(await compileCircuit(circuitDir));
  fs.writeFileSync(output, await prover.solidityVerifier());
  await prover.destroy();
  console.log(`Verifier of ${circuitDir} written to ${output}`);
  console.log(`Deploy it with deployHonkVerifier("${output}") from scripts/lib/deploy.ts`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
