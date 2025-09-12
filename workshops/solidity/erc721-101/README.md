# ERC721 101

## Introduction
Welcome!
This is an automated workshop that will dive deeper into ERC721 NFT tokens and their advanced functionality. We'll explore breeding mechanics, auction systems, and complex NFT interactions. It is aimed at developers experienced in interacting with and writing smart contracts.

> Note: This workshop builds upon fundamental blockchain concepts. If you're new to smart contract development, consider starting with simpler workshops before tackling this one.

## How to Work on This TD
The TD has three components:
- An ERC20 token, ticker **TD-ERC721-101**, that is used to keep track of points.
- An evaluator contract that can mint and distribute **TD-ERC721-101** points.
- Your custom ERC721 contract for managing digital animals with breeding and auction functionality.

Your goal is to collect as many **TD-ERC721-101** points as possible. Please note:
- The `transfer` function of **TD-ERC721-101** has been disabled to encourage you to complete the TD with a single address.
- You can answer the various questions of this workshop with different ERC721 contracts. However, an evaluated address has only one evaluated ERC721 contract at a time. To change the evaluated ERC721 contract associated with your address, call `submitExercise()` with that specific address.
- In order to receive points, you will need to execute code in `Evaluator.sol` that triggers `TDERC721.distributeTokens(msg.sender, n);`, distributing `n` points.
- This repo contains an interface `IExerciseSolution.sol`. Your ERC721 contract must conform to this interface to validate the exercises, meaning your contract needs to implement all the functions described in `IExerciseSolution.sol`.
- A high-level description of what's expected for each exercise is in this readme. A detailed description of what's expected can be inferred by reading the code in `Evaluator.sol`.
- The evaluator contract may need to make payments to purchase your tokens. Ensure it has enough ETH to do so. If not, you can send ETH directly to the contract.

### Getting to Work
- Clone the repo to your machine.
- Install the required packages by running `npm install`.
- Obtain an ethereum API key (from Alchemy, Infura, or any other provider).
- Setup your `.env` file with your mnemonic phrase, API key, and Etherscan API key.
- Install and configure a seed phrase or private key for deploying contracts in Hardhat.
- Test your connection to the Sepolia network with `npx hardhat console --network sepolia`.
- To deploy a contract, create a deployment script in the `scripts/` folder. Look at how the TD is deployed and iterate from there.
- Test your deployment locally with `npx hardhat run scripts/your-script.js`.
- Deploy to the Sepolia testnet with `npx hardhat run scripts/your-script.js --network sepolia`.

## Points List
### Setting Up
- Create a Git repository and share it with the teacher.
- Get an API key (from Alchemy, Infura or any other provider) (1 point).
- Install and configure [Hardhat](https://hardhat.org/) or [Foundry](https://book.getfoundry.sh/) (1 point).
These points will be awarded manually if you're unable to have your contract interact with the evaluator, or automatically when calling `submitExercise()` for the first time.

### ERC721 Basics
- Create an ERC721 token contract and give token 1 to the Evaluator contract.
- Deploy it to the Sepolia testnet and submit it to the evaluator using `submitExercise()` (2 points).
- Call `ex1_testERC721()` in the evaluator to prove your contract works (2 points).
- Call `ex2a_getAnimalToCreateAttributes()` to get assigned a random creature to create. Mint it and give it to the evaluator.
- Call `ex2b_testDeclaredAnimal()` to prove your animal creation works (2 points).

### Access Control and Breeding System
- Create a function to allow breeder registration. Only allow listed breeders to create animals.
- Call `ex3_testRegisterBreeder()` to prove your access control works (2 points).

### Minting and Burning NFTs from Contracts
- Create a function to allow breeders to declare new animals.
- Call `ex4_testDeclareAnimal()` to prove your minting function works (2 points).
- Create a function to allow breeders to declare dead animals (burning mechanism).
- Call `ex5_declareDeadAnimal()` to prove your burning function works (2 points).

### NFT Marketplace: Selling and Transferring
- Create a function to offer an animal for sale.
- Create a getter function for animal sale status and price.
- Create a function to buy animals from other users.
- Call `ex6a_auctionAnimal_offer()` to prove your auction listing works (1 point).
- Call `ex6b_auctionAnimal_buy()` to prove your purchase mechanism works (2 points).

### Advanced Features: Breeding and Reproduction
> The following exercises are evaluated in `Evaluator2.sol`.
- Create a function `declareAnimalWithParents()` to declare parents of an animal when creating it.
- Create a getter function `getParents()` to retrieve parent IDs.
- Call `ex7a_breedAnimalWithParents()` to prove your breeding system works (1 point).
- Create a function to offer an animal for reproduction services, against payment.
- Create a getter for animal reproduction status and pricing.
- Call `ex7b_offerAnimalForReproduction()` to prove your reproduction marketplace works (1 point).
- Create a function to pay for reproductive rights and breed animals.
- Call `ex7c_payForReproduction()` to prove your breeding payment system works (1 point).

### Extra Points
Extra points are available if you find bugs or improvements this TD can benefit from, and submit a PR to make it better. Ideas include:
- Adding a way to verify that each contract's code was only used once (preventing copying).
- Publishing the Evaluator contract code on Etherscan using the "Verify and publish" functionality.
- Implementing additional animal attributes or breeding mechanics.
- Adding marketplace features like auction timers or bidding systems.

## TD Addresses
Network: Ethereum Sepolia
- **TDToken (ERC20 Points)**: [`0x36f7439dB3b9E408B095A9895456A95BA5450D24`](https://sepolia.etherscan.io/address/0x36f7439dB3b9E408B095A9895456A95BA5450D24)
- **Evaluator**: [`0xa39ac9c5eF0582f5D0b21770e34c4c54d6e46Fa6`](https://sepolia.etherscan.io/address/0xa39ac9c5eF0582f5D0b21770e34c4c54d6e46Fa6)
- **Evaluator2**: [`0xB6C6cf310456Bd0dEE01162A9150EC7ccA146936`](https://sepolia.etherscan.io/address/0xB6C6cf310456Bd0dEE01162A9150EC7ccA146936)

> I encourage you to complete all exercises on the same network and with the same address for optimal point tracking.
