# Part 2: Indexer Development

## Overview

In this part of the workshop, you'll build an indexer to monitor events from your bridge contracts on both chains. The indexer will:
1. Listen for `Deposit` events on both chains
2. Wait for sufficient block confirmations to ensure finality
3. Trigger the distribution of tokens on the opposite chain

## Objectives

By the end of this section, you will have:
- Set up an event listener for both blockchains
- Implemented finality verification logic
- Created a reliable mechanism to handle cross-chain distributions
- Built a resilient system that can recover from errors

## Step 1: Setting Up Your Indexer Project

You can choose between TypeScript, Rust, Go, or Python for your indexer. This guide will provide examples in TypeScript, but the concepts apply to all languages.

1. Setup your project and install the necessary dependencies`

2. Create your environment file:
   ```bash
   touch .env
   ```

   Add the following to your `.env` file:
   ```
   # RPC Endpoints
   HOLESKY_RPC_URL=https://holesky.infura.io/v3/YOUR_INFURA_KEY
   TARGET_CHAIN_RPC_URL=YOUR_TARGET_CHAIN_RPC_URL

   # Contract Addresses
   HOLESKY_BRIDGE_ADDRESS=YOUR_HOLESKY_BRIDGE_ADDRESS
   TARGET_CHAIN_BRIDGE_ADDRESS=YOUR_TARGET_CHAIN_BRIDGE_ADDRESS

   # Private Key (for signing transactions)
   PRIVATE_KEY=YOUR_PRIVATE_KEY

   # Confirmation Thresholds
   HOLESKY_CONFIRMATION_BLOCKS=15
   TARGET_CHAIN_CONFIRMATION_BLOCKS=YOUR_TARGET_CHAIN_CONFIRMATION_THRESHOLD

   # Database 
   # any database secrets you need
   ```

## Step 2: Setting Up the Database

The indexer needs a database to track events and transactions. This prevents double-processing and enables recovery from failures.

1. Create a database module

2. Create entity models

## Step 3: Building the App

Next, create listeners for both chains to monitor deposit events:

1. Create a bridge ABI module

2. Create a 2 chain listeners (subscribe to specific logs from your contracts)
 
3. Implement the event processing logic

4. Wait for confirmation blocks to ensure [finality](https://cointelegraph.com/explained/what-is-finality-in-blockchain-and-why-does-it-matter)

5. Add a transaction handler to trigger token distributions
  

## Step 5: Error Handling and Recovery

Implement error handling and recovery mechanisms to make your indexer resilient:

1. Ensure all depositors received their tokens   

2. Add a shutdown handler: lock the deposit contracts to prevent further deposits


## Step 6: Running Your Indexer

1. Start your indexer

2. Monitor the logs

3. Test the bridge functionality:
   - Deposit tokens on Holesky
   - Verify the indexer detects the deposit event
   - Confirm the distribution on the target chain

## Troubleshooting

- **RPC Connection Issues**: Ensure your RPC endpoints are correct and accessible.
- **Database Errors**: Check that SQLite is properly installed and the database file is writable.
- **Event Listener Problems**: Verify that the contract ABIs match the deployed contracts.
- **Transaction Failures**: Check that the private key has sufficient funds for gas on both chains.

## Security Considerations

The indexer in this workshop is a simplified version for educational purposes. In a production environment, consider:

1. Using a more robust database like PostgreSQL
2. Implementing more sophisticated error handling and retry mechanisms
3. Adding monitoring and alerting systems
4. Using a secure key management solution instead of environment variables
5. Implementing rate limiting and flood protection
6. Adding extensive logging and transaction tracking

## Next Steps

Now that you have a functioning cross-chain bridge, you can proceed to Part 3 to add multi-token support.