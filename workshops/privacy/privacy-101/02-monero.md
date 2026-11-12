# Part 2: Monero on Stagenet

## Introduction
Monero hides the sender, the recipient and the amount of every transaction by default. In this part you will run a wallet on **stagenet**, look at what an outside observer can and cannot see, selectively disclose information with view keys and payment proofs, and finally mine stagenet blocks on your own node.

* **Network:** Monero stagenet (coins have no value)
* **Grading:** off-chain grader, **5 points**. Mining is ungraded.
* **Tools:** the Monero CLI (`monerod`, `monero-wallet-cli`), and [`xmrig`](https://xmrig.com/) for mining

> **Why stagenet and not testnet?** The Monero documentation recommends stagenet for users and application developers: it follows mainnet rules. Testnet is the experimental network used by protocol developers; it forks earlier and more often.

> **Verify before the session**
> - Which transaction format stagenet currently uses. The FCMP++ upgrade replaces ring signatures with full-chain membership proofs. On 12 November 2026 stagenet transactions still carried ring members and key images (RingCT type 6, CLI v0.18.5.4). If stagenet has activated FCMP++ since, exercise "What an observer sees" must be adapted.
> - That a stagenet faucet is online. On 12 November 2026 [stagenet-faucet.xmr-tw.org](https://stagenet-faucet.xmr-tw.org/) paid 0.1 stagenet XMR per request, with no captcha.
> - How fast stagenet produces blocks. The target is 2 minutes, but during our dry run it produced 5 blocks in 50 minutes, so the 10 confirmations needed to spend faucet coins took well over an hour.
> - Exercise 4 and the grader were run end to end on 12 November 2026 (payment, proof, submission on Sepolia, `scripts/grader-monero.ts` with `monero-wallet-rpc`). Mining was **not** run, because the node had not finished syncing.
> - How long a node sync takes. During our dry run the pruned node of Option A had synced 11% of the blocks after one hour, for 2.7 GB on disk.
> - That the current `xmrig` release mines against a stagenet `monerod` with the command below, and how long a laptop needs to find a block at the current stagenet difficulty (see [Mining](#mining-on-your-own-node)).

## The Building Blocks

### Keys and addresses
A Monero wallet has two key pairs:
* the **spend key**, needed to spend funds,
* the **view key**, which can only detect and read incoming funds.

The address encodes the two public keys. On stagenet, primary addresses start with `5` and subaddresses start with `7`.

### Three layers of privacy
| What is hidden | Mechanism |
|---|---|
| Recipient | **Stealth addresses.** The sender derives a fresh one-time public key for every output from the recipient's address. The address itself never appears on-chain. |
| Sender | **Ring signatures.** Each input is signed by "one of these N outputs" (the real one plus decoys). A **key image** prevents double spending without revealing which member was spent. |
| Amount | **RingCT.** Amounts are Pedersen commitments with range proofs. |

### Selective disclosure
* **View-only wallet:** give someone your private view key and they can see everything you receive.
* **Transaction key / proof:** prove to a specific person that a specific transaction paid a specific address, without revealing anything else.

## Setting Up

### 1. Install
Download the CLI tools from [getmonero.org/downloads](https://www.getmonero.org/downloads/) and verify the hashes as described on that page.

### 2. Choose a node
You can do every exercise except mining with a remote node (Option B). Syncing your own node (Option A) takes **many hours**: start it the day before the session, and use a remote node in the meantime.

**Option A, your own node (required for mining).**

The workshop ships [`monerod-stagenet.conf`](./monerod-stagenet.conf), a configuration that keeps disk usage as low as possible:
```ini
stagenet=1
prune-blockchain=1
sync-pruned-blocks=1
log-level=0
max-log-file-size=10485760
max-log-files=1
```
| Option | Effect on disk usage |
|---|---|
| `prune-blockchain` | Keeps only a fraction of the data needed to verify old transactions. This is the main saving. The node still validates every block, serves your wallet and can mine. |
| `sync-pruned-blocks` | Downloads blocks already pruned, instead of downloading them in full and pruning them afterwards. |
| `max-log-file-size`, `max-log-files` | Caps logs at a single 10 MB file. The defaults allow 50 files of 100 MB. |

Start the node with it:
```bash
./monerod --config-file /path/to/privacy-101/monerod-stagenet.conf
```
Stagenet ports: P2P `38080`, RPC `38081`, restricted RPC `38089`.

The chain is stored in `~/.bitmonero/stagenet` (Linux and macOS) or `C:\ProgramData\bitmonero\stagenet` (Windows). Check its size with `du -sh ~/.bitmonero/stagenet`, and delete that folder after the workshop to get the space back.

**Option B, a remote node.** Nothing to sync, but the node operator learns your IP address and which transactions you submit. Use the class node if the instructor runs one, or a public stagenet node such as `node.monerodevs.org:38089` or `stagenet.xmr-tw.org:38081`.

### 3. Create a wallet
```bash
./monero-wallet-cli --stagenet --generate-new-wallet student
# with a remote node, add: --daemon-address <host>:<port> --trusted-daemon
```
You will be asked for a password and a language for the seed phrase.
Write the seed phrase down in your notes. This is a stagenet wallet: it is fine to store it in plain text, and it must never be used on mainnet.

### 4. Get coins
Inside the wallet:
```
address
```
**Do this first, before reading further.** Request stagenet XMR for that address from a faucet, for example [stagenet-faucet.xmr-tw.org](https://stagenet-faucet.xmr-tw.org/) or one of those listed in the [Monero network docs](https://docs.getmonero.org/infrastructure/networks/). Then:
```
refresh
balance
```
`balance` shows the amount immediately, with a count of blocks left before it unlocks. Funds can only be spent after 10 blocks. That is 20 minutes when stagenet runs at its target rate, but stagenet blocks are often much slower: it can take more than an hour. Exercises 1 to 3 below can be started while you wait. Run `refresh` to update the count.

## Exercises

### Exercise 1: subaddresses
1. Create a subaddress: `address new workshop`.
2. Ask a classmate to send a small amount to it, and send some to theirs: `transfer <address> <amount>`.
3. Compare your primary address, your subaddress, and what appears on-chain for the transaction (next exercise). Is either address visible?

### Exercise 2: what an observer sees
Open one of your transactions in a stagenet block explorer, for example [stagenet.xmrchain.net](https://stagenet.xmrchain.net/) or [explorer-stage.xmr-tw.org](https://explorer-stage.xmr-tw.org/), using its transaction ID from `show_transfers`. The faucet transaction that funded you works.

Answer in your repository:
1. Where is the amount? What do you see instead?
2. Where is the recipient address? What do you see instead?
3. For one input, how many ring members are listed? Can you tell which one is really being spent?
4. What is the key image for?
5. What *can* an observer still learn? (Think: fee, size, number of inputs and outputs, timing, and your IP if you use a remote node.)

### Exercise 3: view-only wallet
1. Print your keys: `viewkey` (and `address`).
2. Give your address and **private view key** to a classmate.
3. They create a view-only wallet:
   ```bash
   ./monero-wallet-cli --stagenet --generate-from-view-key audit-<yourname>
   ```
   The wallet asks for your address, your view key, then a **restore height**. Give it a height or date shortly before your first transaction (the height is shown by `show_transfers`): scanning from block 0 takes a very long time.
4. What can they see? Ask them to tell you your incoming transfers. Can they see what you spent? Why not?

### Exercise 4: prove a payment (5 points)
This is how you get graded on a chain where the grader cannot see anything.

1. Send at least `0.01` stagenet XMR to the instructor's grading address, listed in the [README](./README.md#deployed-addresses):
   ```
   transfer <instructor_address> 0.01
   ```
   The wallet asks for your password, shows the fee and asks for confirmation.
2. Note the transaction ID (`show_transfers out`).
3. Generate a payment proof whose message is **your student address on Sepolia**, in lowercase:
   ```
   get_tx_proof <txid> <instructor_address> 0x<your student address>
   ```
   This writes a file named `monero_tx_proof` in the current directory, containing a signature string that starts with `OutProofV2`.
4. Submit the transaction ID and the proof string with `ex_moneroProof(txid, proof)` on the `EvaluatorOffchain` contract on Sepolia. The contract only records your submission; you can submit again to replace it.
5. The grader script runs the equivalent of
   ```
   check_tx_proof <txid> <instructor_address> <proof> 0x<your student address>
   ```
   and, if the proof is valid, the amount is sufficient and the transaction is confirmed (at least one block, which can take a while on stagenet), mints your points. A given Monero transaction is credited only once. **5 points**.

Things to try before submitting:
- Verify your own proof with `check_tx_proof`.
- Change one character of the message and verify again.
- Ask a classmate to submit *your* proof from *their* Sepolia address. Why does it fail?

## Mining on Your Own Node
Monero is mined with RandomX, a proof-of-work algorithm designed for ordinary CPUs. Here you mine **solo**: your miner asks your own node for a block template, searches for a valid nonce, and submits the block through your node. No pool is involved, and if you find a block the whole reward is yours.

### 1. Node
You need your own **fully synced** stagenet node (Option A above). A miner pointed at a node that is still syncing wastes its work on old blocks.

### 2. Install xmrig
Download [xmrig](https://xmrig.com/download) for your platform and unpack it. Antivirus software commonly flags miners; this one is open source, and you are running it deliberately on your own machine.

xmrig publishes binaries for Windows, macOS (Intel and Apple Silicon) and Linux x64. If there is none for your platform (Linux on ARM, for instance), build it from source by following its [build instructions](https://xmrig.com/docs/miner/build).

### 3. Mine
Get your wallet's **primary** address (starting with `5` on stagenet) with `address` in `monero-wallet-cli`, then:
```bash
./xmrig --daemon -o 127.0.0.1:38081 -a rx/0 -u <your stagenet primary address> -t 2
```
- `--daemon` selects solo mining against a node's RPC instead of a pool.
- `-o` is the RPC address of your `monerod` (`38081` on stagenet).
- `-a rx/0` selects RandomX as used by Monero.
- `-u` is the address that receives the block reward.
- `-t` is the number of CPU threads. Keep a couple of cores free for the rest of the workshop.

Stop it with `Ctrl+C`.

### 4. Observe
- xmrig prints your hashrate every minute, and `new job` each time your node hands it a new block template. When does that happen?
- In `monerod`, run `status` to read the current height and network difficulty.
- If you find a block, xmrig reports it as accepted. Open that block in the stagenet explorer and look at its coinbase transaction.
- Check your wallet with `refresh` and `show_transfers`. Mined outputs unlock after 60 blocks.

### Questions
1. Read the stagenet difficulty from `monerod`'s `status`. With your hashrate, how long should you expect to wait for a block? (Expected time is difficulty divided by hashrate, in seconds. On 12 November 2026 the stagenet difficulty was about 9.4 million: roughly an hour and a half at 2000 H/s.)
2. Do the same computation with the mainnet difficulty. What does it tell you about why mining pools exist?
3. Look at the coinbase transaction of any block. Is the miner's address visible? Is the amount? Why is the coinbase amount treated differently from other outputs?
4. A pool operator knows the address and hashrate of each of its miners. What does a solo miner reveal, and to whom?
5. Why does it matter for the network that RandomX runs well on CPUs and poorly on specialised hardware?

## Notes and Hints
- `help` in `monero-wallet-cli` lists every command. `help <command>` gives details.
- `get_tx_key <txid>` reveals the one-time transaction secret. It can prove a payment too (`check_tx_key`), but unlike `get_tx_proof` it is not bound to a message.
- `get_reserve_proof` proves you own at least a given balance without moving it.
- If the wallet says the daemon is busy or not synced, wait for `monerod` to finish syncing (`status`).
- Never mine on someone else's machine or network without permission, even on a test network.
