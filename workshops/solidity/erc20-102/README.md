# ERC20 102

## Introduction
Welcome! 
This is an automated workshop that will dive deeper into managing ERC20 tokens. Specifically, we will explore patterns using `approve()` and `transferFrom()`. It is aimed at developers experienced in interacting with and writing smart contracts.

> Note: This workshop is a follow-up to [ERC20 101](https://github.com/Elli610/Blockchain-101/tree/main/workshops/erc20-101). If you haven't completed that workshop, please do so before starting this one.

## How to Work on This TD
The TD has three components:
- An ERC20 token, ticker **TD-ERC20-102**, that is used to keep track of points.
- An evaluator contract that can mint and distribute **TD-ERC20-102** points.
- A claimable ERC20 token, used for issuing tokens and manipulating them.

Your goal is to collect as many **TD-ERC20-102** points as possible. Please note:
- The `transfer` function of **TD-ERC20-102** has been disabled to encourage you to complete the TD with a single address.
- In order to receive points, you will need to execute code in `Evaluator.sol` that triggers `TDERC20.distributeTokens(msg.sender, n);`, distributing `n` points.
- This repo contains an interface `IExerciseSolution.sol`. Your ERC20 contract must conform to this interface to validate the exercises, meaning your contract needs to implement all the functions described in `IExerciseSolution.sol`.
- A high-level description of what's expected for each exercise is in this readme. A detailed description of what's expected can be inferred by reading the code in `Evaluator.sol`.
- The evaluator contract may need to make payments to purchase your tokens. Ensure it has enough ETH to do so. If not, you can send ETH directly to the contract.
- You can use different contracts to validate different exercises. To update the evaluated exercise, call `submitExercise()` in the evaluator contract.

### Getting to Work
- Clone the repo to your machine.
- Install the required packages by running `npm install`.
- Obtain an ethereum API key (from Alchemy, Infura, or any other provider).
- Setup your `.env` file.
- Install and configure a seed phrase or private key for deploying contracts

## Points List
### Setting Up
- Create a Git repository and share it with the teacher.
- Get an API key (from Alchemy, Infura or any other provider) (1 point).
- Install and configure [Hardhat](https://hardhat.org/) or [Foundry](https://book.getfoundry.sh/)(1 point).
These points will be awarded manually if you're unable to have your contract interact with the evaluator, or automatically when claiming points.
- Manually claim tokens on the claimable ERC20 (1 point).
- Claim your points by calling `ex1_claimedPoints()` in the evaluator (2 points).

### Calling Another Contract from Your Contract
- Create a contract `ExerciseSolution` that can claim tokens from the teacher's ERC20. Keep track of addresses that claimed tokens and how many tokens they claimed in `ExerciseSolution`.
- Deploy `ExerciseSolution` and submit it to the evaluator using `submitExercise()` (1 point).
- Call `ex2_claimedFromContract` in the evaluator to prove your code works (1 point).
- Create a function `withdrawTokens()` in `ExerciseSolution` to withdraw the claimable tokens from `ExerciseSolution` to the address that initially claimed them.
- Call `ex3_withdrawFromContract` in the evaluator to prove your code works (2 points).

### Approve and transferFrom
- Use the ERC20 function to allow your contract to manipulate your tokens. Call `ex4_approvedExerciseSolution()` to claim points (1 point).
- Use ERC20 to revoke this authorization. Call `ex5_revokedExerciseSolution()` to claim points (1 point).
- Create a function `depositTokens()` that allows a user to deposit claimable tokens in `ExerciseSolution` using `transferFrom()`.
- Call `ex6_depositTokens` in the evaluator to prove your code works (2 points).

### Tracking User Deposits with a Deposit Wrapper ERC20
- Create and deploy an ERC20 (`ExerciseSolutionToken`) to track user deposits. This ERC20 should be mintable, with minting authorization given to `ExerciseSolution`.
- Call `ex7_createERC20` in the evaluator to prove your code works (2 points).
- Update the deposit function so that the user's balance is tokenized. When a deposit is made in `ExerciseSolution`, tokens are minted in `ExerciseSolutionToken` and transferred to the address making the deposit.
- Call `ex8_depositAndMint` in the evaluator to prove your code works (2 points).
- Update the `ExerciseSolution` withdraw function to use `transferFrom()` in `ExerciseSolutionToken`, burn these tokens, and return the claimable tokens.
- Call `ex9_withdrawAndBurn` in the evaluator to prove your code works (2 points).


## TD Addresses
I deployed this workshop on multiple networks. Choose the one that fits your needs.

> I encourage you to complete all the exercises on the same network.

Network: Ethereum Holesky
- **TDToken**: [`0x2A051582a0eA683F319660675F76fCdE8EdcC7F9`](https://holesky.etherscan.io/address/0x2A051582a0eA683F319660675F76fCdE8EdcC7F9)
- **ClaimableToken**: [`0x25eAAb6F813137fC9BE0b4ada462aA535e2ea37a`](https://holesky.etherscan.io/address/0x25eAAb6F813137fC9BE0b4ada462aA535e2ea37a)
- **Evaluator**: [`0xF9E27Ba9A5DE4621982CB0d9144ef5b12f81A0f7`](https://holesky.etherscan.io/address/0xF9E27Ba9A5DE4621982CB0d9144ef5b12f81A0f7)

Network: Ethereum Sepolia
- **TDToken**: [`0xeaD7680f5Bdb0aAa450399E8F49d4Efb9040Da08`](https://sepolia.etherscan.io/address/0xeaD7680f5Bdb0aAa450399E8F49d4Efb9040Da08)
- **ClaimableToken**: [`0xD829b447AbABDb689C1F6DC81CCe3d29b37c5992`](https://sepolia.etherscan.io/address/0xD829b447AbABDb689C1F6DC81CCe3d29b37c5992)
- **Evaluator**: [`0x822aF04084720Ade89E34e316c169435bBA9C886`](https://sepolia.etherscan.io/address/0x822aF04084720Ade89E34e316c169435bBA9C886)


Network: Arbitrum Sepolia
- **TDToken**: [0xC0E2957F3d92CC2d19Eb75a86B51663D56448Ebb](https://sepolia.arbiscan.io/address/0xC0E2957F3d92CC2d19Eb75a86B51663D56448Ebb)
- **ClaimableToken**: [0x5ADeBf74a71360Be295534274041ceeD6A39977a](https://sepolia.arbiscan.io/address/0x5ADeBf74a71360Be295534274041ceeD6A39977a)
- **Evaluator**: [0xD05c425C843c327c90D2Db98Aba9B715BAA51736](https://sepolia.arbiscan.io/address/0xD05c425C843c327c90D2Db98Aba9B715BAA51736)
