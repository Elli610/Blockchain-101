# 05 - Mine on the teacher's pool

You already know what solo mining looks like. Now you will mine on someone else's pool. The teacher is running `ckpool-solo` and has told you the stratum endpoint (something like `stratum+tcp://teacher.example.com:3333`).

## What changes vs solo

- You do NOT talk to your own `bitcoind` for block templates any more. The pool does.
- Your `cpuminer` talks to the pool over the **stratum-v1** protocol (TCP + line-delimited JSON-RPC).
- The pool hands you a template with a lower "share difficulty" than the network target. You send back every valid **share** you find (partial solutions below the share difficulty).
- Whenever a share also happens to be below the actual network target, it is a full block, and the pool submits it to its own `bitcoind`. All shares (block or not) count toward reward accounting.

In `ckpool-solo` specifically, there is no reward accounting: any block found immediately pays the pool operator (the teacher) rather than the miner. This is fine for a workshop: you will observe stratum in action, but the "who gets the reward" story is only interesting when you run your own pool (next chapter).

## Point your miner at the teacher's pool

Get a fresh mining name (any string; it acts as your identifier at the pool). Then:

```bash
cpuminer \
  --url=stratum+tcp://teacher.example.com:3333 \
  --user=$(bitcoin-cli -signet getnewaddress mining-pool).<your-nickname> \
  --pass=x \
  --threads=$(nproc)
```

Notes:
- `--user` on ckpool is conventionally `<btc-address>.<worker-name>`. The address doesn't strictly matter here because ckpool-solo pays the pool operator, but the format is what the stratum server expects.
- Replace `<your-nickname>` with your name so the teacher's dashboard can identify who is mining.

## Read the stratum handshake

Watch cpuminer's output. You will see stratum messages fly past:

```
[timestamp] Stratum requested work restart
[timestamp] cpuminer 2.5.1
[timestamp] Starting Stratum on stratum+tcp://teacher.example.com:3333
[timestamp] Stratum authorised (subscription: ..., extranonce1: ..., extranonce2_size: 4)
[timestamp] Stratum difficulty set to 1
[timestamp] CPU #0: 2500 khash/s
[timestamp] accepted: 1/1 (100.00%), 2500 khash/s
[timestamp] accepted: 2/2 (100.00%), 2500 khash/s
```

Each "accepted" line is a share you found that met the pool's share difficulty. Most shares are NOT blocks; they just prove you are doing work.

## Watch the teacher's explorer for a block from your worker

On `http://teacher.example.com/` open the pool's status page (`http://teacher.example.com/pool/` if enabled, or ask the teacher which URL exposes ckpool's `pool.status`). You should see your worker listed with a hashrate.

When any worker on the pool finds a full block, the block appears in the explorer. Refresh, look at the latest block's coinbase output: it pays the teacher's `btcaddress` from `ckpool-solo.conf`.

## Stop cpuminer

`Ctrl+C`.

## Why did you even want a pool?

For a laptop CPU on our custom signet at difficulty 1, the answer is "you did not." But two things are worth internalising:
1. On mainnet, no single miner finds blocks alone. Pools smooth income: many small shares -> steady payouts -> predictable revenue.
2. Stratum is what real ASICs speak. Understanding the message flow (`mining.subscribe`, `mining.authorize`, `mining.notify`, `mining.submit`) matters if you ever build against mining infrastructure.

If you want to see the raw stratum wire protocol, run cpuminer with `--protocol-dump`:

```bash
cpuminer --url=stratum+tcp://teacher.example.com:3333 --user=... --pass=x --protocol-dump
```

Every line prefixed `[stratum]` is a real message on the wire.

Next: [`06-run-your-own-pool.md`](./06-run-your-own-pool.md).
