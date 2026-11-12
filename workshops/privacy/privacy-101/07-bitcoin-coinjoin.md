# Part 7: Bitcoin Privacy on Signet

## Introduction
Bitcoin has no privacy at the protocol level: amounts and addresses are public, and its UTXO model gives analysts an extra tool, the **common-input-ownership heuristic** ("all inputs of a transaction belong to the same wallet"). Bitcoin privacy techniques are collaborative transactions designed to make that heuristic, and others, wrong.

In this part you will do a **payjoin** with a classmate, take part in a **coinjoin**, and study **silent payments**.

* **Network:** Bitcoin signet (coins have no value)
* **Grading:** ungraded walkthrough; record your transaction IDs and answers in your repository
* **Tools:** Bitcoin Core 29.0 or later, [`payjoin-cli`](https://github.com/payjoin/rust-payjoin/tree/master/payjoin-cli), [`joinmarket-ng`](https://github.com/joinmarket-ng/joinmarket-ng)

This part builds on [Bitcoind 101](../../infrastructure/bitcoind-101/). Signet syncs in well under an hour and needs only a few gigabytes.

> **Verify before the session**
> - That a signet faucet is working, and keep a reserve of signet coins to hand out.
> - The `payjoin-cli` configuration keys against its current [README](https://github.com/payjoin/rust-payjoin/tree/master/payjoin-cli) and `example.config.toml`, and that the public payjoin directory and OHTTP relays accept signet sessions.
> - The `joinmarket-ng` install, signet settings and maker/taker commands against its [documentation](https://joinmarket-ng.github.io/joinmarket-ng/). The classic JoinMarket client was archived in April 2026. Decide whether the class uses the public signet order book or a directory node run by the instructor.

## Setting Up

### 1. Run a signet node
`~/.bitcoin/bitcoin.conf`:
```ini
signet=1
server=1
txindex=1

[signet]
rpcuser=workshop
rpcpassword=<choose one>
```
```bash
bitcoind -daemon
bitcoin-cli -signet getblockchaininfo
```
The signet RPC port is `38332`.

### 2. Create two wallets and fund them
```bash
bitcoin-cli -signet createwallet sender
bitcoin-cli -signet createwallet receiver
bitcoin-cli -signet -rpcwallet=sender getnewaddress
bitcoin-cli -signet -rpcwallet=receiver getnewaddress
```
Fund **both** addresses from a signet faucet and wait for a confirmation. Payjoin requires the receiver to own a UTXO too.

## Section A: Payjoin

### The idea
In a normal payment, all inputs belong to the payer. In a payjoin, the **receiver also contributes an input**. The result looks like an ordinary transaction, but:
- the common-input-ownership heuristic gives the wrong answer,
- the real payment amount is no longer equal to any output.

Payjoin v2 (BIP 77) is asynchronous: sender and receiver exchange the half-built transaction through an untrusted **directory**, reached through an **OHTTP relay** so that the directory does not learn their IP addresses.

### Exercise A1: a baseline payment
1. Send `10000` sats from `sender` to `receiver` with a normal `sendtoaddress`.
2. Decode the transaction:
   ```bash
   bitcoin-cli -signet getrawtransaction <txid> 2
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
   rpcpassword = "<your rpc password>"
   rpchost = "http://localhost:38332/wallet/<sender or receiver>"

   [v2]
   pj_directories = ["https://payjo.in"]
   ohttp_relays = ["https://pj.bobspacebkk.com", "https://pj.benalleng.com"]
   ```
3. The receiver runs, from their directory:
   ```bash
   payjoin-cli receive 10000
   ```
   and sends the resulting `bitcoin:...?pj=...` URI to the sender.
4. The sender runs, from their directory:
   ```bash
   payjoin-cli send "<the URI>" --fee-rate 1
   ```
5. If either side goes offline, `payjoin-cli resume` continues the session.

### Exercise A3: analyse it
Decode the payjoin transaction as in A1 and answer:
1. How many inputs are there, and who owns each?
2. Is there an output of exactly 10000 sats?
3. What would an analyst applying the common-input-ownership heuristic conclude? Why is it wrong?
4. Could an analyst tell this transaction apart from a normal one? Which details might give it away?
5. What did the directory learn? What did the OHTTP relay learn?

## Section B: Coinjoin with JoinMarket

### The idea
A coinjoin is a single transaction in which several users each contribute inputs and each receive **an output of the same amount**. An observer cannot tell which equal output belongs to which input. The number of equal outputs is the **anonymity set** of that round.

In JoinMarket, **makers** advertise liquidity and wait; **takers** choose makers, build the coinjoin and pay them a fee. The parties find each other through directory nodes reached over Tor.

### Exercise B1: wallets
Install `joinmarket-ng` and configure it for signet with your Bitcoin Core node, following its documentation. Then:
```bash
jm-wallet generate
jm-wallet address new 0 --label "deposit"
jm-wallet info
```
Fund the address from your signet wallet or a faucet.

JoinMarket wallets are split into **mixdepths** (separate accounts). Coinjoin outputs land in the next mixdepth so that mixed and unmixed coins are never spent together by accident.

### Exercise B2: one coinjoin, the whole class
1. Half the class runs a maker; the other half runs a taker. Use the commands from the "Run a maker" and "Run a CoinJoin" guides.
2. Each taker does one coinjoin with at least three makers.
3. Swap roles if time allows.

### Exercise B3: analyse it
Pick a coinjoin transaction from the class and decode it.
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
