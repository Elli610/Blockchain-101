# Part 2: Monero on Stagenet

## Introduction
Monero hides the sender, the recipient and the amount of every transaction by default. In this part you will run a wallet on **stagenet**, look at what an outside observer can and cannot see, selectively disclose information with view keys and payment proofs, and finally mine with your classmates on a private p2pool sidechain.

* **Network:** Monero stagenet (coins have no value)
* **Grading:** off-chain grader, **5 points**. Mining is ungraded.
* **Tools:** the Monero CLI (`monerod`, `monero-wallet-cli`), optionally `p2pool` and `xmrig`

> **Why stagenet and not testnet?** The Monero documentation recommends stagenet for users and application developers: it follows mainnet rules. Testnet is the experimental network used by protocol developers; it forks earlier and more often.

> **Verify before the session**
> - Which transaction format stagenet currently uses. The FCMP++ upgrade replaces ring signatures with full-chain membership proofs. As of November 2026 it was reported on a dedicated stressnet only, but sources disagree. If stagenet has activated it, exercise "What an observer sees" must be adapted (there are no ring members to look at any more).
> - That at least one stagenet faucet is online.
> - That the class p2pool sidechain works end to end (see [Mining](#mining-on-a-private-p2pool-sidechain-ungraded)).

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
**Option A, your own node (required for mining).** Start it early: the initial sync takes a while.
```bash
./monerod --stagenet --prune-blockchain --zmq-pub tcp://127.0.0.1:38083
```
Stagenet ports: P2P `38080`, RPC `38081`, restricted RPC `38089`.

**Option B, a remote node.** Faster to start, but the node operator learns your IP address and which transactions you submit. The instructor will give you the address of the class node.

### 3. Create a wallet
```bash
./monero-wallet-cli --stagenet --generate-new-wallet student
# with a remote node, add: --daemon-address <host>:<port>
```
Write the seed phrase down in your notes. This is a stagenet wallet: it is fine to store it in plain text, and it must never be used on mainnet.

### 4. Get coins
Inside the wallet:
```
address
```
Request stagenet XMR for that address from one of the faucets listed in the [Monero network docs](https://docs.getmonero.org/infrastructure/networks/). Then:
```
refresh
balance
```
Funds unlock after 10 blocks (about 20 minutes).

## Exercises

### Exercise 1: subaddresses (ungraded)
1. Create a subaddress: `address new workshop`.
2. Ask a classmate to send a small amount to it, and send some to theirs: `transfer <address> <amount>`.
3. Compare your primary address, your subaddress, and what appears on-chain for the transaction (next exercise). Is either address visible?

### Exercise 2: what an observer sees (ungraded, written answers)
Open one of your transactions in a stagenet block explorer (listed in the Monero network docs) using its transaction ID from `show_transfers`.

Answer in your repository:
1. Where is the amount? What do you see instead?
2. Where is the recipient address? What do you see instead?
3. For one input, how many ring members are listed? Can you tell which one is really being spent?
4. What is the key image for?
5. What *can* an observer still learn? (Think: fee, size, number of inputs and outputs, timing, and your IP if you use a remote node.)

### Exercise 3: view-only wallet (ungraded)
1. Print your keys: `viewkey` (and `address`).
2. Give your address and **private view key** to a classmate.
3. They create a view-only wallet:
   ```bash
   ./monero-wallet-cli --stagenet --generate-from-view-key audit-<yourname>
   ```
4. What can they see? Ask them to tell you your incoming transfers. Can they see what you spent? Why not?

### Exercise 4: prove a payment (5 points)
This is how you get graded on a chain where the grader cannot see anything.

1. Send at least `0.01` stagenet XMR to the instructor's grading address (given in class):
   ```
   transfer <instructor_address> 0.01
   ```
2. Note the transaction ID (`show_transfers out`).
3. Generate a payment proof whose message is **your student address on Sepolia**, in lowercase:
   ```
   get_tx_proof <txid> <instructor_address> 0x<your student address>
   ```
   This writes a file named `monero_tx_proof` containing a signature string.
4. Submit the transaction ID and the proof string with `ex_moneroProof(txid, proof)` on the `EvaluatorOffchain` contract on Sepolia. The contract only records your submission; you can submit again to replace it.
5. The grader script runs the equivalent of
   ```
   check_tx_proof <txid> <instructor_address> <proof> 0x<your student address>
   ```
   and, if the proof is valid, the amount is sufficient and the transaction is confirmed, mints your points. A given Monero transaction is credited only once. **5 points**.

Things to try before submitting:
- Verify your own proof with `check_tx_proof`.
- Change one character of the message and verify again.
- Ask a classmate to submit *your* proof from *their* Sepolia address. Why does it fail?

## Mining on a Private p2pool Sidechain (ungraded)
[p2pool](https://github.com/SChernykh/p2pool) is a decentralized mining pool: miners share a side blockchain of "shares", and when one of them finds a real Monero block, the block reward is paid directly to all recent share holders in the coinbase transaction. There is no pool operator and no pool wallet.

The public p2pool sidechains are for mainnet. Here the whole class runs **its own sidechain** on top of stagenet.

### 1. Node
You need your own synced stagenet node with ZMQ enabled (Option A above).

### 2. Sidechain parameters
Everyone must use the same file. The instructor provides `class-sidechain.json`:
```json
{
  "name": "blockchain-101",
  "password": "<given in class>",
  "block_time": 10,
  "min_diff": 100000,
  "pplns_window": 360,
  "uncle_penalty": 20
}
```
| Field | Meaning | Allowed range |
|---|---|---|
| `name`, `password` | Identify the sidechain. Different values mean a different, incompatible sidechain. | up to 128 characters |
| `block_time` | Target seconds between shares. | 1 to 120 |
| `min_diff` | Minimum share difficulty. | at least 100000 |
| `pplns_window` | Number of recent shares that get paid when a block is found. | 60 to 2160 |
| `uncle_penalty` | Percentage of an uncle share's weight given to the share that includes it. | 1 to 99 |

### 3. Run p2pool
```bash
./p2pool --host 127.0.0.1 --rpc-port 38081 --zmq-port 38083 \
  --wallet <your stagenet PRIMARY address> \
  --sidechain-config class-sidechain.json \
  --addpeers <instructor ip>:37889 \
  --start-mining 2
```
- `--wallet` must be a primary address (starting with `5` on stagenet), not a subaddress.
- p2pool detects the network type from the `monerod` it connects to.
- `--start-mining N` uses the built-in miner on `N` threads. You can instead point `xmrig` at p2pool's stratum port (`127.0.0.1:3333`).

### 4. Observe
- In the p2pool console, type `status`. Watch your shares appear in the PPLNS window.
- When the class pool finds a stagenet block, open that block in the explorer and look at the coinbase transaction. How many outputs does it have? Who are they for?
- Check your wallet. Mined outputs unlock after 60 blocks.

### Questions
1. Your payout address is public to every p2pool peer. What privacy does a p2pool miner give up compared with a regular Monero user?
2. Why does p2pool require a primary address rather than a subaddress?
3. With `min_diff` at 100000 and a laptop producing about 1000 H/s, roughly how long does one share take? What happens to the share difficulty as more classmates join?
4. Whether the class finds a block depends on the stagenet network difficulty. Read it with `monerod`'s `status` command and estimate the expected time for your combined hashrate.

## Notes and Hints
- `help` in `monero-wallet-cli` lists every command. `help <command>` gives details.
- `get_tx_key <txid>` reveals the one-time transaction secret. It can prove a payment too (`check_tx_key`), but unlike `get_tx_proof` it is not bound to a message.
- `get_reserve_proof` proves you own at least a given balance without moving it.
- If the wallet says the daemon is busy or not synced, wait for `monerod` to finish syncing (`status`).
- Never mine on someone else's machine or network without permission, even on a test network.
