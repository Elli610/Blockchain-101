# Teacher Setup

You are hosting a private Bitcoin network for a group of students. This directory walks you through everything you need to run before the workshop starts, in order.

## What you will run
1. **A VPS** with a public IP, at minimum:
   - 2 vCPU
   - 4 GB RAM
   - 50 GB SSD
   - Ubuntu 22.04 LTS or newer
2. **`bitcoind`** in custom-signet mode, listening on the public interface for student peers and RPC.
3. **`electrs`** indexing the chain for the block explorer and Electrum clients.
4. **`ckpool-solo`** running a stratum mining pool students can point their miners at.
5. **`mempool.space`** as the block explorer, exposed on HTTP.
6. **A faucet** helper that hands out custom-signet BTC to student addresses.

## Ports you will expose

| Port | Protocol | Purpose |
|---|---|---|
| 22 | TCP | SSH (restrict to your own IP if possible) |
| 38333 | TCP | `bitcoind` p2p (students peer here) |
| 38332 | TCP | `bitcoind` JSON-RPC (optional, only if you want to expose faucet directly) |
| 3333 | TCP | `ckpool-solo` stratum (students point their `cpuminer` here) |
| 80 / 443 | TCP | `mempool.space` HTTP |

Everything else can stay closed. Use `ufw` or your cloud provider's security-group panel.

## Order of operations

Do these in order. Each step depends on the previous one.

1. [`01-vps-baseline.md`](./01-vps-baseline.md) - harden the VPS: non-root user, SSH keys, firewall, unattended-upgrades, swap.
2. [`02-bitcoind.md`](./02-bitcoind.md) - install Bitcoin Core, configure custom signet, start the node.
3. [`03-bootstrap-mining.md`](./03-bootstrap-mining.md) - mine the first blocks so the chain has an initial coinbase supply. Uses `contrib/signet/miner`.
4. [`04-ckpool.md`](./04-ckpool.md) - install and configure ckpool-solo, expose stratum on port 3333.
5. [`05-mempool-explorer.md`](./05-mempool-explorer.md) - deploy self-hosted mempool.space (with electrs behind it) via the official docker-compose.
6. [`06-faucet.md`](./06-faucet.md) - a tiny script (or optional web form) that sends BTC to any student address on request.

## Before the workshop starts

Give students these five pieces of information (a single info card is easiest):

1. **Teacher hostname**: `teacher.example.com` (or your VPS IP).
2. **P2P endpoint** for `-addnode`: `teacher.example.com:38333`.
3. **Stratum endpoint** for pool mining: `stratum+tcp://teacher.example.com:3333`.
4. **Explorer URL**: `http://teacher.example.com/` (or your domain).
5. **Signet challenge** (the anchor that isolates this network): `51`.

## After the workshop

- Snapshot the VPS disk if you want to reuse the chain across cohorts (chain state persists in `~/.bitcoin/signet/`).
- Or `bitcoin-cli -signet stop`, wipe `~/.bitcoin/signet/`, and restart from block 0 for the next class.
