// todo:
- contract to get the total point for an address
- deploy tokens
- deploy pools avec les bons prixs de base vis a vis des valeurs de tokens en pts :
1-2
1-10
10-2
2-3
2-8
8-10
9-10
9-8
9-4
3-4
3-5
3-7
4-5
5-6
5-8
7-8
6-7
- faire quelques swaps pour créer des opportunités

- faire un bot qui fait des swaps randoms toutes les 10 secondes


# MEV Arbitrage 101

# Prerequisites

Before proceeding with this material, students must have:

Previous experience with Solidity: Students should be comfortable with Solidity syntax, contract development, and deployment processes

Understanding of AMM mechanisms: Students must have a solid grasp of Automated Market Maker concepts, including liquidity pools, price discovery, and trading mechanisms

## Introduction
Welcome! This is a hands-on workshop designed to introduce you to **Maximal Extractable Value (MEV)** through practical arbitrage trading on an EVM-compatible blockchain.

I have deployed **10 ERC20 tokens** and created **17 Uniswap pools**.
Each token’s base value corresponds to its index:
Here's the markdown table:

| Token | Address | Value |
|-------|---------|-------|
| Token1 | address1 | **1** |
| Token2 | address2 | **2** |
| ... | ... | ... |
| Token10 | address10 | **10** |

The pools are initialized with prices reflecting these relative values. Your mission is to build an **arbitrage bot** that listens to swap events, finds profitable routes, and executes trades to maximize profit.

Some ideas to spice up the competition:
- front running
- sandwich attacks
- fake nodes
- just in time liquidity
- whatever you want until it's not stealing private key or DDOS the official nodes

At the end of the competition, the wallet with the **most points** wins!

---

## 📊 Scoring System

- **5 points**: Continuously listen for Uniswap swap events
- **8 points**: Build a working arbitrage bot
  - Extract prices from pools → **2 points**
  - Find profitable arbitrage routes → **3 points**
  - Execute arbitrage transactions → **3 points**
- **7 points**: Performance bonus based on profit ranking

### 💡 Extra Points & Challenges
- Write your own contract to guarantee profitability on each arbitrage
- Capture **pending transactions** from the mempool and react before they are mined
- Implement **advanced path-finding algorithms** for multi-hop arbitrage
- Pay attention to trade profitability & save gas fees

---

## ⚙️ Technical Requirements

- You may use **JavaScript / TypeScript**, **Rust**, or **Go**
- **Python** is possible but not recommended due to weaker Web3 ecosystem support

Arbitrage transactions **must** be executed via the Uniswap Router’s **multicall** function:
🔗 [Uniswap Multicall Interface](https://github.com/Uniswap/v3-periphery/blob/main/contracts/interfaces/IMulticall.sol)

---

## 🛠 Exercises

### 1. Listening for Events (5 points)

* Subscribe to `Swap` events in the pools
* Log every swap in real time

---

### 2. Building the Arbitrage Bot (8 points)

#### 2.1 Extract Prices (2 points)

* Fetch token reserves from Uniswap pools
* Compute exchange rates between all pairs

#### 2.2 Find Profitable Routes (3 points)

* Detect arbitrage opportunities between pools
* Example: Token A → Token B → Token C → back to Token A with profit

#### 2.3 Execute Transactions (3 points)

* Send arbitrage trades through the **Uniswap Router multicall**
* Ensure gas costs < arbitrage profit

---

### 3. Competing for Performance (7 points)

* Continuously run your bot
* The more profitable trades you capture, the higher your score!


---

## 📚 Resources

* [Uniswap v3 Core Docs](https://docs.uniswap.org/contracts/v3/overview)
* [Flashbots MEV Resources](https://docs.flashbots.net/)
* [Ethers.js Documentation](https://docs.ethers.org/)
* [Go-Ethereum Docs](https://geth.ethereum.org/docs/)
* [Rust Ethers-rs](https://docs.rs/ethers/latest/ethers/)

---

Happy hacking, and may the best researcher win 🚀
