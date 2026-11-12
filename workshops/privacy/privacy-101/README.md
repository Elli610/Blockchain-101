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

| # | File | Topic | Network | Graded | Points |
|---|---|---|---|---|---|
| 1 | [`01-deanonymize.md`](./01-deanonymize.md) | Tracing transactions on a transparent chain | Sepolia | Evaluator | 8 |
| 2 | [`02-monero.md`](./02-monero.md) | Monero wallet, view keys, proofs, p2pool mining | Monero stagenet | Off-chain grader (mining ungraded) | 5 |
| 3 | [`03-zcash.md`](./03-zcash.md) | Shielded transactions, memos, viewing keys | Zcash testnet | Off-chain grader | 4 |
| 4 | [`04-privacy-pools.md`](./04-privacy-pools.md) | Privacy Pools: deposit, association set, withdraw, ragequit | Sepolia | Ungraded | 0 |
| 5 | [`05-stealth-addresses.md`](./05-stealth-addresses.md) | ERC-5564 / ERC-6538 stealth addresses | Sepolia | Evaluator + off-chain grader | 8 |
| 6 | [`06-private-voting.md`](./06-private-voting.md) | Anonymous voting with Semaphore | Sepolia | Evaluator | 6 |
| 7 | [`07-bitcoin-coinjoin.md`](./07-bitcoin-coinjoin.md) | Payjoin, coinjoin, silent payments | Bitcoin signet | Ungraded | 0 |
| 8 | [`08-minipool.md`](./08-minipool.md) | Build your own privacy pool with Noir | Sepolia | Evaluator | 12 |

Total points available: **43**.

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

1. **Evaluator (on-chain).** For the Sepolia parts, an `Evaluator` contract checks your work and mints points, as in the other workshops of this repository.
2. **Off-chain grader.** Monero and Zcash transactions cannot be read from an Ethereum contract. For those parts you embed your student address in the private transaction (a Zcash memo or the message of a Monero payment proof). A grader script run by the instructor verifies it with the instructor's keys and mints your points on Sepolia.
3. **Ungraded.** Some parts are guided walkthroughs with questions to answer in your own repository.

The fact that the instructor needs *your cooperation* (a proof, a memo, a viewing key) to grade a private transaction is itself one of the lessons of this workshop.

## Getting to Work
1. Clone the repo and enter this workshop:
   ```bash
   git clone <repo url>
   cd workshops/privacy/privacy-101
   ```
2. Create a Git repository of your own for your answers and code, and share it with the instructor.
3. Pick a path above and open the first file.

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

Each file has a "Verify before the session" note listing what the instructor should re-check.

## Deployed Addresses
> The Evaluator, points token and challenge contracts for this workshop are not deployed yet. This section will be filled in once they are.

| Contract | Address |
|---|---|
| `TDERC20_PRIVACY` (points token) | _to be deployed_ |
| `Evaluator` | _to be deployed_ |
