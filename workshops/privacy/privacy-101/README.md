# Privacy 101

## Introduction
Welcome! This workshop is a tour of how privacy is obtained (and lost) on public blockchains. You will start by breaking the "privacy" of a transparent chain, then use the main families of privacy protocols on test networks, and finally build a small privacy pool of your own.

By the end of the workshop you will have:
* traced supposedly anonymous transactions on Sepolia using simple heuristics,
* used Monero on stagenet (stealth addresses, view keys, payment proofs) and mined on a private p2pool sidechain,
* sent a shielded Zcash testnet transaction with an encrypted memo and shared a viewing key,
* deposited into and withdrawn from Privacy Pools on Sepolia,
* sent and received a payment through ERC-5564 stealth addresses,
* built an anonymous voting contract with Semaphore,
* done a payjoin and a coinjoin on Bitcoin signet,
* written, deployed and attacked your own zero-knowledge privacy pool with Noir.

> **Test networks only.** Nothing in this workshop touches a mainnet. Every coin you handle here is worthless by design. Never reuse a workshop seed phrase or private key on a mainnet.

## Workshop Structure
Each part lives in its own file and can be done on its own. The numbering is the recommended order.

| # | File | Topic | Network | Graded by | Points |
|---|---|---|---|---|---|
| 1 | [`01-deanonymize.md`](./01-deanonymize.md) | Tracing transactions on a transparent chain | Sepolia | `EvaluatorTracing` | 8 |
| 2 | [`02-monero.md`](./02-monero.md) | Monero wallet, view keys, proofs, p2pool mining | Monero stagenet | Grader script (mining ungraded) | 5 |
| 3 | [`03-zcash.md`](./03-zcash.md) | Shielded transactions, memos, viewing keys | Zcash testnet | Grader script | 4 |
| 4 | [`04-privacy-pools.md`](./04-privacy-pools.md) | Privacy Pools: deposit, association set, withdraw, ragequit | Sepolia | Ungraded | 0 |
| 5 | [`05-stealth-addresses.md`](./05-stealth-addresses.md) | ERC-5564 / ERC-6538 stealth addresses | Sepolia | `EvaluatorStealth` and grader bot | 8 |
| 6 | [`06-private-voting.md`](./06-private-voting.md) | Anonymous voting with Semaphore | Sepolia | `EvaluatorVoting` | 6 |
| 7 | [`07-bitcoin-coinjoin.md`](./07-bitcoin-coinjoin.md) | Payjoin, coinjoin, silent payments | Bitcoin signet | Ungraded | 0 |
| 8 | [`08-minipool.md`](./08-minipool.md) | Build your own privacy pool with Noir | Sepolia | `EvaluatorPool` | 12 |

Total points available: **43**, plus a 3-point bonus in part 8.

### Suggested paths
* **Half day (using protocols):** parts 1, 2 (without mining), 3 and 4.
* **Full day:** parts 1 to 6.
* **Builder track:** parts 1, 5, 6 and 8.
* Parts 2 and 7 need a synced node. Start the sync before the session (see each file).

## Prerequisites
* Comfortable with a terminal, Git and Node.js (v20 or later).
* [ERC20 101](../../solidity/erc20-101/) and [Permit and Signatures 101](../../solidity/permit-signatures-101/) completed, or equivalent Solidity experience, for parts 5, 6 and 8.
* A Sepolia account with some test ETH, and a Sepolia RPC URL.
* Around 30 GB of free disk space if you run the Monero stagenet and Bitcoin signet nodes locally.
* Rust (`cargo`) for the Zcash and payjoin tooling.

## How Grading Works
The workshop uses a points token, ticker **TD-PRIVACY-101**, on Sepolia. Transfers are disabled: points cannot be moved between addresses. Your score is the balance of the Sepolia address you use throughout the workshop (your "student address").

Three grading modes are used:

1. **Evaluator (on-chain).** For the Sepolia parts, an evaluator contract checks your work and mints points, as in the other workshops of this repository. Each graded part has its own evaluator. For the exact requirements of an exercise, read its source in [`contracts/`](./contracts).
2. **Off-chain grader.** Monero and Zcash transactions cannot be read from an Ethereum contract. For those parts you embed your student address in the private transaction (a Zcash memo or the message of a Monero payment proof). A grader script run by the instructor verifies it with the instructor's keys and mints your points on Sepolia. Part 5 uses a similar bot, because deriving a stealth address on-chain is not practical. Graders are run periodically, not instantly.
3. **Ungraded.** Some parts are guided walkthroughs with questions to answer in your own repository.

The fact that the instructor needs *your cooperation* (a proof, a memo, a viewing key) to grade a private transaction is itself one of the lessons of this workshop.

## Getting to Work
1. Clone the repo and enter this workshop:
   ```bash
   git clone <repo url>
   cd workshops/privacy/privacy-101
   npm install
   ```
