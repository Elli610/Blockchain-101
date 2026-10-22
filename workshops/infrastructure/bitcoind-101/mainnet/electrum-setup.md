# Electrum Server Setup Guide

## Introduction
An Electrum server provides an interface between Bitcoin Core and Electrum wallets. It indexes the Bitcoin blockchain and provides efficient queries for wallet clients. There are several implementations available:

- [**ElectrumX**](https://github.com/spesmilo/electrumx): The original reference implementation in Python
- [**Electrs**](https://github.com/romanz/electrs): A newer, efficient implementation in Rust
- [**Fulcrum**](https://github.com/cculianu/Fulcrum): A high-performance C++ implementation with good memory efficiency

This guide will focus on setting up Fulcrum, which offers a good balance of performance and resource usage.

## Prerequisites
- A fully synced Bitcoin Core node (see bitcoind-setup.md)
- At least 100GB of additional disk space for the Electrum index
- 8GB RAM recommended (minimum 4GB with reduced performance)

## 1. Download and Install Fulcrum

### Get the Latest Release
```bash
cd ~/downloads
wget [fulcrum-release-link]  # Get latest from https://github.com/cculianu/Fulcrum/releases
```

> You can also build Fulcrum from source by [cloning the repository and following the build instructions](https://github.com/cculianu/Fulcrum).

### Create Directories
```bash
cd ~
mkdir fulcrum       # For Fulcrum binaries
mkdir fulcrum_db    # For the database
```

### Extract and Move Files
```bash
cd ~/downloads
tar xvf Fulcrum-*.tar.gz
mv Fulcrum-*-x86_64-linux/* /home/<username>/fulcrum
```

## 2. Configure SSL

### Generate SSL Certificates
```bash
cd ~/fulcrum
openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem
```
> Note: You can leave all certificate questions blank by pressing Enter.

## 3. Configure Fulcrum

### Setup Configuration File
```bash
cd ~/fulcrum
mv fulcrum-example-config.conf fulcrum.conf
nano fulcrum.conf
```

Update the following settings (do not add them randomly in the file. Otherwise fulcrum may not start):
```ini
# Basic Options
datadir = /home/<username>/fulcrum_db
rpcuser = <your-bitcoin-rpc-username> # Must match Bitcoin Core rpcuser. If you used the python script in the previous workshop, this is the user you set as argument when you ran the script
rpcpassword = <your-bitcoin-rpc-password> # Must match Bitcoin Core rpcpassword. If you used the python script in the previous workshop, this is the password you set as argument when you ran the script

# SSL Configuration
ssl = 0.0.0.0:50002
cert = /home/<username>/fulcrum/cert.pem
key = /home/<username>/fulcrum/key.pem

# Performance Settings
peering = false
# Uses 5GB RAM for initial sync. Adjust based on available memory. Greater values can speed up the sync process.
fast-sync = 5000 
```

## 4. Create Systemd Service

### Create Service File
```bash
sudo nano /etc/systemd/system/fulcrum.service
```

Add the following content:
```ini
[Unit]
Description=Fulcrum
After=network.target

[Service]
ExecStart=/home/<USERNAME>/fulcrum/Fulcrum /home/<USERNAME>/fulcrum/fulcrum.conf
User=<USERNAME>
LimitNOFILE=8192
TimeoutStopSec=30min

[Install]
WantedBy=multi-user.target
```

### Enable and Start Service
```bash
sudo systemctl enable fulcrum.service
sudo systemctl start fulcrum.service
```

### Monitor Progress
```bash
# Check service status
sudo systemctl status fulcrum.service

# Monitor logs
journalctl -fu fulcrum.service
```

## Add banner to Fulcrum server
Create a custom banner for your client by adding a banner. 
Feel free to customize it as you wish !

```bash
sudo nano /data/fulcrum/banner.txt
```

Paste your own creation into banner.txt. Save and exit
Example:
```text
    ____      __
   / __/_  __/ /___________  ______ ___
  / /_/ / / / / ___/ ___/ / / / __ `__ \
 / __/ /_/ / / /__/ /  / /_/ / / / / / /
/_/  \__,_/_/\___/_/   \__,_/_/ /_/ /_/

server version: $SERVER_VERSION
bitcoind version: $DAEMON_VERSION
```

Open fulcrum.conf
```bash
sudo nano /data/fulcrum/fulcrum.conf
```

Specify path to banner at the end of your configuration file. Save and exit
```
# Banner path
banner = /data/fulcrum/banner.txt
```

Restart Fulcrum

```
sudo systemctl restart fulcrum.service
```

Now you should see your banner when connecting to Fulcrum with supported wallet (ex. Sparrow)

## 5. Connecting to Your Server

**Once your server is synced and running**, you can connect to it from Electrum wallets.

### Default Ports
- SSL: 50002
- TCP: 50001 (if enabled)

### From Electrum Wallet
1. Go to Tools → Network
2. Select "Server"
3. Enter your server's IP/hostname and port (50002)
4. Check "Use SSL"

### From Sparrow Wallet
1. Go to Preferences → Server
2. Select "Private Electrum"
3. Enter your server details:
   - Host: your-server-ip
   - Port: 50002
   - Use SSL checkbox: enabled

## Notes and Troubleshooting
- Initial sync can take multiple days depending on your hardware
- Monitor disk space usage during sync
- If sync seems stuck, check logs for errors
- Ensure Bitcoin Core is fully synced before starting Fulcrum
- For security, consider restricting access to your server using a firewall

## Performance Optimization
- Increase `fast-sync` value if you have more RAM available
- Consider using an SSD for the database directory
- Monitor system resources during operation
- Adjust `max_sessions` and `worker_threads` based on your use case

## Security Considerations
- Keep your system updated
- Use strong passwords
- Consider implementing firewall rules
- Regularly monitor logs for suspicious activity


## References
- [Fulcrum GitHub Repository](https://github.com/cculianu/Fulcrum)
- [Citadel.org](https://citadels.org/install-fulcrum-server-on-ubuntu-server-upgrade-your-bitcoin-node/)
- [Electrum Server Documentation](https://electrumx.readthedocs.io/en/latest/)
