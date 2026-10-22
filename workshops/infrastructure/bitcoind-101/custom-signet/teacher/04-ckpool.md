# 04 - ckpool-solo mining pool

`ckpool-solo` is a small, fast stratum mining pool written in C. It talks to `bitcoind` over JSON-RPC (`getblocktemplate` + `submitblock`) and to miners over the stratum-v1 protocol. Students will point their `cpuminer` at this pool for the "mine on the teacher's pool" exercise.

## Build

```bash
cd ~
git clone https://bitbucket.org/ckolivas/ckpool.git
cd ckpool
./autogen.sh
./configure
make -j$(nproc)
```

The build produces `src/ckpool`. We will not `make install`; keep it in place.

## Configure

Create `~/ckpool/ckpool-solo.conf`:

```json
{
  "btcd": [
    {
      "url": "127.0.0.1:38332",
      "auth": "teacher",
      "pass": "CHANGE_ME_TO_A_LONG_RANDOM_STRING",
      "notify": true
    }
  ],
  "btcaddress": "REPLACE_WITH_A_TEACHER_ADDRESS",
  "btcsig": "/teacher-pool/",
  "serverurl": [
    "0.0.0.0:3333"
  ],
  "mindiff": 1,
  "startdiff": 1,
  "logdir": "logs",
  "loglevel": 5,
  "solo": true
}
```

- `auth` / `pass` MUST match the RPC credentials in `~/.bitcoin/bitcoin.conf`.
- `btcaddress` is where the coinbase reward is paid on any block the pool finds. Use a fresh teacher wallet address:
  ```bash
  bitcoin-cli -signet -rpcwallet=faucet getnewaddress "teacher-pool"
  ```
- `mindiff` / `startdiff` = 1 keeps share difficulty low so CPU miners produce shares quickly (useful for the classroom).
- `solo: true` puts ckpool in solo mode. Every share hitting the network target immediately submits a block; there are no share accounting or payouts. Good for a workshop where the point is to see the block get accepted.

## Systemd service

```bash
sudo tee /etc/systemd/system/ckpool.service <<'EOF'
[Unit]
Description=ckpool-solo mining pool
After=bitcoind.service
Requires=bitcoind.service

[Service]
User=bitcoin
Group=bitcoin
Type=simple
WorkingDirectory=/home/bitcoin/ckpool
ExecStart=/home/bitcoin/ckpool/src/ckpool -B -c /home/bitcoin/ckpool/ckpool-solo.conf
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now ckpool
sudo systemctl status ckpool
```

## Smoke test from the teacher's own machine

Install `cpuminer` briefly on the teacher's box (you will remove it after the smoke test) to confirm stratum works end-to-end:

```bash
sudo apt install -y cpuminer   # available on Ubuntu 22.04+
cpuminer -o stratum+tcp://127.0.0.1:3333 -u $(bitcoin-cli -signet -rpcwallet=faucet getnewaddress test) -p x -t 1
```

You should see stratum handshake logs, share submissions, and, within seconds to a few minutes, a `submitblock` succeeded log. Kill with `Ctrl+C`.

Check the block was accepted:
```bash
bitcoin-cli -signet getblockchaininfo | jq .blocks
```

The block count should have gone up.

## Firewall

Port 3333 is already open from `01-vps-baseline.md`. Confirm students can reach it:
```bash
sudo ss -ltnp | grep 3333
```

## Common pitfall: stratum through DNS

If the teacher's hostname is `teacher.example.com`, ensure it resolves for students. If you gave them a raw IP, they will need to use it directly in the stratum URL: `stratum+tcp://203.0.113.7:3333`.

Next: [`05-mempool-explorer.md`](./05-mempool-explorer.md).