2. Create a `.env` file based on [`.env.example`](./.env.example). You need at minimum a `PRIVATE_KEY` and a `SEPOLIA_RPC_URL`, plus the deployed addresses listed [below](#deployed-addresses).
3. Test your connection:
   ```bash
   npx hardhat console --network sepolia
   ```
4. Create a Git repository of your own for your answers and code, and share it with the instructor.
5. Pick a path above and open the first file.

## Repository Layout
| Path | Content |
|---|---|
| `contracts/` | Points token, the five evaluators, the Part 1 mixers and the interfaces and building blocks you need. |
| `circuits/minipool/` | Starter circuit of Part 8. |
| `scripts/` | Helpers for students (`stealth-keys`, `voting-proof`, `pool-note`, `pool-verifier`, `pool-prove`) and tools for the instructor (`deploy`, `seed-tracing`, `grader-*`). |
| `reference/` | Material used by the test-suite: local stand-ins for third-party contracts, and **instructor reference solutions** for parts 6 and 8. Looking at them before trying defeats the purpose. |
| `test/` | Test-suite of the evaluators, graders and reference solutions. |

## Instructor Guide

### Check
```bash
npm install
npm test
```
The suite deploys everything on a local network and replays every graded part as a student would, including Part 1 scenario seeding, real Semaphore proofs and real Noir proofs. It needs network access the first time (Semaphore circuit artifacts and the Noir Poseidon library are downloaded).

### Deploy
```bash
npx hardhat run --network sepolia scripts/deploy.ts
```
Copy the printed addresses to `.env` and to the [Deployed Addresses](#deployed-addresses) table, and note the block number printed as "First block to scan" in `FROM_BLOCK`.

### Seed Part 1
```bash
npx hardhat run --network sepolia scripts/seed-tracing.ts
```
Creates `TRACING_SETS` scenario sets (default 4). Each set sends about 45 transactions from throwaway wallets and costs roughly 25 gas stipends (`TRACING_GAS_STIPEND`, default 0.0005 ETH) plus a few thousandths of an ETH that are not recovered. The script prints the answers of each set: keep them, they cannot be read back from the contract. Raise the stipend if gas prices are high: a throwaway wallet that runs out of gas aborts the script.

### Run the graders
All graders are idempotent: run them as often as needed during the session.

| Part | Command | Needs |
|---|---|---|
| 2 | `npx hardhat run --network sepolia scripts/grader-monero.ts` | `monero-wallet-rpc` serving the grading wallet on stagenet (`MONERO_WALLET_RPC_URL`), and its address in `MONERO_GRADING_ADDRESS`. |
| 3 | `npx hardhat run --network sepolia scripts/grader-zcash.ts` | An export of the memos received by the grading wallet (`ZCASH_MEMOS_FILE`): a JSON array of `{ "txid", "memo" }`, or text with one `<txid> <memo>` per line. |
| 5 | `npx hardhat run --network sepolia scripts/grader-stealth.ts` | The instructor's stealth keys (`INSTRUCTOR_SPENDING_KEY`, `INSTRUCTOR_VIEWING_KEY`, created with `scripts/stealth-keys.ts`) and some Sepolia ETH: each student receives `STEALTH_PAYMENT`. |

The grader account must be a teacher of the evaluators. The deployer is one by default; add others with `setTeacher`.

The Zcash grader is deliberately wallet-agnostic, because Zcash wallet tooling is changing quickly: produce the export with whatever wallet holds the grading account.

### Before the session
Each part file has a "Verify before the session" note. The parts that depend on third-party testnets and tools (2, 3, 4 and 7) have not been run end to end by the authors of this workshop: do a dry run.

## Status of External Dependencies
This workshop relies on public test networks, faucets and third-party tools. Their state was last checked in **November 2026**:

| Dependency | Status at last check |
|---|---|
| Monero stagenet | Live. Recommended network for learners according to the Monero docs. |
| p2pool on stagenet | Supported in the source code (network type is read from `monerod`), but not documented. Test the class sidechain before the session. |
| Zcash testnet | Live. `zcashd` reached end of support in July 2026; use Zebra and light clients. Faucets are community-run. |
| Privacy Pools on Sepolia | A v2 public testnet exists. The official docs only list mainnet addresses; see part 4. |
| ERC-5564 / ERC-6538 on Sepolia | Deployed at the canonical addresses. |
| Semaphore V4 on Sepolia | Deployed. |
| JoinMarket | The classic client was archived in April 2026; `joinmarket-ng` is used instead. |
| Payjoin | `payjoin-cli` supports BIP 77 (v2) and requires Bitcoin Core 29.0 or later. |
| Noir | Compiler 1.0.0 and Barretenberg (`@aztec/bb.js` 5.3.0), pinned in `package.json`. |

## Deployed Addresses
> The contracts of this workshop are not deployed yet. This section will be filled in once they are.

| Contract | Address |
|---|---|
| `TDERC20_PRIVACY` (points token) | _to be deployed_ |
| `EvaluatorTracing` (part 1) | _to be deployed_ |
| `NaiveMixer` (part 1) | _to be deployed_ |
| `FixedMixer` "timing" (part 1) | _to be deployed_ |
| `FixedMixer` "crowd" (part 1) | _to be deployed_ |
| `EvaluatorOffchain` (parts 2 and 3) | _to be deployed_ |
| `EvaluatorStealth` (part 5) | _to be deployed_ |
| `EvaluatorVoting` (part 6) | _to be deployed_ |
| `EvaluatorPool` (part 8) | _to be deployed_ |
| `PoseidonT3` library (part 8) | _to be deployed_ |
| `ERC6538Registry` (canonical) | [`0x6538E6bf4B0eBd30A8Ea093027Ac2422ce5d6538`](https://sepolia.etherscan.io/address/0x6538E6bf4B0eBd30A8Ea093027Ac2422ce5d6538#code) |
| `ERC5564Announcer` (canonical) | [`0x55649E01B5Df198D18D95b5cc5051630cfD45564`](https://sepolia.etherscan.io/address/0x55649E01B5Df198D18D95b5cc5051630cfD45564#code) |
| `Semaphore` V4 | [`0x697c80d1F2654e88d52B16154929EB976568DB04`](https://sepolia.etherscan.io/address/0x697c80d1F2654e88d52B16154929EB976568DB04) |
