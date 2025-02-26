# Cross-Chain Bridge Workshop
## Introduction

Welcome to this hands-on workshop that will guide you through building a cross-chain bridge between Ethereum Holesky testnet and another blockchain of your choice! A cross-chain bridge is a crucial piece of infrastructure that enables interoperability between different blockchain networks.

In this workshop, you'll learn how to:
1. Create smart contracts for token deposits and distributions
2. Build an indexer to monitor events on both chains
3. Implement a secure cross-chain transfer mechanism
4. Add multi-token support and bridge & swap functionality

This workshop is designed for developers who want to understand blockchain interoperability and gain practical experience with cross-chain communication.

## Prerequisites

- Intermediate knowledge of blockchain concepts and smart contract development
- Experience with programming languages (Solidity and any of Rust, TypeScript, Go, or Python are recommended)
- Basic understanding of event indexing and blockchain transaction finality
- A development environment with:
  - Node.js (v20 or later)
  - Solidity development tools ([Forge](https://book.getfoundry.sh/forge/) is recommended)
  - Access to Ethereum Holesky testnet (via Infura, Alchemy, or your own node)
  - Access to a second blockchain network (testnet recommended)
  - Git

## Workshop Structure

The workshop is divided into three main components:

### Part 1: Smart Contract Development (`bridge-contracts.md`)
- Creating deposit and distribution contracts
- Implementing ownership mechanisms
- Testing contract functionality
- Deploying to Holesky and your second chain

### Part 2: Indexer Development (`bridge-indexer.md`)
- Setting up an event listener for both chains
- Processing deposit events
- Implementing finality verification
- Triggering cross-chain token distribution

### Part 3: Swap Support (`multi-token-bridge.md`)
- Extending contracts to handle multiple tokens
- Managing token mappings between chains
- Implementing token verification

## Getting Started

1. Follow the instructions in [`bridge-contracts.md`](./bridge-contracts.md) for Part 1
2. Once your contracts are deployed, proceed to [`bridge-indexer.md`](./bridge-indexer.md) for Part 2
3. After your basic bridge is functioning, continue to [`multi-token-bridge.md`](./multi-token-bridge.md) for Part 3

## Learning Objectives

After completing this workshop, you will:
- Understand how cross-chain bridges work
- Be able to develop and deploy smart contracts on multiple blockchains
- Know how to build and maintain an event indexer
- Understand blockchain finality and its importance in cross-chain transfers
- Have experience with multi-token management and token swapping
- Be familiar with security considerations in cross-chain applications

## Important Notes

- Always use testnet for development
- Be mindful of gas costs when designing your contracts
- Consider security implications at every step
- Finality requirements differ between blockchains
- In a production environment, additional security measures would be necessary

## Evaluation Criteria

Your cross-chain bridge will be evaluated based on:
1. **Functionality**: Does it correctly transfer tokens between chains?
2. **Security**: Are there appropriate safeguards against potential attacks?
3. **Code Quality**: Is the code well-structured, documented, and tested?
4. **Efficiency**: Are operations optimized for gas usage?
5. **Extensibility**: How easily can the bridge be extended to support additional tokens or chains?

## Additional Resources

- [Ethereum Documentation](https://ethereum.org/en/developers/docs/apis/json-rpc/)
- [Holesky Testnet Faucet](https://holesky-faucet.pk910.de/)
- [The Graph Documentation](https://thegraph.com/docs/en/) (useful for indexing)
- [ChainLink Cross-Chain Protocol](https://chain.link/cross-chain) (reference architecture of decentralized oracles)
- [LayerZero Documentation](https://layerzero.gitbook.io/docs/) (example of a production bridge solution)

## Support

If you need help or have questions:
- Refer to the troubleshooting sections in each guide
- Check the referenced documentation
- Ask questions during scheduled support sessions

Good luck and happy bridging! 🌉