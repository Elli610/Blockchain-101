# AMM 101

## Introduction
Welcome! This is an automated workshop that will guide you into using Uniswap V4 and doing a simple integration in a smart contract.
It is aimed at developers that are familiar with Solidity and ERC20.

## How to work on this TD
### Introduction
The workshop has three components:
- An ERC20 token, ticker AMM-101, that is used to keep track of points
- An evaluator contract, that is able to mint and distribute AMM-101 points
- A dummy ERC20 token that you'll trade in the beginning of the workshop

Your objective is to gather as many AMM-101 points as possible. Please note:
- The 'transfer' function of AMM-101 has been disabled to encourage you to finish the TD with only one address
- You can answer the various questions of this workshop with different contracts. However, an evaluated address has only one evaluated contract at a time. To change the evaluated contract associated with your address, call `submitExercice()` with that specific address.
- You will also have to deploy an ERC20 and register it with `submitErc20()`
- In order to receive points, you will have to execute code in `Evaluator.sol` such that the function `TDAMM.distributeTokens(msg.sender, n);` is triggered, and distributes n points.
- This repo contains an interface `IExerciceSolution.sol`. Your ERC20 contract will have to conform to this interface in order to validate the exercise; that is, your contract needs to implement all the functions described in `IExerciceSolution.sol`.
- A high level description of what is expected for each exercise is in this readme. A low level description of what is expected can be inferred by reading the code in `Evaluator.sol`.
- The Evaluator contract sometimes needs to make payments to buy your tokens. Make sure it has enough ETH to do so! If not, you can send ETH directly to the contract.

### Getting to work
- Setup a forge or hardhat project
- Get an api key
- Create a `.env` file that contains a mnemonic phrase for deployment, an rpc API key and an Etherscan API key
- Start writing code !

## Deployed Contracts
- **PointERC20 (AMM-101)**: [`0xb475292FE4B11791aF676979693164d7eb6789fE`](https://sepolia.etherscan.io/address/0xb475292FE4B11791aF676979693164d7eb6789fE#code)
- **DummyToken**: [`0x14BB335916E6C8e34347103dE62F4f41235D51DF`](https://sepolia.etherscan.io/address/0x14BB335916E6C8e34347103dE62F4f41235D51DF#code)
- **Evaluator**: [`0x1C7A360bb8e4F7b5A056Fcce0fC370c0C13e6bF4`](https://sepolia.etherscan.io/address/0x1C7A360bb8e4F7b5A056Fcce0fC370c0C13e6bF4#code)

> Note: Wrapping eth is not needed anymore to interact with uniswap since v4

## Points list
### Setting up
- Create a git repository and share it with the teacher
- Install Forge or Hardhat and create an empty project. Create a rpc API key to be able to deploy to the Sepolia testnet

These points will be attributed manually if you do not manage to have your contract interact with the evaluator, or automatically in the first ERC20 question.

### Uniswap V4 basics
- Find the dummyToken address by calling `dummyToken()` on the Evaluator
- Buy some units of dummyToken on Uniswap V4. You can do this using their interface or by interacting with the contracts directly
- Prove that you own these tokens by calling `ex1_showIHaveTokens()` (2 pts)
- Provide liquidity to the WETH - dummyToken pool on Uniswap V4 using the Position Manager
- Prove that you provided liquidity by calling `ex2_showIProvidedLiquidity()` with your position NFT token ID (2 pts)

### ERC20 basics
- Call `ex6a_getTickerAndSupply()` in the evaluator contract to receive a random ticker for your ERC20 token, as well as an initial token supply. You can read your assigned ticker and supply in `Evaluator.sol` by calling getters `readTicker()` and `readSupply()` (2 pts)
- Create an ERC20 token contract with the proper ticker and supply
- Deploy it to the Sepolia testnet
- Call `submitErc20()` in the Evaluator to configure the contract you want evaluated (Previous 3 points are attributed at that step)
- Call `ex6b_testErc20TickerAndSupply()` in the evaluator to receive your points (2 pts)

### Uniswap V4 basics - again
- Create a Uniswap V4 pool for your token paired with WETH and add liquidity to it using the Position Manager
- Call `ex7_tokenIsTradableOnUniswap` to show your token is tradable on Uniswap V4 (5 pts)

### Uniswap V4 integration
You will need to interact with Uniswap V4's PoolManager and related contracts to complete this part.
- Create a contract that can swap tokens in Uniswap V4 in the WETH/Your token pool
- Submit your contract address using `submitExercice()` (repeat as needed)
- Prove your contract works by calling `ex8_contractCanSwapVsEth()` in the evaluator (1 pt)
- Create a contract that can swap tokens in Uniswap V4 in the dummyToken/Your token pool
- Prove your contract works by calling `ex9_contractCanSwapVsDummyToken()` in the evaluator (2 pts)
- Create a contract that can deposit tokens in Uniswap V4 in the WETH/Your token pool using the Position Manager
- Prove your contract works by calling `ex10_contractCanProvideLiquidity()` in the evaluator (2 pts)
- Create a contract that can withdraw tokens from Uniswap V4 from the WETH/Your token pool using the Position Manager
- Prove your contract works by calling `ex11_contractCanWithdrawLiquidity()` in the evaluator (2 pts)

### Extra points
Extra points if you find bugs/corrections this TD can benefit from, and submit a PR to make it better. Ideas:
- Adding a way to check the code of a specific contract was only used once (no copying)
- Publish the code of the Evaluator on Etherscan using the "Verify and publish" functionality


> Note:
> if you get this error running the script:
> `The package "permit2" is not installed.`
> 
> run:
> `cd node_modules && ln -s @uniswap/v4-periphery/lib/permit2 permit2`

