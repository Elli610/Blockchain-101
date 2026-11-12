// Part 3 grader. Credits every student whose address appears in the memo of
// a shielded payment received by the instructor.
//
// Usage:
//   1. Sync the grading wallet and export its received transactions to
//      ZCASH_MEMOS_FILE, as a JSON array of { "txid": "...", "memo": "..." }
//      or as text with one "<txid> <memo>" per line.
//   2. npx hardhat run --network sepolia scripts/grader-zcash.ts
//
// Run it as often as needed: transactions already credited are skipped.
import * as fs from "fs";
import { ethers } from "hardhat";
import { requireEnv } from "./lib/env";
import { parseMemoExport, studentAddressIn } from "./lib/zcash-memos";

async function main() {
  const evaluator = await ethers.getContractAt("EvaluatorOffchain", requireEnv("EVALUATOR_OFFCHAIN_ADDRESS"));
  const exercise = await evaluator.EX_ZCASH();
  const memos = parseMemoExport(fs.readFileSync(requireEnv("ZCASH_MEMOS_FILE"), "utf8"));

  for (const { txid, memo } of memos) {
    const address = studentAddressIn(memo);
    if (address === null) {
      console.log(`${txid}: no address in memo`);
      continue;
    }
    const student = ethers.getAddress(address.toLowerCase());
    const key = ethers.keccak256(ethers.toUtf8Bytes(`zcash:${txid}`));
    if ((await evaluator.usedTransactions(key)) || (await evaluator.exerciseProgression(student, exercise))) continue;

    await (await evaluator.gradeZcash(student, txid)).wait();
    console.log(`${txid}: credited ${student}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
