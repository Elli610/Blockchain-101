# 06 - Run your own mining pool

You have used the teacher's pool. Now you become the pool operator: install `ckpool-solo` locally, point your `cpuminer` at yourself over stratum, and mine blocks whose reward pays YOUR address, not the teacher's.

If a classmate connects their miner to your pool, they contribute hashrate to your workers list and their shares also go to blocks that pay you.

## Build ckpool

```bash
cd ~
git clone https://bitbucket.org/ckolivas/ckpool.git
cd ckpool
./autogen.sh
./configure
make -j$(nproc)   # or -j$(sysctl -n hw.ncpu) on macOS
```

The binary lives at `~/ckpool/src/ckpool`.

## Configure

Create `~/ckpool/ckpool-solo.conf`:

```json
{
  "btcd": [
    {
      "url": "127.0.0.1:38332",
      "auth": "me",
      "pass": "CHANGE_ME_TO_A_RANDOM_STRING",
      "notify": true
    }
  ],
  "btcaddress": "REPLACE_WITH_YOUR_OWN_ADDRESS",
  "btcsig": "/YOURNAME-pool/",
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

- `auth` / `pass` MUST match your local `~/.bitcoin/bitcoin.conf` RPC creds.
- `btcaddress`: get one with `bitcoin-cli -signet getnewaddress "my-pool"`. Every block your pool finds pays here.
- `btcsig` is a small tag inserted into the coinbase input, visible in the explorer. Personalise it.

## Start ckpool

```bash
cd ~/ckpool
mkdir -p logs
./src/ckpool -B -c ckpool-solo.conf
```

`-B` runs it as a daemon. Check the logs:

```bash
tail -f logs/ckpool.log
```

You should see something like:
```
Ckpool version 1.x.x starting
Backup ckdb-tables not found, continuing without
Attempting to update coinbase for signet:...
```

## Point your cpuminer at yourself

Open a second terminal:

```bash
cpuminer \
  --url=stratum+tcp://127.0.0.1:3333 \
  --user=$(bitcoin-cli -signet getnewaddress worker1).worker1 \
  --pass=x \
  --threads=$(nproc)
```

Watch shares fly by. When one meets the network target, ckpool submits the block to your local `bitcoind`, which validates and relays it to the teacher's node.

Verify:

```bash
bitcoin-cli -signet getbestblockhash
bitcoin-cli -signet getblock $(bitcoin-cli -signet getbestblockhash) 2 | jq '.tx[0].vout[0]'
```

The coinbase output should pay YOUR pool address.

## Invite a classmate

Ask a classmate to point THEIR `cpuminer` at your pool:

```bash
cpuminer --url=stratum+tcp://<your-hostname-or-IP>:3333 --user=<your-address>.friend --pass=x
```

Two challenges to solve first:
1. **Your machine must be reachable**. If you are on a laptop behind NAT, they cannot reach port 3333 from outside your network. Options:
   - Run this exercise on the same LAN.
   - Or use SSH port-forwarding: `ssh -R 3334:localhost:3333 friend@teacher.example.com`, then friend does `--url=stratum+tcp://teacher.example.com:3334`.
   - Or use a tool like `ngrok` / `tailscale`.
2. **Your bitcoind must be reachable to gossip blocks back**. This is already true because your bitcoind is `connect=`'d to the teacher. Your pool submits blocks to your bitcoind; your bitcoind relays them to the teacher; the teacher relays to everyone else.

Once connected, you should see:

```
[ckpool] client 1: sub -> ... auth OK
[ckpool] client 2: sub -> ... auth OK
[ckpool] pool_stats: ... users=2 workers=2 ...
```

Both of you produce shares; blocks pay you.

## What comes next in the real world

- **Reward accounting**: real pools track shares per miner and pay them proportionally (PPLNS, PPS+, FPPS, ...). ckpool has a pool-mode (not solo) that does simple share accounting; running that is a follow-up exercise.
- **Payout dispatching**: real pools batch payouts (once per day, once per block, etc.) via signed txs from a hot wallet.
- **Getblocktemplate performance**: at real-world hashrates, pool operators care about how fast bitcoind can produce a new template on each new tip. `submitblock` latency matters too.
- **Stratum v2**: the modern replacement for stratum-v1. Different message format, per-worker template negotiation, encryption. `ckpool` speaks v1; production pools are migrating.

## Stop everything

```bash
# stop cpuminer
Ctrl+C in that terminal

# stop ckpool
pkill -f ckpool

# stop bitcoind (optional; you can leave it running for future sessions)
bitcoin-cli -signet stop
```

## Wrap-up

You have:
- run a validating Bitcoin node,
- run a wallet against it,
- solo mined a block on your own CPU,
- mined shares to someone else's pool,
- operated your own pool that accepted a classmate's miner.

That is the entire node + wallet + mining stack, on real Bitcoin Core software, without a 1 TB blockchain download.

For the mainnet experience (real IBD, real peer discovery, real fee-market dynamics, and a network nobody controls), see [`../../mainnet/`](../../mainnet/).
