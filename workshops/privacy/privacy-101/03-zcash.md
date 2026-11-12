# Part 3: Zcash on Testnet

## Introduction
Zcash takes the opposite approach to Monero. Instead of hiding a transaction among decoys, a shielded Zcash transaction carries a zero-knowledge proof that it is valid, and reveals nothing else. Zcash also keeps a transparent, Bitcoin-like side, so the same chain lets you compare both worlds.

In this part you will create a testnet wallet, receive testnet coins (TAZ), send a fully shielded transaction with an encrypted memo, and share a viewing key.

* **Network:** Zcash testnet (TAZ has no value)
* **Grading:** off-chain grader, **4 points**
* **Tools:** [`zcash-devtool`](https://github.com/zcash/zcash-devtool) (a command-line light wallet), Rust toolchain

> **Verify before the session**
> - That at least one testnet faucet is online and how much it pays per request. Faucets are community-run and rate-limited; for a full class, the instructor should hold a reserve of TAZ to distribute.
> - That the `zcash-devtool` commands below match the current version (`--help` on each subcommand). The tool is under active development.
> - Which shielded pool current wallets use by default. A network upgrade introducing a new pool was being rolled out in 2026; wallets must be up to date.
> - `zcashd` reached end of support in July 2026. Do not use guides based on `zcash-cli`.

## The Building Blocks

### Pools
| Pool | Addresses | Visible on-chain |
|---|---|---|
| Transparent | `t...` (`tm...` on testnet) | Everything, as in Bitcoin |
| Sapling (shielded) | `z...` (`ztestsapling...` on testnet) | Nothing except that a shielded transaction happened, and the fee |
| Orchard (shielded) | inside unified addresses | Same as Sapling, newer proof system without trusted setup |

A **unified address** (`u1...`, `utest1...` on testnet) bundles receivers for several pools in one string; the sender's wallet picks the best one.

### Transaction types
* `t -> t`: fully public.
* `t -> z` (**shielding**): the source and the amount entering the pool are public.
* `z -> z`: fully shielded. Sender, recipient, amount and memo are encrypted.
* `z -> t` (**unshielding**): the destination and the amount leaving the pool are public.

Value moving in and out of a pool is public. Compare this with exercise 2 of [part 1](./01-deanonymize.md).

### Notes, nullifiers and memos
Shielded funds exist as **notes**. Each note is a commitment stored in a Merkle tree. Spending a note publishes its **nullifier** (so it cannot be spent twice) together with a proof that the nullifier corresponds to *some* note in the tree. You will build this exact mechanism in [part 8](./08-minipool.md).

Every shielded output carries a 512-byte **memo**, encrypted to the recipient.

### Viewing keys
A **unified full viewing key** (UFVK) lets its holder see all incoming and outgoing transactions of an account without being able to spend.

## Setting Up

### 1. Build the wallet
```bash
git clone https://github.com/zcash/zcash-devtool
cd zcash-devtool
cargo run --release --all-features -- --help
```
The examples below shorten `cargo run --release --all-features --` to `zdt`. You can define an alias.

### 2. Create a testnet wallet
The wallet encrypts its seed to an [age](https://age-encryption.org/) identity file. Follow the [walkthrough](https://github.com/zcash/zcash-devtool/blob/main/doc/walkthrough.md) to create one, then:
```bash
zdt wallet -w ../student-wallet init --name "Student" \
  -i ../student-wallet/key.txt -n test -s zecrocks
```
`-n test` selects testnet. `-s zecrocks` selects the `testnet.zec.rocks` light wallet server.

### 3. Get your address
```bash
zdt wallet -w ../student-wallet list-addresses
```
You should see a unified address starting with `utest1`.

### 4. Get TAZ
Use one of the community faucets (the instructor will confirm which one is working), or ask the instructor. Then sync and check:
```bash
zdt wallet -w ../student-wallet sync -s zecrocks
zdt wallet -w ../student-wallet balance
```

## Exercises

### Exercise 1: look at a shielded transaction
1. Find the transaction that funded you in a Zcash testnet block explorer.
2. Answer in your repository:
   - Can you see the sender? The amount? Your address?
   - What *is* visible? (Look for the fee, the number of shielded actions, and any transparent inputs or outputs.)
   - Compare with the Monero transaction from [part 2](./02-monero.md). Which observer-visible fields differ?

### Exercise 2: send a shielded memo (4 points)
1. Get the instructor's unified address from the [README](./README.md#deployed-addresses), or from the instructor if it is not listed there yet.
2. Send a shielded payment of at least `0.001` TAZ whose memo is **your student address on Sepolia**, in lowercase. Using the PCZT flow from the walkthrough:
   ```bash
   zdt pczt -w ../student-wallet create \
     --address <instructor_unified_address> \
     --value 100000 \
     --memo "0x<your student address>" > ../memo.created
   ```
   `--value` is in zatoshis (1 TAZ = 100,000,000 zatoshis). Then prove, sign and send the transaction as described in the walkthrough; the final step is:
   ```bash
   zdt pczt -w ../student-wallet send -s zecrocks < ../memo.combined
   ```
3. The instructor syncs the grading wallet and runs the grader script on the memos it received. Each memo containing an address earns that address its points, through the `EvaluatorOffchain` contract on Sepolia. A given Zcash transaction is credited only once. **4 points**.

You submit nothing on Sepolia for this exercise. Think about what that implies:
- Only the instructor can read your memo.
- The instructor cannot tell which Zcash address paid them, only what the memo says.

### Exercise 3: share a viewing key
1. Print your account's UFVK:
   ```bash
   zdt wallet -w ../student-wallet list-accounts
   ```
2. Give the UFVK to a classmate. They import it into a separate view-only wallet:
   ```bash
   zdt wallet -w ../view-wallet init-fvk \
     --name "Audit" \
     --fvk "<ufvk>" \
     --birthday <block height shortly before your first transaction> \
     -s zecrocks
   ```
   Depending on the version, `init-fvk` may require additional flags (for example a seed fingerprint and account index). Check `init-fvk --help`.
3. They sync and list your activity. Can they read the memo you sent in exercise 2? Can they spend?

### Exercise 4 (optional): shield and unshield
1. Ask the faucet (or a classmate) for TAZ at your **transparent** receiver.
2. Shield those funds, then look at the shielding transaction in the explorer.
3. Send some TAZ back out to a transparent address and look again.
4. Which amounts and addresses were public at each step? Explain why moving the *same amount* in and straight back out defeats the purpose.

### Exercise 5 (optional): run a node
Run [Zebra](https://zebra.zfnd.org/) on testnet and point a light wallet server at it instead of using a public server. What did the public server operator learn about you in the previous exercises that your own node keeps private?

## Questions
1. Zcash privacy is opt-in (transparent addresses exist), Monero's is mandatory. What does that do to the size of the anonymity set?
2. A Monero input hides among a ring of decoys; a Zcash shielded spend hides among every note in the pool. What are the trade-offs?
3. Why does the nullifier not reveal which note was spent?
4. How would an auditor or tax authority be given access in each system?

## Notes and Hints
- Light wallet servers see your IP address and the block ranges you request. That is a privacy leak at the network layer, not the protocol layer.
- If `balance` shows funds as pending, wait for more confirmations and `sync` again.
- Keep the wallet directories outside the cloned repository so they are not committed by accident.
