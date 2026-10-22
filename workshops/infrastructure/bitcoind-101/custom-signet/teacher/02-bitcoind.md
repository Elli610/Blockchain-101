# 02 - Bitcoin Core, custom-signet mode

## Install Bitcoin Core 28.0

We install from the official release tarball so students can reproduce the exact same versions.

```bash
cd /tmp
BITCOIN_VERSION=28.0
wget https://bitcoincore.org/bin/bitcoin-core-${BITCOIN_VERSION}/bitcoin-${BITCOIN_VERSION}-x86_64-linux-gnu.tar.gz
wget https://bitcoincore.org/bin/bitcoin-core-${BITCOIN_VERSION}/SHA256SUMS
wget https://bitcoincore.org/bin/bitcoin-core-${BITCOIN_VERSION}/SHA256SUMS.asc

# Verify hash
grep bitcoin-${BITCOIN_VERSION}-x86_64-linux-gnu.tar.gz SHA256SUMS | sha256sum --check

# Extract to /opt
sudo tar -xzf bitcoin-${BITCOIN_VERSION}-x86_64-linux-gnu.tar.gz -C /opt
sudo ln -sf /opt/bitcoin-${BITCOIN_VERSION}/bin/bitcoind /usr/local/bin/bitcoind
sudo ln -sf /opt/bitcoin-${BITCOIN_VERSION}/bin/bitcoin-cli /usr/local/bin/bitcoin-cli
sudo ln -sf /opt/bitcoin-${BITCOIN_VERSION}/bin/bitcoin-util /usr/local/bin/bitcoin-util
```

Verify:
```bash
bitcoind --version
```

## Configure

Create the data directory and config file:

```bash
mkdir -p ~/.bitcoin
cat > ~/.bitcoin/bitcoin.conf <<'EOF'
# ------------------------------------------------------------
# Custom signet (private Bitcoin network for the workshop)
# ------------------------------------------------------------
signet=1

# Custom challenge: 51 == OP_TRUE == anyone-can-mine.
# The magic bytes for this network are derived from this value,
# so it is fully isolated from public signet and mainnet.
[signet]
signetchallenge=51

# Networking
port=38333
listen=1
bind=0.0.0.0
externalip=teacher.example.com   # <-- EDIT: replace with your public hostname or IP
discover=0
dnsseed=0
onlynet=ipv4

# JSON-RPC (bind to loopback only; the faucet + ckpool + electrs
# all run on the same host)
server=1
rpcbind=127.0.0.1
rpcallowip=127.0.0.1
rpcport=38332
rpcuser=teacher
rpcpassword=CHANGE_ME_TO_A_LONG_RANDOM_STRING

# Indexes needed by electrs and mempool.space
txindex=1
blockfilterindex=1
peerbloomfilters=1

# Allow miners to hit getblocktemplate with a small fee floor
minrelaytxfee=0.00001

# Keep things quiet in the log
debug=none
EOF
chmod 600 ~/.bitcoin/bitcoin.conf
```

**Edit the `externalip=` line** and set a strong `rpcpassword`.

## Systemd service

```bash
sudo tee /etc/systemd/system/bitcoind.service <<'EOF'
[Unit]
Description=Bitcoin Core (custom signet)
After=network-online.target
Wants=network-online.target

[Service]
User=bitcoin
Group=bitcoin
Type=simple
ExecStart=/usr/local/bin/bitcoind -daemon=0
Restart=on-failure
TimeoutStopSec=600
KillMode=mixed

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now bitcoind
sudo systemctl status bitcoind
```

Wait a few seconds, then confirm:

```bash
bitcoin-cli -signet -rpcwait getblockchaininfo
```

You should see `"chain": "signet"`, `"blocks": 0`, and a signet-specific `bestblockhash`.

## Verify isolation

Ask `bitcoind` how many peers it has:
```bash
bitcoin-cli -signet getpeerinfo | jq length
```

The answer should be `0` for now. Because DNS seeds are off and no addnodes are configured, and because our `signetchallenge` differs from public signet's, no peer can reach us yet.

## Common pitfall: matching challenge everywhere

Every student and every teacher-side service that speaks Bitcoin (bitcoind, electrs, mempool.space's backend) MUST use `signetchallenge=51`. If one of them uses a different value or uses default signet, it will silently reject every block the others produce.

Next: [`03-bootstrap-mining.md`](./03-bootstrap-mining.md).
