// Part 8 helper: builds a withdrawal proof for a note deposited in your pool.
//
// Usage:
//   POOL_ADDRESS=0x... NOTE_FILE=notes/0x....json \
//     npx hardhat run --network sepolia scripts/pool-prove.ts
//
// The recipient defaults to evaluator.recipientOf(you). Set RECIPIENT,
// RELAYER and FEE (in wei) to prove for other parameters.
import * as fs from "fs";
import { ethers } from "hardhat";
import { fromBlock, requireEnv } from "./lib/env";
import { compileCircuit, Prover } from "./lib/noir";
import { createNote, fetchCommitments, merklePath, toBytes32, withdrawalInputs } from "./lib/pool";

async function main() {
  const [student] = await ethers.getSigners();
  const pool = await ethers.getContractAt("IMiniPool", requireEnv("POOL_ADDRESS"));
  const saved = JSON.parse(fs.readFileSync(requireEnv("NOTE_FILE"), "utf8"));
  const note = createNote(BigInt(saved.nullifier), BigInt(saved.secret));

  let recipient = process.env.RECIPIENT;
  if (!recipient) {
    const evaluator = await ethers.getContractAt("EvaluatorPool", requireEnv("EVALUATOR_POOL_ADDRESS"));
    recipient = await evaluator.recipientOf(student.address);
  }
  const relayer = process.env.RELAYER || ethers.ZeroAddress;
  const fee = BigInt(process.env.FEE || 0);

  const leaves = await fetchCommitments(pool as any, fromBlock());
  const index = leaves.indexOf(note.commitment);
  if (index === -1) throw new Error("this note has not been deposited in the pool");
  const merkle = merklePath(leaves, index);
  if (!(await pool.isKnownRoot(toBytes32(merkle.root)))) {
    throw new Error("the root rebuilt from the Deposit events is not known to the pool");
  }

  const prover = await Prover.create(await compileCircuit(process.env.CIRCUIT || "circuits/minipool"));
  const { proof } = await prover.prove(withdrawalInputs(note, merkle, recipient, relayer, fee));
  await prover.destroy();

  console.log(`recipient:     ${recipient}`);
  console.log(`relayer:       ${relayer}`);
  console.log(`fee:           ${fee}`);
  console.log(`root:          ${toBytes32(merkle.root)}`);
  console.log(`nullifierHash: ${toBytes32(note.nullifierHash)}`);
  console.log(`proof:         ${proof}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
