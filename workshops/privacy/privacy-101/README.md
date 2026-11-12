# Privacy 101

## Introduction
Welcome! This workshop is a tour of how privacy is obtained (and lost) on public blockchains. You will start by breaking the "privacy" of a transparent chain, then use the main families of privacy protocols on test networks, and finally build a small privacy pool of your own.

By the end of the workshop you will have:
* traced supposedly anonymous transactions on Sepolia using simple heuristics,
* used Monero on stagenet (stealth addresses, view keys, payment proofs) and mined on your own node,
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
| 2 | [`02-monero.md`](./02-monero.md) | Monero wallet, view keys, proofs, solo mining | Monero stagenet | Grader script | 5 |
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
* Parts 2 and 7 need a synced node. Start the Monero stagenet sync before part 1, ideally the day before (see [Getting to Work](#getting-to-work)), and the Bitcoin signet sync before the session (see [part 7](./07-bitcoin-coinjoin.md#setting-up)).

## Prerequisites
* Comfortable with a terminal, Git and Node.js (v20 or later).
* [ERC20 101](../../solidity/erc20-101/) and [Permit and Signatures 101](../../solidity/permit-signatures-101/) completed, or equivalent Solidity experience, for parts 5, 6 and 8.
* A Sepolia account with about 0.05 test ETH, and a Sepolia RPC URL. In our dry run, a student doing every Sepolia part spent 0.03 ETH, most of it on deploying the part 8 verifier.
* Free disk space for a Monero stagenet node (part 2) and a Bitcoin signet node (part 7). The provided [`monerod-stagenet.conf`](./monerod-stagenet.conf) and [`bitcoin-signet.conf`](./bitcoin-signet.conf) run both pruned, to keep them as small as possible.
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
5. **Start syncing your Monero stagenet node before you begin part 1**, and ideally the day before the session. Download the Monero CLI as described in [part 2](./02-monero.md#setting-up), then run:
   ```bash
   ./monerod --config-file /path/to/privacy-101/monerod-stagenet.conf
   ```
   [`monerod-stagenet.conf`](./monerod-stagenet.conf) configures a pruned stagenet node that uses as little disk space as possible. Leave it running in its own terminal while you work on the deanonymization exercises.

   The initial sync takes **many hours** (in our dry run, 11% of the chain after the first hour). Your own node is only required for the mining section of part 2: if it is not synced when you get there, do the other Monero exercises with a remote node, as explained in part 2.
6. **Request your stagenet coins now as well.** Create your Monero wallet and ask the faucet for coins ([part 2, steps 3 and 4](./02-monero.md#3-create-a-wallet)). They can take more than an hour to become spendable.
7. Pick a path above and open the first file.

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
Copy the printed lines to `.env` and to the [Deployed Addresses](#deployed-addresses) section, `FROM_BLOCK` included: students need it too.

### Seed Part 1
```bash
npx hardhat run --network sepolia scripts/seed-tracing.ts
```
Creates `TRACING_SETS` scenario sets (default 4). Each set sends about 45 transactions from throwaway wallets, one after the other: on Sepolia a set took about 12 minutes and cost about 0.028 ETH with a gas stipend of 0.0003 ETH (`TRACING_GAS_STIPEND`, default 0.0005 ETH). Deploying the workshop cost about 0.022 ETH. The script prints the answers of each set: keep them, they cannot be read back from the contract. Raise the stipend if gas prices are high: a throwaway wallet that runs out of gas aborts the script, and an aborted set can leave deposits in the "timing" mixer that make exercise 3 ambiguous for later sets (redeploy the mixers and the Evaluator in that case).

### Run the graders
All graders are idempotent: run them as often as needed during the session.

| Part | Command | Needs |
|---|---|---|
| 2 | `npx hardhat run --network sepolia scripts/grader-monero.ts` | `monero-wallet-rpc` serving the grading wallet on stagenet (`MONERO_WALLET_RPC_URL`), and its address in `MONERO_GRADING_ADDRESS`. The wallet server can take a few minutes to start answering; if it fails to bind its port, pick another one. |
| 3 | `npx hardhat run --network sepolia scripts/grader-zcash.ts` | An export of the memos received by the grading wallet (`ZCASH_MEMOS_FILE`): a JSON array of `{ "txid", "memo" }`, or text with one `<txid> <memo>` per line. |
| 5 | `npx hardhat run --network sepolia scripts/grader-stealth.ts` | The instructor's stealth keys (`INSTRUCTOR_SPENDING_KEY`, `INSTRUCTOR_VIEWING_KEY`, created with `scripts/stealth-keys.ts`) and some Sepolia ETH: each student receives `STEALTH_PAYMENT`. |

The grader account must be a teacher of the evaluators. The deployer is one by default; add others with `setTeacher`.

The Zcash grader is deliberately wallet-agnostic, because Zcash wallet tooling is changing quickly: produce the export with whatever wallet holds the grading account.

### Before the session
Each part file has a "Verify before the session" note.

What a dry run on 12 November 2026 covered:

| Part | Run for real | Not run |
|---|---|---|
| 1 | Deployment, seeding of two sets and both sets solved from public chain data on Sepolia. | |
| 2 | Node start with the provided configuration, wallets on a remote node, faucet, subaddress, view-only wallet, explorer, payment proof and the grader. | Full node sync, mining. |
| 3 | The grader script, with a placeholder memo export. | Everything on the Zcash side. |
| 4 | The testnet app URL answers. | Every step in the app. |
| 5 | All three exercises and the grader bot, against the canonical contracts on Sepolia. | |
| 6 | All five exercises on Sepolia with the helper script. | The class vote. |
| 7 | Pruned signet sync with the provided configuration, wallets, funding, `payjoin-cli` installation, and a complete payjoin with Bitcoin Core 31.2 on a local regtest network. | The payjoin on signet (coins too small), the coinjoin. |
| 8 | Steps 2 to 7 on Sepolia with the helper scripts and real proofs. | The bonus on Sepolia (covered by the local test-suite). |

## Status of External Dependencies
This workshop relies on public test networks, faucets and third-party tools. Their state was last checked in **November 2026**:

| Dependency | Status at last check |
|---|---|
| Monero stagenet | Live. Recommended network for learners according to the Monero docs. |
| xmrig | Solo mining against a stagenet `monerod` (`--daemon` mode) has not been run by the authors. Test it before the session. |
| Zcash testnet | Live. `zcashd` reached end of support in July 2026; use Zebra and light clients. Faucets are community-run. |
| Privacy Pools on Sepolia | A v2 public testnet exists. The official docs only list mainnet addresses; see part 4. |
| ERC-5564 / ERC-6538 on Sepolia | Deployed at the canonical addresses. |
| Semaphore V4 on Sepolia | Deployed. Use the address listed in the installed `@semaphore-protocol/utils` package; the documentation website listed an outdated one. |
| JoinMarket | The classic client was archived in April 2026; `joinmarket-ng` is used instead. |
| Payjoin | `payjoin-cli` 1.0.0 supports BIP 77 (v2). It works with Bitcoin Core 31.2 and fails with 32.x. |
| Noir | Compiler 1.0.0 and Barretenberg (`@aztec/bb.js` 5.3.0), pinned in `package.json`. |

## Deployed Addresses
> Sepolia (chainId 11155111). This is the deployment used for the dry run of November 2026: two scenario sets are seeded for part 1, and the contracts are not verified on Etherscan or Sourcify yet. The deployer `0x88B3a71021EC789A6CAEBc95be0A277F2462fFC0` is the only teacher and the registrant of the instructor stealth meta-address (part 5). Redeploy for a real session.
>
> `FROM_BLOCK=12118424`

| Contract | Address |
|---|---|
| `TDERC20_PRIVACY` (points token) | [`0x72f1d5fF02ff9445c0e32D5B7901631941a9C6F7`](https://sepolia.etherscan.io/address/0x72f1d5fF02ff9445c0e32D5B7901631941a9C6F7) |
| `EvaluatorTracing` (part 1) | [`0xf1CDF48089003214a4b90594d53E4D1dCC5f8D67`](https://sepolia.etherscan.io/address/0xf1CDF48089003214a4b90594d53E4D1dCC5f8D67) |
| `NaiveMixer` (part 1) | [`0x7b8023629Fb9b737C0831d18632D01173d7b907f`](https://sepolia.etherscan.io/address/0x7b8023629Fb9b737C0831d18632D01173d7b907f) |
| `FixedMixer` "timing" (part 1) | [`0x9005A1E9049Cc6eeed1cCd967092A123D1B00421`](https://sepolia.etherscan.io/address/0x9005A1E9049Cc6eeed1cCd967092A123D1B00421) |
| `FixedMixer` "crowd" (part 1) | [`0x933035b8305b2821b696BA6ACF96d6aF0A556917`](https://sepolia.etherscan.io/address/0x933035b8305b2821b696BA6ACF96d6aF0A556917) |
| `EvaluatorOffchain` (parts 2 and 3) | [`0x3e2cfD7384BBe7E876B06Ffb230CaaD05aF8dC75`](https://sepolia.etherscan.io/address/0x3e2cfD7384BBe7E876B06Ffb230CaaD05aF8dC75) |
| `EvaluatorStealth` (part 5) | [`0xb89e758962D2d2847bA4Bf5ACF1538204b284e54`](https://sepolia.etherscan.io/address/0xb89e758962D2d2847bA4Bf5ACF1538204b284e54) |
| `EvaluatorVoting` (part 6) | [`0xD099C23fbDCb8AA655dD03bC97B103Ea2A1dF96e`](https://sepolia.etherscan.io/address/0xD099C23fbDCb8AA655dD03bC97B103Ea2A1dF96e) |
| `EvaluatorPool` (part 8) | [`0x24fe33097987977F5bDcD68C9643e1C4F3976563`](https://sepolia.etherscan.io/address/0x24fe33097987977F5bDcD68C9643e1C4F3976563) |
| `PoseidonT3` library (part 8) | [`0xBEc715A40Edbc6E701D77790dC1a11d6E4Ac01Bd`](https://sepolia.etherscan.io/address/0xBEc715A40Edbc6E701D77790dC1a11d6E4Ac01Bd) |
| `ERC6538Registry` (canonical) | [`0x6538E6bf4B0eBd30A8Ea093027Ac2422ce5d6538`](https://sepolia.etherscan.io/address/0x6538E6bf4B0eBd30A8Ea093027Ac2422ce5d6538#code) |
| `ERC5564Announcer` (canonical) | [`0x55649E01B5Df198D18D95b5cc5051630cfD45564`](https://sepolia.etherscan.io/address/0x55649E01B5Df198D18D95b5cc5051630cfD45564#code) |
| `Semaphore` V4 | [`0xC10E5102A2Cc077BE3B9740Fc0Ad7e27Ff8E0245`](https://sepolia.etherscan.io/address/0xC10E5102A2Cc077BE3B9740Fc0Ad7e27Ff8E0245) |
