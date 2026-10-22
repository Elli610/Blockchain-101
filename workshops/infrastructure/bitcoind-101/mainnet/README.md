# Bitcoind 101

## Introduction
Welcome to this hands-on workshop that will guide you through setting up and managing your own Bitcoin node! This workshop is split into two main parts:
1. Setting up and interacting with a Bitcoin node (bitcoind)
2. Deploying and managing an Electrum server

This workshop is designed for developers interested in understanding Bitcoin's infrastructure layer and gaining practical experience with node operation.

## Prerequisites
- Basic understanding of command line operations
- Familiarity with Bitcoin concepts
- A machine with at least:
  - 1TB of free disk space (for blockchain data and electrum server) -> Be aware this is a minimum requirement, the Bitcoin blockchain is growing and you may need more space in the future
  - 6GB RAM
  - Stable internet connection
  - Linux (Ubuntu 20.04 or later recommended or wsl2 on Windows)
  -  SSH or physical access to your server

## Workshop Structure
The workshop is divided into two main components:
- Part 1: Bitcoin Node Setup ([`bitcoind-setup.md`](./bitcoind-setup.md))
  - Installing bitcoind
  - Configuring your node
  - Syncing with the network
  - Basic node operations and monitoring
  - Interacting with your node using bitcoin-cli

> Note: Syncing the Bitcoin blockchain can take several days. Ensure you have enough disk space and a stable internet connection before starting.

- Part 2: Electrum Server Setup ([`electrum-setup.md`](./electrum-setup.md))
  - Installing Electrum Server
  - Connecting to your Bitcoin node
  - Server configuration
  - Managing and monitoring your Electrum server
  - Connecting Electrum wallet to your server

> Note: The Electrum server setup will have to sync with the Bitcoin node, which can take multiple days depending on your hardware.

## Getting Started
1. Follow the instructions in `bitcoind-setup.md` for Part 1
2. Once your Bitcoin node is fully synced, proceed to `electrum-setup.md` for Part 2

## Learning Objectives
After completing this workshop, you will:
- Understand how to set up and maintain a Bitcoin node
- Know how to interact with the Bitcoin network directly
- Be able to run your own Electrum server
- Understand the relationship between Bitcoin nodes and Electrum servers
- Have hands-on experience with Bitcoin's infrastructure layer

## Important Notes
- Full synchronization of the Bitcoin blockchain can take several days
- Ensure you have adequate disk space before starting
- The setup process requires following security best practices
- Some commands may require sudo privileges

## Troubleshooting
Common issues and their solutions are documented in each respective guide. If you encounter problems not covered in the documentation, please open an issue in this repository.

## Contributing
Found a bug or want to improve the workshop? Feel free to:
1. Fork the repository
2. Create a branch for your changes
3. Submit a pull request with your improvements

## Additional Resources
- [Bitcoin Core Documentation](https://bitcoin.org/en/full-node)
- [Electrum Documentation](https://electrum.readthedocs.io/)
- [Bitcoin Developer Guide](https://developer.bitcoin.org/)

The best website I found to easily setup a bitcoin node and add a ton of really cool updates is [citadel.org](https://citadels.org/nodeupgrade/).
Most of the information in this workshop is from there.

## Support
If you need help or have questions:
- Open an issue in this repository
- Check the troubleshooting sections in each guide
- Consult the Bitcoin Core and Electrum documentation

Happy node running! 🚀