# Student Setup

You are going to run your own Bitcoin node, connect it to a private teacher-hosted network, use an Electrum wallet against it, and then become a miner.

## What you need

- A laptop or desktop with:
  - macOS, Linux, or Windows 11 with WSL2,
  - roughly **50 GB free disk** (comfortable; the chain itself is much smaller),
  - 4 GB RAM,
  - a working internet connection.
- The five pieces of info the teacher hands out:
  1. **Teacher hostname** (e.g. `teacher.example.com`),
  2. **P2P endpoint** (`teacher.example.com:38333`),
  3. **Stratum endpoint** (`stratum+tcp://teacher.example.com:3333`),
  4. **Explorer URL** (`http://teacher.example.com/`),
  5. **Signet challenge value** (`51`).

## What you will build

1. [`01-bitcoind-install.md`](./01-bitcoind-install.md) - install Bitcoin Core natively on your OS.
2. [`02-connect-to-teacher.md`](./02-connect-to-teacher.md) - configure the custom-signet challenge and peer with the teacher's node.
3. [`03-electrum-wallet.md`](./03-electrum-wallet.md) - install the Electrum wallet, point it at your own node, receive faucet coins, send a tx, watch it confirm.
4. [`04-solo-mining.md`](./04-solo-mining.md) - run `cpuminer` against your own `bitcoind`'s `getblocktemplate` and find a block yourself.
5. [`05-pool-mining-on-teacher.md`](./05-pool-mining-on-teacher.md) - point `cpuminer` at the teacher's ckpool over stratum, submit shares, wait for a block.
6. [`06-run-your-own-pool.md`](./06-run-your-own-pool.md) - install ckpool locally, point your `cpuminer` at it, invite a classmate's miner to join you.

Complete them in order. Each one depends on the previous.

## Learning outcomes

By the end you can:
- explain what `-signetchallenge` does and why it isolates a network,
- run `bitcoin-cli` fluently for wallet, mempool, and chain introspection,
- describe the difference between `bitcoind` (validating node) and Electrum (wallet + server model),
- describe the flow `miner -> getblocktemplate -> stratum share -> submitblock`,
- explain the difference between solo mining and pool mining in operational terms,
- read a block, a transaction, and a mempool state in the explorer.
