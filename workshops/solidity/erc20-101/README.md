# ERC20 101

## Introduction
Welcome! This is an automated workshop designed to guide you through deploying and customizing an ERC20 token with essential functionalities. This workshop is geared towards developers new to Solidity but familiar with its syntax.

> Note: If you are not familiar with Solidity, I encourage you to follow the [Solidity 101](../solidity-101/README.md) workshop first.

## How to Work on This TD
The TD includes two key components:
- An ERC20 token with the ticker **ERC20-101**, used to keep track of points.
- An evaluator contract that can mint and distribute **ERC20-101** points.

Your objective is to gather as many **ERC20-101** points as possible. Key details include:
- The `transfer` function for **ERC20-101** is disabled to encourage completing the TD with a single address.
- You may use different ERC20 contracts to complete various exercises in this workshop. However, only one ERC20 contract is associated with an evaluated address at a time. To change the evaluated contract, call `submitExercice()` in the evaluator with that specific contract address.
- To receive points, trigger the function `TDERC20.distributeTokens(msg.sender, n);` in `Evaluator.sol` to distribute `n` points.
- Your ERC20 contract must implement all functions defined in `IExerciceSolution.sol` to validate each exercise.
- A high-level overview of each exercise is provided here; for specific requirements, refer to the code in `Evaluator.sol`.
- The evaluator contract may need ETH to buy your tokens. Ensure it has enough ETH, or send ETH to it directly.

### Getting to Work
- Create your own repository and initialize forge
- Obtain an ethereum API key (from Alchemy, Infura, or any other provider).
- Create a `.env` file with a mnemonic for deployment and include your Infura and Etherscan API keys.
- To deploy a contract, create a deployment script in the `scripts/` folder. Review the deployment setup in the repo and modify it for your contract.
- Deploy your contract and compelte the exercises !

## Points List
> See the contract addresses and etherscan links at the end of this document.

### Setting Up
- Create a Git repository and share it with the instructor.
- Install [Foundry](https://book.getfoundry.sh/) and create a new project (2 point).
- Get an API key (from Alchemy, Infura or any other provider) (1 point).
- Claim your points by calling `ex0_setupProject()` in the evaluator.

### ERC20 Basics
1. Call `ex1_getTickerAndSupply()` in the evaluator contract to receive a random ticker and initial supply for your ERC20 token (1 point).
   - Use the evaluator’s `readTicker()` and `readSupply()` functions to check your assigned ticker and supply.
2. Create an ERC20 token contract with the assigned ticker and supply (2 points).
3. Deploy your ERC20 contract to Holesky (1 point).
4. Call `submitExercice()` in the evaluator to register the evaluated contract for your address.
5. Call `ex2_testErc20TickerAndSupply()` in the evaluator to confirm your setup and receive points (2 points).

### Distributing and Selling Tokens
1. Create a `getToken()` function in your contract that distributes tokens to the caller. Deploy it and call `ex3_testGetToken()` in the evaluator (2 points).
2. Create a `buyToken()` function in your contract to let the caller send an arbitrary amount of ETH in exchange for tokens. Deploy it and call `ex4_testBuyToken()` in the evaluator (2 points).

### Creating an ICO Allow List
1. Implement an allow-list function to restrict access to `getToken()` to specific users only.
2. Call `ex5_testDenyListing()` in the evaluator to verify that non-allow-listed users are blocked from `buyTokens()` (1 point).
3. Add the evaluator to the allow list and call `ex6_testAllowListing()` to confirm it can now buy tokens (2 points).

### Creating a Multi-Tier Allow List
1. Implement a multi-tier system where only allow-listed users can call `buyToken()` and token quantities vary by user tier.
2. Call `ex7_testDenyListing()` to confirm the evaluator is restricted from `buyTokens()` (1 point).
3. Add the evaluator to the first tier and verify it can buy `N` tokens for a set amount of ETH by calling `ex8_testTier1Listing()` in the evaluator (2 points).
4. Move the evaluator to the second tier and confirm it can buy `2N` tokens for the same amount of ETH by calling `ex9_testTier2Listing()` (2 points).

### All in One
Complete the entire workshop in a single transaction! Implement a `completeWorkshop()` function in a new contract. Call `ex10_allInOne()` to credit all points to the validating contract (2 points).

## Addresses
Network: Ethereum Sepolia
- **ERC20_101**: [`0xe9b502e84D3E0A6deDB58aa61612DcB543D5eB42`](https://sepolia.etherscan.io/address/0xe9b502e84D3E0A6deDB58aa61612DcB543D5eB42)
- **Evaluator**: [`0x05A644d6d9BBd85861ff927245aaC13bd56e6d57`](https://sepolia.etherscan.io/address/0x05A644d6d9BBd85861ff927245aaC13bd56e6d57)

Network: Ethereum Holesky
- **ERC20_101**: [`0x5C9Ba52c4F1a676D6ec88d8D2684FCC765b1E4A0`](https://holesky.etherscan.io/address/0x5C9Ba52c4F1a676D6ec88d8D2684FCC765b1E4A0)
- **Evaluator**: [`0xB8d4fDEe700263F6f07800AECd702C3D0D74E601`](https://holesky.etherscan.io/address/0xB8d4fDEe700263F6f07800AECd702C3D0D74E601)
