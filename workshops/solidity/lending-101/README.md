# AAVE Lending 101

## Introduction
Welcome! This is an automated workshop designed to guide you through using AAVE and implementing lending functionalities in smart contracts. This workshop is geared towards developers familiar with Solidity and ERC20 tokens.

## How to Work on This TD
The TD includes two key components:
- An ERC20 token with the ticker **Lend-101**, used to keep track of points.
- An evaluator contract that can mint and distribute **Lend-101** points.

Your objective is to gather as many **Lend-101** points as possible. Key details include:
- The `transfer` function for **Lend-101** is disabled to encourage completing the TD with a single address.
- You may use different contracts to complete various exercises in this workshop. However, only one contract is associated with an evaluated address at a time. To change the evaluated contract, call `submitExercice()` in the evaluator with that specific contract address.
- To receive points, trigger the function `TDERC20.distributeTokens(msg.sender, n);` in `Evaluator.sol` to distribute `n` points.
- Your contract must implement all functions defined in `IExerciceSolution.sol` to validate each exercise.
- A high-level overview of each exercise is provided here; for specific requirements, refer to the code in `Evaluator.sol`.
- The evaluator contract may need ETH to verify your exercises. Ensure it has enough ETH, or send ETH to it directly.

### Getting to Work
- Clone the repository to your machine.
- Install Foundry by following the [official documentation](https://book.getfoundry.sh/getting-started/installation).
- Initialize a new Foundry project with `forge init`.
- Create a `.env` file with your private key and any required API keys.
- Claim testnet ETH from the [Sepolia faucet](https://sepoliafaucet.com/).
- Get test tokens from AAVE's faucet:
  1. Go to [AAVE's app](https://app.aave.com/)
  2. Switch to Sepolia testnet mode in the settings
  3. Navigate to the faucet section
- Test your deployment setup locally with `forge test`.
- Deploy to Sepolia using `forge script`.

### AAVE Basics (8 points)
Using [AAVE's website](https://app.aave.com/):
1. Enable testnet mode in the settings (top right gear icon).
2. Deposit the right assets in AAVE and call `ex1_showIDepositedTokens()` (2 points).
3. Borrow the right assets from AAVE and call `ex2_showIBorrowedTokens()` (2 points).
4. Repay borrowed assets and call `ex3_showIRepaidTokens()` (2 points).
5. Withdraw your deposited assets and call `ex4_showIWithdrewTokens()` (2 points).

### AAVE Integration (8 points)
1. Create a smart contract that:
   - Can deposit assets into AAVE - call `ex5_showContractCanDepositTokens()` (2 points)
   - Can borrow assets from AAVE - call `ex6_showContractCanBorrowTokens()` (2 points)
   - Can repay borrowed assets - call `ex7_showContractCanRepayTokens()` (2 points)
   - Can withdraw deposited assets - call `ex8_showContractCanWithdrawTokens()` (2 points)

### Flash Loans (4 points)
Create and deploy a smart contract that successfully executes an AAVE Flash Loan (4 points).

### Extra Credit
Submit pull requests for improvements to this workshop:
- Add functionality to verify unique contract submissions (no code copying)
- Enhance contract verification on Etherscan
- Add additional test cases or security checks
- Improve documentation or fix errors

## Addresses
Network: Ethereum Sepolia
- **Lending-101 token**: [`0x9d7C956a480820aaBaF7d9F33c97A33EfD15D214`](https://sepolia.etherscan.io/address/0x9d7C956a480820aaBaF7d9F33c97A33EfD15D214)
- **Evaluator**: [`0xab34164babc40bc2f0550cb8c83e76b84160ca00`](https://sepolia.etherscan.io/address/0xab34164babc40bc2f0550cb8c83e76b84160ca00)

---
Happy coding!
