# 05 - mempool.space explorer

Self-host [mempool.space](https://github.com/mempool/mempool) so students can visualise the chain, mempool, and their transactions in a familiar UI.

The full stack is: a Rust backend + Node.js API + Angular frontend + MariaDB, all fronted by an nginx reverse proxy. The project ships an official docker-compose that wires everything up.

## Fetch the docker-compose

```bash
cd ~
git clone https://github.com/mempool/mempool.git
cd mempool/docker
```

Ignore the pre-built `docker-compose.yml`; we tweak the environment file directly.

## Configure

Create `~/mempool/docker/data/` (docker-compose expects this) and create an override file:

```bash
mkdir -p data
```

Edit `docker-compose.yml`. In the `api` service, add environment overrides for our custom signet:

```yaml
services:
  api:
    environment:
      MEMPOOL_NETWORK: "signet"
      MEMPOOL_BACKEND: "electrum"
      CORE_RPC_HOST: "172.17.0.1"        # docker's default host bridge
      CORE_RPC_PORT: "38332"
      CORE_RPC_USERNAME: "teacher"
      CORE_RPC_PASSWORD: "CHANGE_ME_TO_A_LONG_RANDOM_STRING"
      ELECTRUM_HOST: "electrs"
      ELECTRUM_PORT: "60401"
      ELECTRUM_TLS: "false"
```

Add an `electrs` service alongside:

```yaml
  electrs:
    image: mempool/electrs:v0.4.1
    restart: unless-stopped
    environment:
      NETWORK: signet
      DAEMON_RPC_ADDR: "172.17.0.1:38332"
      DAEMON_P2P_ADDR: "172.17.0.1:38333"
      COOKIE: "teacher:CHANGE_ME_TO_A_LONG_RANDOM_STRING"
    ports:
      - "60401:60401"
    volumes:
      - ./data/electrs:/data
```

## Allow bitcoind RPC from Docker

Docker containers reach the host at `172.17.0.1`. Update `~/.bitcoin/bitcoin.conf`:

```
rpcbind=127.0.0.1
rpcbind=172.17.0.1
rpcallowip=127.0.0.1
rpcallowip=172.17.0.0/16
```

Restart bitcoind:
```bash
sudo systemctl restart bitcoind
```

## Start the stack

```bash
cd ~/mempool/docker
docker compose up -d
docker compose logs -f api
```

Wait for the API to log `Mempool sync complete` (typically a minute or two).

## Test

From your laptop:
```bash
curl http://teacher.example.com/api/v1/difficulty-adjustment
```
should return JSON.

Open `http://teacher.example.com/` in a browser. You should see the mempool.space UI with your custom signet blocks.

## Add HTTPS (optional, recommended)

Install `caddy` for one-line automatic TLS:

```bash
sudo apt install -y caddy
sudo tee /etc/caddy/Caddyfile <<'EOF'
teacher.example.com {
    reverse_proxy 127.0.0.1:8999
}
EOF
sudo systemctl restart caddy
```

(The mempool.space frontend is exposed on port 8999 by the docker-compose stack; adjust if your override changed it.)

## Common pitfalls

- **Custom signet challenge**: the `electrs` image must accept your custom-signet magic bytes. As of mempool/electrs 0.4.x, this Just Works because `electrs` reads chain params from bitcoind, not from a hard-coded table.
- **Firewall**: ports 80/443 are already open from `01-vps-baseline.md`.
- **First-sync CPU**: mempool.space indexes every block for the mempool graph. This is fast on our tiny chain but can spike CPU briefly.

Next: [`06-faucet.md`](./06-faucet.md).
