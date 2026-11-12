# Part 1: Deanonymize Me

## Introduction
An Ethereum address is a pseudonym, not an identity. Many people conclude that a fresh address is therefore private. In this part you play the analyst: the instructor has seeded Sepolia with transactions made by "users" trying to hide, and you must link them back together.

Everything you break here is something a later part of the workshop fixes. Keep notes on *why* each trick worked.

* **Network:** Sepolia
* **Grading:** Evaluator, **8 points**
* **Tools:** a block explorer, `cast` (Foundry) or a short ethers.js script

## What Leaks on a Transparent Chain
For every transaction, anyone can read the sender, the recipient, the amount, the calldata, the gas price and the block timestamp, forever. Analysts combine these with a few heuristics:

* **Funding link.** A new address needs ETH for gas. Whoever sent it that first ETH is usually its owner, or knows them.
* **Amount fingerprint.** An unusual amount (`0.001337 ETH`) going into a contract and the same amount coming out identifies the pair.
* **Timing correlation.** A withdrawal that follows a deposit, when nobody else deposited in between, is probably the same user.
* **Common ownership.** Addresses that later send their funds to the same destination, or that are spent together, are probably controlled by the same person.
* **Behavioural fingerprint.** Gas price settings, wallet-specific calldata, activity hours.

## How to Work on This Part
The workshop ships with these contracts (addresses in the [README](./README.md#deployed-addresses)):

| Contract | Role |
|---|---|
| [`NaiveMixer`](./contracts/tracing/NaiveMixer.sol) | Custodial mixer accepting deposits of **any** amount. |
| [`FixedMixer`](./contracts/tracing/FixedMixer.sol) "timing" | Custodial mixer where every deposit and payout is exactly `denomination()`. Used by exercise 3. |
| [`FixedMixer`](./contracts/tracing/FixedMixer.sol) "crowd" | A second instance of the same contract. Used by exercises 4 and 5. |
| [`EvaluatorTracing`](./contracts/tracing/EvaluatorTracing.sol) | Holds one challenge per exercise and checks your answer. Called "the Evaluator" below. |

These mixers are **custodial**: a user deposits, then asks the operator off-chain to pay the same amount out to another address. Nothing on-chain says which deposit a payout corresponds to. The users of these mixers believe that this is enough.

For each exercise, read your challenge with `evaluator.getChallenge(exerciseId, yourAddress)`. It returns a `bytes32`: an address (left-padded with zeros) for exercise 1, a transaction hash for the others. Submit the address you found with the matching `exN_...` function.

Rules:
- You have **3 attempts** per exercise. A wrong answer does not revert: the transaction succeeds, emits `WrongAnswer` and consumes an attempt. Investigate first, submit second.
- Several scenario sets exist and yours is derived from your address (`evaluator.setOf(yourAddress)`). Your neighbour's answer is probably not yours.
- No special tooling is required. Every answer can be found with a block explorer.

## Points List

### Exercise 1: follow the gas (1 point)
Your challenge is a "burner" address that made a single anonymous donation. Find the address that owns it.

1. Look at the first incoming transaction of the burner.
2. Call `ex1_fundingLink(owner)`.

### Exercise 2: amount fingerprint (2 points)
Your challenge is a payout transaction of `NaiveMixer`. Find the address that made the matching deposit.

1. Read the amount of your payout from its `Withdrawal` event.
2. List the `Deposit` events of `NaiveMixer` and compare amounts.
3. Call `ex2_amountFingerprint(depositor)`.

### Exercise 3: timing correlation (2 points)
Your challenge is a payout transaction of the "timing" `FixedMixer`. All amounts are identical now, so amounts no longer help. Find the depositor.

1. List deposits and payouts in block order.
2. Work out which deposits had not been paid out yet just before your payout.
3. Call `ex3_timing(depositor)`.

### Exercise 4: gas money (1 point)
Your challenge is a payout transaction of the "crowd" `FixedMixer`, sent to a brand new address at a time when several deposits were pending. Timing does not help. Find the depositor anyway.

1. A fresh address cannot do anything with its funds without gas. Look at everything the recipient ever received.
2. Call `ex4_gasFunder(depositor)`.

### Exercise 5: clustering (2 points)
Your challenge is a single transaction in which the "crowd" `FixedMixer` paid five recipients. Some of those recipients belong to the same person. Find the address where that person gathers their funds.

1. Follow what each recipient does with its funds afterwards.
2. Call `ex5_cluster(consolidationAddress)`.

## Questions
Answer these in your repository. They are not graded on-chain, but each one is the motivation for a later part.

1. In exercise 2, what single change to the mixer would have defeated you? (See part 8.)
2. In exercise 3, how many other pending deposits would the user have needed to wait for to be one-in-ten? What is this number called?
3. In exercise 4, how could the recipient have obtained gas without being linked to anyone? (See the relayer in parts 4 and 8.)
4. The operator of these mixers knows every link between a deposit and a payout, and could simply keep the funds. Which properties would a mixer need for its users to trust neither its operator's honesty nor its discretion? (See parts 6 and 8.)
5. Which of the heuristics above still apply to Bitcoin? (See part 7.)

## Notes and Hints
- Listing events with Foundry:
  ```bash
  cast logs --rpc-url $SEPOLIA_RPC_URL --address <NaiveMixer> --from-block <deployBlock> "Deposit(address indexed,uint256)"
  cast logs --rpc-url $SEPOLIA_RPC_URL --address <FixedMixer> --from-block <deployBlock> "Withdrawal(address indexed)"
  ```
- ETH sent by a contract (such as a mixer payout) does not appear in the normal transaction list of the receiving address. Use the "Internal Transactions" tab of the explorer.
- On Sepolia, every ETH transfer also emits a `Transfer` log from the system address `0xfffffffffffffffffffffffffffffffffffffffe`. A payout transaction therefore carries two logs per recipient: the mixer's `Withdrawal` and that `Transfer`. If you parse receipts in a script, filter the logs by contract address.
- Converting a challenge to an address: keep the last 20 bytes.
- The scenarios were generated by [a script](./scripts/lib/tracing.ts). Real users are messier, and real analysts combine several heuristics at once.
