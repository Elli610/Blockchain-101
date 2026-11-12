// Part 2 grader. Checks the payment proofs submitted to EvaluatorOffchain
// against the instructor's Monero wallet and credits the valid ones.
//
// Usage:
//   monero-wallet-rpc --stagenet --wallet-file grading --password "" \
//     --rpc-bind-port 38088 --disable-rpc-login --daemon-address <node>
//   npx hardhat run --network sepolia scripts/grader-monero.ts
//
// Run it as often as needed: students already credited are skipped.
import { ethers } from "hardhat";
import { fromBlock, requireEnv } from "./lib/env";

const ATOMIC_UNITS_PER_XMR = 10n ** 12n;

interface TxProofCheck {
  good: boolean;
  received: number | string;
  confirmations: number;
  in_pool: boolean;
}

async function checkTxProof(txid: string, address: string, message: string, signature: string): Promise<TxProofCheck> {
  const response = await fetch(`${requireEnv("MONERO_WALLET_RPC_URL")}/json_rpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "0",
      method: "check_tx_proof",
      params: { txid, address, message, signature },
    }),
  });
  const body = (await response.json()) as { result?: TxProofCheck; error?: { message: string } };
  if (!body.result) throw new Error(body.error?.message ?? "empty response from monero-wallet-rpc");
  return body.result;
}

async function main() {
  const evaluator = await ethers.getContractAt("EvaluatorOffchain", requireEnv("EVALUATOR_OFFCHAIN_ADDRESS"));
  const gradingAddress = requireEnv("MONERO_GRADING_ADDRESS");
  const minimum = ethers.parseUnits(process.env.MONERO_MIN_AMOUNT || "0.01", 12);
  const exercise = await evaluator.EX_MONERO();

  const submissions = await evaluator.queryFilter(evaluator.filters.MoneroProofSubmitted(), fromBlock());
  const students = [...new Set(submissions.map((event) => event.args.student))];

  for (const student of students) {
    if (await evaluator.exerciseProgression(student, exercise)) continue;
    // Only the latest submission of a student counts.
    const { txid, proof } = await evaluator.moneroSubmissions(student);
    try {
      // The proof message must be the student's lowercase address.
      const check = await checkTxProof(txid, gradingAddress, student.toLowerCase(), proof);
      if (!check.good) {
        console.log(`${student}: invalid proof`);
      } else if (BigInt(check.received) < minimum) {
        console.log(`${student}: received ${BigInt(check.received)} / ${ATOMIC_UNITS_PER_XMR} XMR, below the minimum`);
      } else if (check.in_pool || check.confirmations < 1) {
        console.log(`${student}: transaction not confirmed yet`);
      } else {
        await (await evaluator.gradeMonero(student)).wait();
        console.log(`${student}: credited`);
      }
    } catch (error) {
      console.log(`${student}: ${(error as Error).message}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
