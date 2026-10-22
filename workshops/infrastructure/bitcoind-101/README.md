# Bitcoind 101

This workshop teaches you how to set up and operate a Bitcoin node, an Electrum server, and, in the sandbox variant, a mining pool.

It ships in **two flavours**. Pick the one that matches your goals and hardware.

## The two flavours

### [`mainnet/`](./mainnet/) - the real Bitcoin network
The original workshop. You install Bitcoin Core, sync the real chain, and run a real Electrum server.

Use this variant if you want:
- the authentic initial block download (IBD) experience,
- to operate a node that participates in the actual Bitcoin network,
- to interact with real-money wallets and real blocks.

Requirements:
- **1 TB of free disk space** for the blockchain and Electrum index,
- 6 GB RAM,
- multi-day sync time,
- a stable internet connection.

Trade-off: the barrier to entry (disk, time, bandwidth) is high, and you cannot demonstrate mining, reorgs, or block-template mechanics on real hardware.

### [`custom-signet/`](./custom-signet/) - a private Bitcoin network with real proof-of-work
A private, teacher-hosted Bitcoin network built on Bitcoin Core's **signet with a custom challenge** (`signetchallenge=51`, i.e. `OP_TRUE`). The software is unmodified Bitcoin Core release binaries. The chain is fresh, so it stays tiny.

Why this exists:
- **No 1 TB requirement.** The chain fits in a few hundred megabytes.
- **Instant sync.** Peers with the teacher's node once and catches up in seconds.
- **Real proof-of-work.** Blocks require a valid PoW below the network target, exactly like mainnet. Difficulty retargets every 2016 blocks.
- **Real mining pipeline.** `getblocktemplate`, stratum pools, `submitblock` are unchanged. You can run `cpuminer`, `ckpool`, and any other standard mining tool.
- **Isolated.** A custom `signetchallenge` produces its own genesis-and-magic space; your node cannot accidentally connect to public signet or mainnet.

Requirements:
- 50 GB disk (comfortable),
- 4 GB RAM,
- a network connection to the teacher's VPS,
- a modern CPU (any laptop can mine in this environment).

Use this variant if you want to:
- learn Bitcoin node operations without a week-long IBD,
- run and understand a mining pool,
- observe reorgs, difficulty retargets, and mempool dynamics on a chain you control.

Trade-off: you do not experience real IBD or real peer discovery. The `custom-signet/mainnet-appendix.md` file at the end lists what mainnet teaches that this variant does not.

## Which should I pick?

| If you want to... | Use |
|---|---|
| Learn Bitcoin infrastructure end-to-end, quickly, on a laptop | `custom-signet/` |
| Understand mining, block templates, stratum, and pool operations hands-on | `custom-signet/` |
| Actually run a node on the real Bitcoin network | `mainnet/` |
| Do both | `custom-signet/` first (fast), `mainnet/` after (deep) |

Most students should start with `custom-signet/`.
