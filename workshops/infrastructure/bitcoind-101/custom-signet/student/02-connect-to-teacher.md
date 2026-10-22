# 02 - Configure and connect to the teacher's network

## Why this is a private network

You are going to join a Bitcoin network that only exists inside this workshop. It uses the standard signet chain type from Bitcoin Core, but with a custom `signetchallenge` value.

Under the hood, changing `signetchallenge` changes the network magic bytes: the four-byte prefix `bitcoind` puts on every p2p message. Nodes only accept messages whose magic bytes match their own. That means:

- Your node cannot accidentally peer with public signet.
- Your node cannot accidentally peer with mainnet or testnet.
- Only nodes running the SAME `signetchallenge` value can connect to yours.

Your teacher is running one such node. You will point your node at theirs.

## Write your config

Create `~/.bitcoin/bitcoin.conf` (Linux, WSL, and macOS all use this path):

```bash
mkdir -p ~/.bitcoin
cat > ~/.bitcoin/bitcoin.conf <<'EOF'
# ------------------------------------------------------------
# Custom signet (private Bitcoin network for the workshop)
# ------------------------------------------------------------
signet=1

[signet]
# Must match the teacher's value exactly. Ask them if unsure.
signetchallenge=51

# Peer only with the teacher's node. You will optionally add
# classmates here later for the reorg exercise.
connect=teacher.example.com:38333          # <-- EDIT: teacher hostname

# No DNS seeding, no peer discovery: we do not want to leak
# outside the classroom network.
dnsseed=0
discover=0
listen=0

# Local JSON-RPC (Electrum, cpuminer, ckpool will all use this)
server=1
rpcbind=127.0.0.1
rpcallowip=127.0.0.1
rpcport=38332
rpcuser=me
rpcpassword=CHANGE_ME_TO_A_RANDOM_STRING

# We index txids to make explorer queries and Electrum work.
txindex=1
EOF
chmod 600 ~/.bitcoin/bitcoin.conf
```

**Edit** the `connect=` line to point at the teacher's hostname (or IP) and set a strong `rpcpassword`.

## Start bitcoind

Linux / WSL / macOS:

```bash
bitcoind -daemon
```

Wait 5 to 10 seconds, then:

```bash
bitcoin-cli -signet -rpcwait getblockchaininfo
```

You should see:
- `"chain": "signet"`,
- `"blocks": <number matching the teacher>`,
- `"verificationprogress": 1.0` (or very close),
- `"initialblockdownload": false`.

If `blocks` is 0, the peering did not work. See [Troubleshooting](#troubleshooting) below.

## Confirm you are peered with the teacher

```bash
bitcoin-cli -signet getpeerinfo | jq '.[] | {addr, subver, synced_blocks}'
```

You should see exactly one peer whose `addr` matches the teacher's hostname / IP.

## Explore

Try:

```bash
# How many blocks does the network have?
bitcoin-cli -signet getblockcount

# What is the latest block's hash?
bitcoin-cli -signet getbestblockhash

# What is inside the latest block?
bitcoin-cli -signet getblock $(bitcoin-cli -signet getbestblockhash) 2

# What is currently in the mempool?
bitcoin-cli -signet getrawmempool

# What is the current difficulty?
bitcoin-cli -signet getdifficulty
```

Open the teacher's explorer URL in a browser (e.g. `http://teacher.example.com/`) and confirm the latest block hash matches what `getbestblockhash` returned locally. Your node has independently verified every block; the explorer is just a UI on top of an identical view.

## Troubleshooting

### `blocks: 0` and no peers

Common causes:
1. Wrong `signetchallenge`. Compare with the teacher's info card.
2. Wrong `connect=`. Test raw reachability: `nc -zv teacher.example.com 38333`.
3. Firewall on your side blocking outbound 38333. Rare, but happens on locked-down corporate networks.

Kill the daemon and re-check the config:

```bash
bitcoin-cli -signet stop
```

Wait a moment, then start again.

### `bitcoind` refuses to start with `-signet` and a config in `bitcoin.conf`

Bitcoin Core 24+ moved chain-specific options to a `[signet]` section. If you copy examples from older tutorials with `signetchallenge=` at the top level (outside `[signet]`), the daemon rejects them. The block above has the correct layout.

### Where does the data live?

- Linux / WSL: `~/.bitcoin/signet/`
- macOS: `~/Library/Application Support/Bitcoin/signet/`

Feel free to `du -sh` it. Even after mining thousands of blocks, it should stay well under a gigabyte.

Next: [`03-electrum-wallet.md`](./03-electrum-wallet.md).
