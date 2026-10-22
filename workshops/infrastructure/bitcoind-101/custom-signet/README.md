# Custom Signet Bitcoin Workshop

A private, teacher-hosted Bitcoin network with real proof-of-work, running on unmodified Bitcoin Core release binaries. Ideal for teaching the entire node + wallet + mining stack without a 1 TB blockchain download.

## How the network is built

### Signet, with a custom challenge
Signet is one of Bitcoin Core's built-in chains, alongside mainnet, testnet, and regtest. Every signet block must satisfy two conditions:
1. A valid proof-of-work below the current network target (same rule as mainnet).
2. A "challenge script" that block-template constructors must satisfy.

Bitcoin Core lets you override the challenge with the `-signetchallenge=<hex>` option. When you use a custom challenge, **the network magic and message prefix are derived from that challenge**, which means:
- your node cannot connect to public signet,
- your node cannot connect to mainnet,
- only nodes running the same `signetchallenge` will accept your blocks and be accepted by yours.

For this workshop, we set the challenge to `51`, which is Bitcoin Script's `OP_TRUE`. That means any scriptSig satisfies it (even an empty one), so **no signer key is required** and anyone with hashrate can mine.

The result is a completely isolated Bitcoin network:
- Real Bitcoin Core software, no patches, no forks.
- Real proof-of-work, real difficulty retarget every 2016 blocks.
- Fresh genesis, empty UTXO set, tiny disk footprint.
- Real `getblocktemplate`, real stratum, real `submitblock`.
- Anyone in the class can mine on a CPU.

### Why it is useful for teaching
Everything you can teach on mainnet, you can teach here, faster and cheaper: RPC introspection, wallet management, Electrum-protocol clients, fee estimation basics, mempool inspection, PSBT.

Plus a few things you **cannot** demonstrate on mainnet:
- mining a block yourself on a laptop CPU,
- running your own mining pool and watching stratum shares stream in,
- forcing a reorg on demand,
- observing a difficulty retarget in minutes instead of two weeks.

## Layout

```
custom-signet/
├── README.md                (this file)
├── teacher/                 (run once by the instructor on a VPS)
│   ├── README.md
│   ├── 01-vps-baseline.md
│   ├── 02-bitcoind.md
│   ├── 03-bootstrap-mining.md
│   ├── 04-ckpool.md
│   ├── 05-mempool-explorer.md
│   └── 06-faucet.md
└── student/                 (run by every student on their own machine)
    ├── README.md
    ├── 01-bitcoind-install.md
    ├── 02-connect-to-teacher.md
    ├── 03-electrum-wallet.md
    ├── 04-solo-mining.md
    ├── 05-pool-mining-on-teacher.md
    └── 06-run-your-own-pool.md
```

## Which side are you?

**Instructor / person hosting the network**: start at [`teacher/README.md`](./teacher/README.md). You need a VPS. Complete the six teacher guides in order before the workshop begins.

**Student**: start at [`student/README.md`](./student/README.md). You need a laptop with a modern CPU, roughly 50 GB free disk, and the teacher's public endpoint.

## Software versions used in this workshop

Pin these to avoid interop surprises. Newer versions almost always work; these are the versions the guides have been tested against.

| Component | Version |
|---|---|
| Bitcoin Core | 28.0 or newer |
| cpuminer (pooler/cpuminer) | 2.5.1 |
| ckpool-solo | current master |
| Electrum wallet | 4.5.5 or newer |
| electrs | 0.10.x |
| mempool.space (self-hosted) | v3.x |

## What this variant does NOT teach

Real IBD (initial block download) with tens of thousands of peers, real peer discovery, real fee estimation from a mempool with actual demand pressure, and the operational feel of a chain nobody controls. If any of those matter to you, see [`../mainnet/`](../mainnet/) after finishing here.
