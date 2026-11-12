# Part 7: Bitcoin Privacy on Signet

## Introduction
Bitcoin has no privacy at the protocol level: amounts and addresses are public, and its UTXO model gives analysts an extra tool, the **common-input-ownership heuristic** ("all inputs of a transaction belong to the same wallet"). Bitcoin privacy techniques are collaborative transactions designed to make that heuristic, and others, wrong.

In this part you will do a **payjoin** with a classmate, take part in a **coinjoin**, and study **silent payments**.

* **Network:** Bitcoin signet (coins have no value)
* **Grading:** ungraded walkthrough; record your transaction IDs and answers in your repository
* **Tools:** Bitcoin Core 29.0 to 31.x (**not 32.x**, see below), [`payjoin-cli`](https://github.com/payjoin/rust-payjoin/tree/master/payjoin-cli), [`joinmarket-ng`](https://github.com/joinmarket-ng/joinmarket-ng)

This part builds on [Bitcoind 101](../../infrastructure/bitcoind-101/). Signet is much smaller than mainnet, and the configuration below caps block storage at 550 MB (the chain state comes on top of that). Start the sync before the session.

> **Verify before the session**
> - That a signet faucet is working, and keep a reserve of signet coins to hand out. Faucets are protected against scripts: coins must be requested from a browser. On 12 November 2026, `signetfaucet.com` and `signet.bc-2.jp` did not answer from our network and `alt.signetfaucet.com` did.
> - The Bitcoin Core version. `payjoin-cli` 1.0.0 fails against Bitcoin Core 32.x with `Error parsing rpc response: conversion of the psbt field failed`, because 32.x creates version 2 PSBTs by default. It works with 31.2. Check whether a newer `payjoin-cli` lifts this restriction.
> - How much the faucet pays. Ours paid 1000 sats per request, which is not enough for the sender (see exercise A2).
> - What our dry run on 12 November 2026 covered: a pruned signet sync with the provided configuration (about 1 hour 20 minutes, 5 GB on disk in total), wallet creation and funding, `payjoin-cli` 1.0.0 installed with `cargo install` (about four minutes), and a complete payjoin through the public directory and relays with Bitcoin Core 31.2, but on a local regtest network: our signet coins were too small. The coinjoin was **not** run and JoinMarket-NG was not installed.
> - How long a pruned signet sync takes and how much disk it ends up using with [`bitcoin-signet.conf`](./bitcoin-signet.conf), and that `payjoin-cli` and `joinmarket-ng` work against a pruned node without `txindex`.
> - The `payjoin-cli` configuration keys against its current [README](https://github.com/payjoin/rust-payjoin/tree/master/payjoin-cli) and `example.config.toml`, and that the public payjoin directory and OHTTP relays accept signet sessions.
> - The `joinmarket-ng` install, signet settings and maker/taker commands against its [documentation](https://joinmarket-ng.github.io/joinmarket-ng/). The classic JoinMarket client was archived in April 2026. Decide whether the class uses the public signet order book or a directory node run by the instructor.

## Setting Up

### 1. Run a signet node
The workshop ships [`bitcoin-signet.conf`](./bitcoin-signet.conf), a configuration that keeps disk usage as low as possible:
```ini
signet=1
server=1
prune=550
txindex=0
blockfilterindex=0
coinstatsindex=0

[signet]
rpcuser=workshop
rpcpassword=workshop
```
| Option | Effect on disk usage |
|---|---|
| `prune=550` | Keeps at most 550 MB of block files, the minimum Bitcoin Core allows. Older blocks are deleted once validated. This is the main saving. The node still validates the whole chain. |
| `txindex=0`, `blockfilterindex=0`, `coinstatsindex=0` | No optional index. `txindex` cannot be combined with pruning anyway. |

Start the node with it. `-conf` needs an absolute path:
```bash
bitcoind -conf=/path/to/privacy-101/bitcoin-signet.conf -daemon
alias bcli="bitcoin-cli -conf=/path/to/privacy-101/bitcoin-signet.conf"
bcli getblockchaininfo
```
The rest of this part uses the `bcli` alias. Wait until `initialblockdownload` is `false`. The signet RPC port is `38332`.

The chain is stored in the `signet` subfolder of the Bitcoin data directory (`~/.bitcoin/signet` on Linux, `~/Library/Application Support/Bitcoin/signet` on macOS, `%APPDATA%\Bitcoin\signet` on Windows). Delete that folder after the workshop to get the space back.

Two consequences of running a pruned node without a transaction index:
- **Create your wallets on this node, after it has started.** A wallet with older history cannot be rescanned, because the old blocks are gone.
- `getrawtransaction <txid>` alone only finds transactions that are still in the mempool. For a confirmed transaction of one of your wallets, use `gettransaction` as shown below. For someone else's transaction, pass the block hash as well (`getrawtransaction <txid> 2 <blockhash>`, as long as that block has not been pruned) or use a signet block explorer.

### 2. Create two wallets and fund them
```bash
bcli createwallet sender
bcli createwallet receiver
bcli -rpcwallet=sender getnewaddress
bcli -rpcwallet=receiver getnewaddress
```
Fund **both** addresses from a signet faucet and wait for a confirmation. Payjoin requires the receiver to own a UTXO too. The sender needs clearly more than it will pay: at least 5000 sats for the 1000-sat payment of exercise A2. Ask the faucet several times, or ask the instructor.

Wallets are not reloaded automatically when the node restarts. If a command answers "Requested wallet does not exist or is not loaded", run `bcli loadwallet sender` and `bcli loadwallet receiver`.

## Section A: Payjoin

### The idea
In a normal payment, all inputs belong to the payer. In a payjoin, the **receiver also contributes an input**. The result looks like an ordinary transaction, but:
- the common-input-ownership heuristic gives the wrong answer,
- the real payment amount is no longer equal to any output.

Payjoin v2 (BIP 77) is asynchronous: sender and receiver exchange the half-built transaction through an untrusted **directory**, reached through an **OHTTP relay** so that the directory does not learn their IP addresses.

### Exercise A1: a baseline payment
1. Send `1000` sats (`0.00001`) from `sender` to `receiver` with a normal `sendtoaddress`. If your sender wallet holds less than 10000 sats, only read this exercise and keep your coins for the payjoin.
2. Decode the transaction. The last two arguments ask for watch-only details and for the decoded transaction, found in the `decoded` field of the result:
   ```bash
   bcli -rpcwallet=sender gettransaction <txid> true true
   ```
3. Write down: number of inputs, who owns them, the outputs, and which output is the change. How did you recognise the change?

### Exercise A2: a payjoin with a classmate
Pair up. One of you is the receiver, the other the sender; then swap.

1. Install the client:
   ```bash
   cargo install payjoin-cli
   ```
2. Each of you creates a working directory containing a `config.toml` that points at your own node and wallet:
   ```toml
   [bitcoind]
   rpcuser = "workshop"
   rpcpassword = "workshop"
   rpchost = "http://localhost:38332/wallet/<sender or receiver>"

   [v2]
   pj_directories = ["https://payjo.in"]
   ohttp_relays = ["https://pj.bobspacebkk.com", "https://pj.benalleng.com"]
   ```
3. The receiver runs, from their directory:
   ```bash
   payjoin-cli receive 1000
   ```
   The amount is in sats.
   and sends the resulting `bitcoin:...?pj=...` URI to the sender.
4. The sender runs, from their directory:
   ```bash
   payjoin-cli send "<the URI>" --fee-rate 1
   ```
5. If either side goes offline, `payjoin-cli resume` continues the session.

If the sender fails with `Error parsing rpc response: numeric`, the most likely cause is that its wallet could not build a transaction **with a change output**: the coin it holds is too close to the amount to pay, so the remainder was too small to be worth an output. We hit this with a 1000-sat coin and a 400-sat payment. Fund the sender with more coins. If a failed attempt left the coin locked (`bcli -rpcwallet=sender listlockunspent`), release it with `bcli -rpcwallet=sender lockunspent true`.

### Exercise A3: analyse it
Decode the payjoin transaction as in A1 and answer:
1. How many inputs are there, and who owns each?
2. Is there an output of exactly the amount paid?
3. What would an analyst applying the common-input-ownership heuristic conclude? Why is it wrong?
4. Could an analyst tell this transaction apart from a normal one? Which details might give it away?
5. What did the directory learn? What did the OHTTP relay learn?

## Section B: Coinjoin with JoinMarket

### The idea
A coinjoin is a single transaction in which several users each contribute inputs and each receive **an output of the same amount**. An observer cannot tell which equal output belongs to which input. The number of equal outputs is the **anonymity set** of that round.

In JoinMarket, **makers** advertise liquidity and wait; **takers** choose makers, build the coinjoin and pay them a fee. The parties find each other through directory nodes reached over Tor.

### Exercise B1: install, configure, create a wallet
JoinMarket needs Python 3.11 or later and Tor, and runs on Linux and macOS. Follow its [installation guide](https://joinmarket-ng.github.io/joinmarket-ng/install/); read the install script before running it, as you should for any script fetched from the internet. Then activate its environment:
```bash
source ~/.joinmarket-ng/activate.sh
```
Point it at signet and at your node in `~/.joinmarket-ng/config.toml`. Set these keys in the existing file rather than replacing it (see the [setup guide](https://joinmarket-ng.github.io/joinmarket-ng/setup/)):
```toml
[bitcoin]
backend_type = "descriptor_wallet"
rpc_url = "http://127.0.0.1:38332"
rpc_user = "workshop"
rpc_password = "workshop"

[network_config]
network = "signet"
```
Create a wallet and a deposit address:
```bash
jm-wallet generate
jm-wallet address new 0 --label "deposit"
jm-wallet info
```
Fund the address from your signet wallet or a faucet.

JoinMarket documents pruned nodes as an **experimental** setup. A wallet generated now, on a node that is already running, does not need old blocks; never import an older seed here.

JoinMarket wallets are split into **mixdepths** (separate accounts). Coinjoin outputs land in the next mixdepth so that mixed and unmixed coins are never spent together by accident.

### Exercise B2: one coinjoin, the whole class
1. Half the class runs a maker and leaves it running:
   ```bash
   jm-maker start --mnemonic-file ~/.joinmarket-ng/wallets/default.mnemonic
   ```
2. The other half runs a taker. Each taker does one coinjoin with three makers, sending the mixed coins to the next mixdepth of their own wallet:
   ```bash
   jm-taker coinjoin --mnemonic-file ~/.joinmarket-ng/wallets/default.mnemonic \
     --amount 100000 --counterparties 3 --destination INTERNAL
   ```
   `jm-maker start --help` and `jm-taker coinjoin --help` list every option, and the "Run a maker" and "Run a CoinJoin" guides explain them.
3. Swap roles if time allows.

### Exercise B3: analyse it
Pick a coinjoin transaction from the class and decode it (with `gettransaction` if one of your wallets took part, with a signet block explorer otherwise).
1. Identify the equal-amount outputs. How large is the anonymity set?
2. Identify the change outputs. Can you match each change output to its inputs by arithmetic? What does that tell you about the privacy of *change*?
3. Which participant is the taker? (Hint: who paid the mining fee and the maker fees?)
4. A user receives a coinjoin output, then later spends it **together with** their change output from the same coinjoin. What has happened to their privacy?
5. Compare the anonymity set of one coinjoin round with a Monero ring, a Zcash shielded pool and a Privacy Pools withdrawal.

## Section C: Silent Payments (reading)
Read the overview of [BIP 352](https://github.com/bitcoin/bips/blob/master/bip-0352.mediawiki).

Silent payments let a receiver publish one static address, from which each sender derives a unique on-chain output that only the receiver can detect. This is the Bitcoin counterpart of the stealth addresses in [part 5](./05-stealth-addresses.md).

1. ERC-5564 needs an announcement carrying an ephemeral public key. Silent payments need none. What plays the role of the ephemeral key?
2. What does the receiver have to do to find their payments, and why is that expensive for a light wallet?
3. As of late 2026, silent payments were specified but not available in a released Bitcoin Core wallet. Which wallets support sending or receiving today?

## Wrap-up Questions
1. Payjoin breaks a heuristic; coinjoin creates an anonymity set. Which one helps a user who does it only once?
2. All of these techniques are interactive: they need other users online. How do Monero and Zcash avoid that?
3. Amounts are never hidden here. Which earlier parts of the workshop hide amounts, and with which primitive?

## Notes and Hints
- `payjoin-cli` reads `config.toml` from the directory in which it is run, and stores its session state there in `payjoin.sqlite`.
- If the payjoin fails, the sender's original transaction is still valid and can be broadcast as a normal payment. That fallback is part of the protocol.
- A block explorer for signet (for example mempool.space's signet view) shows the same data as `getrawtransaction`, more readably.
- Signet blocks arrive about every 10 minutes. Plan the session so that you are not waiting on confirmations.
