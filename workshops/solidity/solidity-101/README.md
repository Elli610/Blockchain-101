# Solidity-101

## Introduction

Welcome to Solidity-101, an automated workshop designed to introduce you to Solidity and smart contracts. This workshop is perfect for developers who are new to both Solidity and blockchain technology.

## Workshop Overview

This workshop consists of two main components:
- An ERC20 token with the ticker `TD-SOL-101`, which is used to track your progress in the form of points.
- A series of 15 exercises that will mint and distribute `TD-SOL-101` tokens as you complete them.

Your goal is to earn as many `TD-SOL-101` points as possible. Please note:
- You will need testnet Ether to participate. Search for "Sepolia testnet faucet" on Google to acquire some.
- The `transfer` function of the `TD-SOL-101` token has been disabled. This is to ensure you complete the workshop with a single wallet address.

## How to Get Started

### Workshop Structure

The instructions for each exercise are embedded within the respective exercise contract located in the [contracts/exercises](contracts/exercises) directory. Each exercise inherits from the [ExerciseTemplate](contracts/exerciseTemplate.sol), which contains shared logic for validating student work and distributing points.

The exercises are deployed on the Sepolia and Sepolia testnets, and you can interact with them through:
- [Remix](https://remix.ethereum.org/) by importing the contracts from the [contracts](contracts) folder.
- [Etherscan](https://sepolia.etherscan.io/) to interact with the contracts.
- If you know how to use web3 libraries, whatever the language, you can use them to interact with the contracts.

### Earning Points

To earn points, you must execute code within each smart contract to trigger the function call:
```solidity
creditStudent(n, msg.sender);
```
This function will credit you with `n` points. You can infer the expected actions by carefully reviewing the code in each exercise contract.

## Exercise Contract Addresses

### Ethereum Sepolia Testnet
Below is a table of the exercises, their corresponding smart contracts, and links to interact with them on Etherscan Sepolia:

> The teacher address, in case you need it: `0x329A76707745586b2992a6837918a8d2b73Dfd3f`

| Topic                        | Contract Code                                         | Contract on Etherscan                                                                                     |
|------------------------------|------------------------------------------------------|------------------------------------------------------------------------------------------------------------|
| Points Counter ERC20          | [Points counter ERC20](contracts/ERC20TD.sol)        | [0x491421D72FE3Ce027307dA0205A2f7Ca3115F0cb](https://sepolia.etherscan.io/address/0x491421D72FE3Ce027307dA0205A2f7Ca3115F0cb)                     |
| Calling a Function            | [Ex01](contracts/exercises/ex01.sol)                 | [0x9DC488038175076Ab6A645682A9148D63D5841d4](https://sepolia.etherscan.io/address/0x9DC488038175076Ab6A645682A9148D63D5841d4)                     |
| Payable Function              | [Ex02](contracts/exercises/ex02.sol)                 | [0x9119605dAFEFb09dfc620E9DA7dfD6Ec62A4c442](https://sepolia.etherscan.io/address/0x9119605dAFEFb09dfc620E9DA7dfD6Ec62A4c442)                     |
| Requires                      | [Ex03](contracts/exercises/ex03.sol)                 | [0x452f85840E684d90a7AEa284F0d12FEe469F469a](https://sepolia.etherscan.io/address/0x452f85840E684d90a7AEa284F0d12FEe469F469a)                     |
| Storage Variables             | [Ex04](contracts/exercises/ex04.sol)                 | [0xC24143b12c83Aaec0FB90fe90f219623bc048c0E](https://sepolia.etherscan.io/address/0xC24143b12c83Aaec0FB90fe90f219623bc048c0E)                     |
| Mappings                      | [Ex05](contracts/exercises/ex05.sol)                 | [0xa85809209a62B63DFC31cDcd64D9916d6BD282Ea](https://sepolia.etherscan.io/address/0xa85809209a62B63DFC31cDcd64D9916d6BD282Ea)                     |
| Variable Visibility           | [Ex06](contracts/exercises/ex06.sol)                 | [0xB60D22a999C28F72F458a05B2d0bcFdACa8C0ECE](https://sepolia.etherscan.io/address/0xB60D22a999C28F72F458a05B2d0bcFdACa8C0ECE)                     |
| Events                        | [Ex07](contracts/exercises/ex07.sol)                 | [0x99f784B753A0564C99c1D33C027E4306767e186e](https://sepolia.etherscan.io/address/0x99f784B753A0564C99c1D33C027E4306767e186e)                     |
| Structures                    | [Ex08](contracts/exercises/ex08.sol)                 | [0x762BcEC18b99A687b05FA4db69a8D80D1E9fa2E5](https://sepolia.etherscan.io/address/0x762BcEC18b99A687b05FA4db69a8D80D1E9fa2E5)                     |
| Code History                  | removed - skip it                 | [Removed](https://sepolia.etherscan.io/address/0xF3a5182fCd6b44D2519A987290277FDe38F452fc)                     |
| Past Transactions             | [Ex10](contracts/exercises/ex10.sol)                 | [0xA4Ee30cB5730a8e6609a532E6111E774bC206200](https://sepolia.etherscan.io/address/0xA4Ee30cB5730a8e6609a532E6111E774bC206200)                     |
| Composability                 | [Ex11](contracts/exercises/ex11.sol)                 | [0x98c0415C1ABf4C4e08a6FeB1CaC95b9CEA4673F0](https://sepolia.etherscan.io/address/0x98c0415C1ABf4C4e08a6FeB1CaC95b9CEA4673F0)                     |
| Blockchain Forensics          | [Ex12](contracts/exercises/ex12.sol)                 | Undisclosed                                                                                                |
| Inline Assembly                 | [Ex13](contracts/exercises/ex13.sol)                 | Skip this one, contract is broken
| Deploy Your Own Contract       | [Ex14](contracts/exercises/ex14.sol)                 | [0x6Df72d38CC7D5A181aa2A026e89d8D95a8576619](https://sepolia.etherscan.io/address/0x6Df72d38CC7D5A181aa2A026e89d8D95a8576619)                     |
| All in One!                   | [Ex15](contracts/exercises/ex15.sol)                 | [0xeB5580Dc9c8bd981DE70B518Cc2d614E2CE7BDE4](https://sepolia.etherscan.io/address/0xeB5580Dc9c8bd981DE70B518Cc2d614E2CE7BDE4)                     |



---
Good luck, and happy coding!
