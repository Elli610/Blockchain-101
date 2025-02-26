# Bitcoin Node Setup Guide

## Prerequisites
- Ubuntu Server (20.04 or later recommended) or WSL2 on Windows (not recommended but okay for testing)
- At least 1TB of free disk space
- 6GB RAM minimum
- Stable internet connection
- SSH or physical access to your server

> These instructions are for setting up a Bitcoin node using `bitcoind` on a x86_64 Linux machine. The setup process involves downloading the Bitcoin Core software, configuring the node, and syncing with the Bitcoin network.
> Using another architecture may require different steps.

## 1. Initial Setup

### Create Download Directory
```bash
mkdir downloads
cd downloads
```

### Download Bitcoin Core
1. Visit [Bitcoin Core Downloads](https://bitcoincore.org/en/download/)
2. Download the Linux (tgz) version:
```bash
wget [bitcoin-core-download-link]  # Replace with current version link
```

### Verify and Install Bitcoin Core
1. Follow the verification instructions on [bitcoincore.org/en/downloads](https://bitcoincore.org/en/download/)
2. Extract the archive:
```bash
tar xzf bitcoin-*.0-x86_64-linux-gnu.tar.gz  # Replace * with current version
```
3. Install Bitcoin Core:
```bash
sudo install -m 0755 -o root -g root -t /usr/local/bin bitcoin-<BITCOIND_VERSION>/bin/*
```

## 2. Initial Bitcoin Core Configuration

### Start Bitcoin Core
If everything is installed correctly, you can start the Bitcoin daemon:
```bash
bitcoind -daemon
```
It should display something lik `Bitcoin Core starting`.

### Verify Installation
```bash
cd ~
cd .bitcoin
ls  # Should show Bitcoin directory contents
```

### Monitor Blockchain Download
```bash
cd ~
tail -f .bitcoin/debug.log
```

### Basic Bitcoin CLI Commands
You should already be able to run some basic commands:
```bash
bitcoin-cli getblockchaininfo
bitcoin-cli getconnectioncount
```

## 3. Configure Bitcoin Core

### Create bitcoin.conf
1. Navigate to Bitcoin directory:
```bash
cd ~/.bitcoin
```

2. Create and edit configuration file:
```bash
nano bitcoin.conf
```

3. Add the following configuration:
```ini
# Enable server mode
server=1
# Enable transaction indexing (useful for Electrum server)
txindex=1
# Run in the background
daemon=1
# Default RPC port
rpcport=8332
# Binds to all network interfaces
rpcbind=0.0.0.0
# Allows only the local machine to connect (localhost)
rpcallowip=127.0.0.1
# Allows all local IPs to connect
rpcallowip=192.0.0.0/16
# Publish ZMQ events
zmqpubrawblock=tcp://0.0.0.0:28332
zmqpubrawtx=tcp://0.0.0.0:28333
zmqpubhashblock=tcp://0.0.0.0:28334
# Grant special permissions to localhost
whitelist=127.0.0.1
```

### Setup RPC Authentication
1. Download the RPC auth script:
```bash
cd ~/downloads
wget https://raw.githubusercontent.com/bitcoin/bitcoin/master/share/rpcauth/rpcauth.py
chmod +x rpcauth.py
```

2. Generate RPC credentials:
```bash
./rpcauth.py [username] [password]  # Replace with your desired credentials
```

3. Copy the generated `rpcauth` line to your bitcoin.conf file

### Restart Bitcoin Core
```bash
bitcoin-cli stop
bitcoind
```

## 4. Setup Automatic Startup

### Create Service File
1. Create a systemd service file:
```bash
nano /etc/systemd/system/bitcoind.service
```

2. Paste the following configuration: (replace `<YOURUSERNAME>` with your linux username)
```ini
# Note that almost all daemon options could be specified in
# /etc/bitcoin/bitcoin.conf, but keep in mind those explicitly
# specified as arguments in ExecStart= will override those in the
# config file.

[Unit]
Description=Bitcoin daemon
Documentation=https://github.com/bitcoin/bitcoin/blob/master/doc/init.md

# https://www.freedesktop.org/wiki/Software/systemd/NetworkTarget/
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/bitcoind -daemon \
                            -pid=/run/bitcoind/bitcoind.pid \
                            -conf=/home/<YOURUSERNAME>/.bitcoin/bitcoin.conf \
                            -datadir=/home/<YOURUSERNAME>/.bitcoin

# Make sure the config directory is readable by the service user
PermissionsStartOnly=true

# Process management
####################

Type=notify
NotifyAccess=all
PIDFile=/run/bitcoind/bitcoind.pid

Restart=on-failure
TimeoutStartSec=infinity
TimeoutStopSec=600

# Directory creation and permissions
####################################

# Run as bitcoin:bitcoin
User=<YOURUSERNAME>

# /run/bitcoind
RuntimeDirectory=bitcoind
RuntimeDirectoryMode=0710

# /etc/bitcoin
ConfigurationDirectory=bitcoin
ConfigurationDirectoryMode=0710

# /var/lib/bitcoind
StateDirectory=bitcoind
StateDirectoryMode=0710

# Provide a private /tmp and /var/tmp.
PrivateTmp=true

# Mount /usr, /boot/ and /etc read-only for the process.
ProtectSystem=full

# Disallow the process and all of its children to gain
# new privileges through execve().
NoNewPrivileges=true

# Use a new /dev namespace only populated with API pseudo devices
# such as /dev/null, /dev/zero and /dev/random.
PrivateDevices=true

# Deny the creation of writable and executable memory mappings.
MemoryDenyWriteExecute=true

[Install]
WantedBy=multi-user.target
```

3. Enable and start service:
```bash
sudo systemctl enable bitcoind
sudo systemctl start bitcoind
```

## 5. Setup Tor Integration
See what is tor here: [torproject.org](https://www.torproject.org/)

### Install and Configure Tor
```bash
sudo apt install tor
sudo nano /etc/tor/torrc
```

Add to torrc:
```
ControlPort 9051
CookieAuthentication 1
CookieAuthFileGroupReadable 1
```

### Configure Tor Service
```bash
sudo systemctl restart tor
sudo usermod -a -G debian-tor <username>
```

### Update Bitcoin Configuration
Add to bitcoin.conf:
```ini
proxy=127.0.0.1:9050
listen=1
bind=127.0.0.1
# allow connection through ipv4, ipv6 and Tor
onlynet=ipv4
onlynet=ipv6
onlynet=onion
```

### Restart and Verify
1. Reboot system:
```bash
sudo reboot
```

2. Check connections:
```bash
bitcoin-cli getconnectioncount
```

3. If no connections, manually add a node:
- Visit [bitnodes.io/nodes](https://bitnodes.io/nodes/?q=Tor%20network%20(TOR))
- Copy an onion address
- Add to bitcoin.conf: `addnode=<onion-address>`
- Restart bitcoind: `sudo systemctl restart bitcoind`

### Verify Tor Setup
```bash
bitcoin-cli getnetworkinfo
```
Should show:
- IPv4/IPv6 reachable: true
- Onion reachable: true

## Useful Commands
```bash
bitcoin-cli getblockchaininfo  # Check blockchain sync status
bitcoin-cli getconnectioncount  # Check peer connections
bitcoin-cli gettxoutsetinfo    # Verify total supply
```

## Notes
- Initial blockchain sync may take 1 day or more
- Ensure adequate disk space throughout the sync process
- Monitor debug.log for any issues during setup
- If you have enabled ipv4 and/or ipv6, ensure your firewall allows incoming connections on port 8333. Check if you node is accessible from the internet using [bitnodes.io](https://bitnodes.io/)
