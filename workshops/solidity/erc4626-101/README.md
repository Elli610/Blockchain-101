# ERC4626 101

## Introduction
Welcome! This is an automated workshop designed to guide you through building an **ERC-4626 tokenized vault**. The [ERC-4626 standard](https://eips.ethereum.org/EIPS/eip-4626) is the canonical interface for yield-bearing vaults: users deposit an underlying ERC-20 asset and receive **shares** that represent their pro-rata claim on the vault, and the value of a share evolves as the vault accrues (or loses) assets.

This workshop is aimed at developers who already completed [ERC20 101](../erc20-101/README.md) and are comfortable reading ERC-20 code.

## How to Work on This TD
The TD includes three key components:
- An ERC20 token with the ticker **ERC4626-101** used to keep track of points.
- A `MockUnderlying` ERC20 that serves as the underlying asset for every student vault. It exposes a public `getTokens(uint256)` faucet so anyone can obtain tokens.
- An `Evaluator` contract that can mint and distribute **ERC4626-101** points, and that runs deposit / mint / withdraw / redeem / yield tests against your vault.

Your objective is to gather as many **ERC4626-101** points as possible. Key details:
- The `transfer` function for **ERC4626-101** is disabled, so points cannot be moved between addresses.
- You may deploy multiple vault iterations while working through the workshop. Only one vault contract is associated with an evaluated address at a time. To register a new vault, call `submitExercice(<yourVault>)` on the evaluator.
- Points are credited by the evaluator when a test passes.
- Your vault must implement all functions declared in `IExerciceSolution.sol` (essentially the ERC-4626 interface plus ERC-20 metadata).
- Your vault's `asset()` must return the address of the **MockUnderlying** deployed on the network, not a token you deploy yourself.
- A high-level description of each exercise is given here. For the exact requirements, read `Evaluator.sol`.

### Getting to Work
- Create your own repository and initialize Hardhat or Foundry.
- Obtain an Ethereum RPC key (Alchemy, Infura, or any other provider).
- Create a `.env` file (see `.env.example`) with your `PRIVATE_KEY`, `SEPOLIA_RPC_URL`, and optionally `ETHERSCAN_API_KEY`.
- Write your vault implementation.
- Deploy your vault to Sepolia, then call `submitExercice(<vault>)` on the evaluator.
- Work through the exercises below.

## Points List
> See the deployed contract addresses at the end of this document.

### Setting Up
- Create a Git repository and share it with the instructor.
- Install [Hardhat](https://hardhat.org/) or [Foundry](https://book.getfoundry.sh/) and create a new project (2 points).
- Get an RPC API key (1 point).
- Claim your points by calling `ex0_setupProject()` on the evaluator (or by calling `submitExercice` once your vault is deployed, which credits the same setup points).

### Vault Basics
1. Call `ex1_getVaultParameters()` on the evaluator to be assigned a random vault **name** and **symbol** (1 point).
   - Use `readName(yourAddress)` and `readSymbol(yourAddress)` to check the assignment.
2. Write your ERC-4626 vault with:
   - `asset()` returning the deployed `MockUnderlying`.
   - the assigned name and symbol.
3. Deploy the vault to Sepolia.
4. Call `submitExercice(<vault>)` to register the evaluated contract for your address (2 + 2 + 1 points for setup + creating + deploying, credited once).
5. Call `ex2_testVaultDeployment()` to confirm your metadata is correct (2 points).

### Deposit and Mint
1. Implement the standard deposit path (`previewDeposit`, `deposit`, `maxDeposit`). Call `ex3_testDeposit()`. The evaluator will grab 1000 MOCK from the faucet, approve your vault, and deposit. Your vault must mint the correct number of shares and match its own preview (2 points).
2. Implement the mint path (`previewMint`, `mint`, `maxMint`). Call `ex4_testMint()`. The evaluator will request 500 shares to be minted for whatever underlying amount your `previewMint` reports (2 points).

### Withdraw and Redeem
1. Implement the withdraw path (`previewWithdraw`, `withdraw`, `maxWithdraw`). Call `ex5_testWithdraw()` (2 points).
2. Implement the redeem path (`previewRedeem`, `redeem`, `maxRedeem`). Call `ex6_testRedeem()` (2 points).

### Accounting Consistency
1. In a fee-less vault, `previewDeposit == convertToShares` and `previewRedeem == convertToAssets`. The round-trip `convertToShares(convertToAssets(x))` must round in favor of the vault (never up). Call `ex7_testPreviewConsistency()` (1 point).

### Yield and Share Price
1. Once assets are airdropped directly to the vault, its `totalAssets()` grows without new shares being minted, so the share price increases. Call `ex8_testYield()`. The evaluator deposits, then transfers 500 MOCK to the vault, then redeems its shares and expects to receive **more** than it deposited (2 points).

### Max Functions
1. `maxDeposit`, `maxMint` should be non-zero for a normal address on an uncapped vault. `maxWithdraw`, `maxRedeem` should be `0` for an address with no shares. Call `ex9_testMaxFunctions()` (1 point).

### All in One
Complete the entire workshop in a single transaction. Implement a `completeWorkshop()` function in a new contract implementing `IAllInOneSolution`. Call `ex10_allInOne()` from that contract to credit all points to the validating contract (2 points).

## Notes and Hints
- The evaluator obtains underlying tokens through `MockUnderlying.getTokens(uint256)`, which anyone can call. It then approves your vault before depositing / minting. Do not assume a fixed balance.
- OpenZeppelin's `ERC4626` uses a virtual shares / assets offset to defend against the "inflation attack". You do not need to change this default to pass the workshop, but be aware that `convertToAssets(1)` may not return `1` on an empty vault.
- Do not add deposit / withdraw fees. `ex7` verifies that previews match the raw conversions.
- Your vault must not restrict `maxDeposit` / `maxMint` to zero for the evaluator, otherwise `ex9` will fail.

## Addresses
Network: Ethereum Sepolia
- **ERC4626_101 (points)**: [`0xc6eF34871Ad51ed2BF8b40E5ebbE6EE2D30450f4`](https://sepolia.etherscan.io/address/0xc6eF34871Ad51ed2BF8b40E5ebbE6EE2D30450f4)
- **MockUnderlying**: [`0xd0FB68321b1D565a6b07992b264B787bB7A06273`](https://sepolia.etherscan.io/address/0xd0FB68321b1D565a6b07992b264B787bB7A06273)
- **Evaluator**: [`0x8cA1290223ae888507D6A4c875420D82BE235c3D`](https://sepolia.etherscan.io/address/0x8cA1290223ae888507D6A4c875420D82BE235c3D)
