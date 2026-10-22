# 01 - VPS Baseline

Bring a fresh Ubuntu 22.04 LTS (or 24.04) VPS to a reasonable security and maintenance baseline before installing anything Bitcoin-related.

## 1. Create a non-root user

Log in as root, then:

```bash
adduser bitcoin
usermod -aG sudo bitcoin
mkdir -p /home/bitcoin/.ssh
cp /root/.ssh/authorized_keys /home/bitcoin/.ssh/authorized_keys
chown -R bitcoin:bitcoin /home/bitcoin/.ssh
chmod 700 /home/bitcoin/.ssh
chmod 600 /home/bitcoin/.ssh/authorized_keys
```

Log out, log back in as `bitcoin`. Every command from here on runs as this user (use `sudo` where needed).

## 2. Disable password SSH and root login

Edit `/etc/ssh/sshd_config`:

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

Reload:

```bash
sudo systemctl reload ssh
```

## 3. Firewall (UFW)

```bash
sudo apt update
sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing

sudo ufw allow 22/tcp        comment 'SSH'
sudo ufw allow 38333/tcp     comment 'bitcoind p2p (signet)'
sudo ufw allow 3333/tcp      comment 'ckpool stratum'
sudo ufw allow 80/tcp        comment 'mempool.space HTTP'
sudo ufw allow 443/tcp       comment 'mempool.space HTTPS'

sudo ufw enable
sudo ufw status verbose
```

Do NOT open port 38332 (JSON-RPC) to the public. RPC access is for the faucet, which will run on the same host and use `127.0.0.1`.

## 4. Unattended upgrades

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

## 5. Swap file (only if you have less than 4 GB RAM)

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 6. Prerequisites for the following steps

```bash
sudo apt install -y curl wget gnupg jq build-essential git \
    autoconf automake libtool pkg-config \
    libssl-dev libcurl4-openssl-dev libjansson-dev \
    docker.io docker-compose-v2
sudo usermod -aG docker bitcoin
```

Log out and back in for the `docker` group membership to take effect.

## 7. DNS record (optional but recommended)

Point `teacher.example.com` (pick your own subdomain) at the VPS's public IP. Everything downstream is easier to hand out to students as a hostname than as a raw IP.

Next: [`02-bitcoind.md`](./02-bitcoind.md).
