# 01 - Install Bitcoin Core

Install Bitcoin Core 28.0 (or newer) natively on your OS. The custom-signet configuration lives in a config file you will write in the next chapter; here we only install the software.

Pick the section that matches your OS.

## Linux (Ubuntu / Debian)

```bash
cd /tmp
BITCOIN_VERSION=28.0
wget https://bitcoincore.org/bin/bitcoin-core-${BITCOIN_VERSION}/bitcoin-${BITCOIN_VERSION}-x86_64-linux-gnu.tar.gz
wget https://bitcoincore.org/bin/bitcoin-core-${BITCOIN_VERSION}/SHA256SUMS
grep bitcoin-${BITCOIN_VERSION}-x86_64-linux-gnu.tar.gz SHA256SUMS | sha256sum --check

sudo tar -xzf bitcoin-${BITCOIN_VERSION}-x86_64-linux-gnu.tar.gz -C /opt
sudo ln -sf /opt/bitcoin-${BITCOIN_VERSION}/bin/bitcoind /usr/local/bin/bitcoind
sudo ln -sf /opt/bitcoin-${BITCOIN_VERSION}/bin/bitcoin-cli /usr/local/bin/bitcoin-cli
sudo ln -sf /opt/bitcoin-${BITCOIN_VERSION}/bin/bitcoin-util /usr/local/bin/bitcoin-util
```

Verify:
```bash
bitcoind --version
```

## macOS

Two options; both fine.

**Homebrew**:
```bash
brew install bitcoin
```

**Official binary**:
```bash
cd /tmp
BITCOIN_VERSION=28.0
# For Apple Silicon
curl -O https://bitcoincore.org/bin/bitcoin-core-${BITCOIN_VERSION}/bitcoin-${BITCOIN_VERSION}-arm64-apple-darwin.tar.gz
curl -O https://bitcoincore.org/bin/bitcoin-core-${BITCOIN_VERSION}/SHA256SUMS
grep bitcoin-${BITCOIN_VERSION}-arm64-apple-darwin.tar.gz SHA256SUMS | shasum -a 256 --check

sudo tar -xzf bitcoin-${BITCOIN_VERSION}-arm64-apple-darwin.tar.gz -C /opt
sudo ln -sf /opt/bitcoin-${BITCOIN_VERSION}/bin/bitcoind /usr/local/bin/bitcoind
sudo ln -sf /opt/bitcoin-${BITCOIN_VERSION}/bin/bitcoin-cli /usr/local/bin/bitcoin-cli
sudo ln -sf /opt/bitcoin-${BITCOIN_VERSION}/bin/bitcoin-util /usr/local/bin/bitcoin-util
```

For Intel Macs, replace `arm64-apple-darwin` with `x86_64-apple-darwin`.

## Windows (WSL2)

Do NOT use the native Windows `.exe` for this workshop. Install Ubuntu on WSL2, then follow the Linux instructions from inside the WSL shell:

```powershell
# One-time, in PowerShell as Administrator
wsl --install -d Ubuntu-22.04
```

Reboot if prompted. Open the "Ubuntu" app from the Start menu. From that shell:

```bash
sudo apt update
sudo apt install -y wget curl gpg
# then follow the Linux section above
```

Notes for WSL:
- Store `~/.bitcoin/` on the WSL filesystem (default), NOT on `/mnt/c/...`. Disk performance on the Windows filesystem is dramatically worse.
- Windows Defender should be told to exclude your WSL Bitcoin data directory for the same reason.

## Verify the install

Every OS, from a terminal:

```bash
bitcoind --version
bitcoin-cli --help | head -5
bitcoin-util --help | head -5
```

All three commands must be on your `PATH`. If any is missing, re-check the symlinks (Linux/macOS) or WSL install (Windows).

## Do NOT start bitcoind yet

If you run `bitcoind` at this point with no config, it will start syncing MAINNET and immediately start consuming disk. Move on to the next chapter to write the custom-signet configuration first.

Next: [`02-connect-to-teacher.md`](./02-connect-to-teacher.md).
