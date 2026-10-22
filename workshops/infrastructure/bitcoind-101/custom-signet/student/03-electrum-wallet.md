# 03 - Electrum wallet

The Electrum wallet is a "thin client": it does not verify the whole chain itself. Instead, it talks to an Electrum server (in our case, the teacher's `electrs` inside mempool.space) over the Electrum protocol, and asks it for balances, transactions, and Merkle proofs.

You will:
1. Install Electrum,
2. Configure it for our custom signet,
3. Point it at the teacher's Electrum server,
4. Create a wallet, receive coins from the faucet, send a tx, watch it confirm.

## Install Electrum

Prefer the official binary from [electrum.org](https://electrum.org/#download). Verify the signature.

**Linux / WSL**:
```bash
# GUI binary
cd /tmp
ELECTRUM_VERSION=4.5.5
wget https://download.electrum.org/${ELECTRUM_VERSION}/electrum-${ELECTRUM_VERSION}-x86_64.AppImage
chmod +x electrum-${ELECTRUM_VERSION}-x86_64.AppImage
sudo mv electrum-${ELECTRUM_VERSION}-x86_64.AppImage /usr/local/bin/electrum
```

WSL has no display by default. Either run Electrum in CLI-only mode (below) or set up WSLg / an X server for the GUI.

**macOS**: download the `.dmg` from electrum.org and drag it into Applications.

## Configure for signet

Electrum understands signet as a distinct chain, but by default expects the public signet challenge. We need to override:

```bash
# CLI configuration; you can also edit ~/.electrum/config manually
electrum --signet setconfig server "teacher.example.com:60401:t"
electrum --signet setconfig auto_connect false
electrum --signet setconfig oneserver true
```

The `:t` suffix means TCP (not TLS). If your teacher enabled TLS on electrs, use `:s` instead.

## Create a wallet

**GUI**: launch `electrum --signet`. In the wizard, choose "Standard wallet" -> "Create a new seed" -> "Segwit". Write down the seed. Confirm.

**CLI**:
```bash
electrum --signet create --seed_type segwit
electrum --signet daemon -d
electrum --signet load_wallet
```

Get a fresh receive address:
```bash
electrum --signet getunusedaddress
```

Copy it. It should start with `sb1...` (signet's Bech32 prefix). NOT `bc1` (mainnet) or `tb1` (testnet).

## Ask the faucet for coins

Ask the teacher's faucet to send you some BTC (see the teacher's info card for whichever method is used):

```bash
# CLI option, if the teacher exposes it over SSH
ssh student@teacher.example.com faucet sb1qYOURADDRESSHERE 1
```

The command returns a `txid`. Watch the transaction show up in your wallet:

```bash
electrum --signet getbalance
electrum --signet listunspent
```

Also open the teacher's explorer and paste your address in the search bar; you should see the tx there too, with 0 confirmations at first.

## Wait for a block

New blocks arrive whenever anyone in the class (teacher, students, mining exercises) produces one. In the meantime, watch the mempool:

```bash
watch -n 3 'bitcoin-cli -signet getmempoolinfo'
```

When a new block confirms your tx:

```bash
electrum --signet gettransaction <txid> | jq '.info.confirmations'
```

...should read 1 or more.

## Send a transaction

Send some coins back to a classmate (they can share their `sb1...` address):

```bash
electrum --signet payto sb1qCLASSMATE 0.1 --fee 0.00001
electrum --signet broadcast <the-hex-blob-that-payto-returned>
```

Or, all in one step:

```bash
electrum --signet payto sb1qCLASSMATE 0.1 --fee 0.00001 --broadcast
```

Find your tx in the mempool:

```bash
bitcoin-cli -signet getrawmempool | jq
```

You should see its txid. Look at it in detail:

```bash
bitcoin-cli -signet getmempoolentry <your-txid>
bitcoin-cli -signet getrawtransaction <your-txid> 2
```

## What you have just learned

- Your `bitcoind` is the authoritative node: it validates every block and every tx.
- Electrum is a client that ASKS your (or the teacher's) server for filtered wallet data. It does not validate the chain on its own.
- The mempool is where unconfirmed txs live. Every full node has its own view of the mempool (they mostly agree).
- Fees are what convince miners to include your tx in their block templates.

Next: [`04-solo-mining.md`](./04-solo-mining.md).
