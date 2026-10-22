# ERC721 UX 101

## Introduction
Welcome!
This workshop is the frontend companion to [ERC721 101](../erc721-101/). Your job is to build a small dApp that reads from and writes to ERC721 contracts already deployed on the Sepolia testnet. You will learn to connect a wallet (both the hard way and the easy way), display on-chain data, send transactions (including payable ones), and call a signature-gated minter.

> Note: This workshop assumes you are comfortable with JavaScript/TypeScript and modern web frameworks. If you have never interacted with an EVM contract from the frontend, read the [wagmi documentation](https://wagmi.sh/) and [viem documentation](https://viem.sh/) before starting.

## How to Work on This TD
The TD has three components:
- An ERC20 token, ticker **TD-ERC721-UX-101**, that is used to keep track of points.
- An evaluator contract that can mint and distribute **TD-ERC721-UX-101** points.
- Three ERC721 contracts and one signature-based claimer contract that you will interact with from your frontend.

Your goal is to collect as many **TD-ERC721-UX-101** points as possible. Please note:
- The `transfer` function of **TD-ERC721-UX-101** has been disabled to encourage you to complete the TD with a single address.
- Points come in two flavors:
  - **Automatic**: awarded by `Evaluator.sol` when your wallet state matches what each exercise expects. Your frontend must drive the on-chain actions.
  - **Manual**: awarded by your teacher based on your pull request / repository. These cover UI pieces that cannot be verified on chain.
- To be eligible for automatic points, you must first call `submitExercise()` from the wallet you will use for the rest of the TD. This binds that address as your evaluated address.
- A high-level description of what's expected for each exercise is in this readme. A detailed description of the automatic checks can be inferred by reading the code in `Evaluator.sol`.
- Every exercise is worth **2 points**.

## Suggested Stack
You are free to pick your stack. These two are recommended and will cover every exercise cleanly:

- **Next.js (App Router) + viem** — closest to what you will build in production. Good routing, good TypeScript ergonomics.
- **Vite + React + viem** — simpler project setup, no SSR to worry about, faster dev loop. A good pick if this is your first dApp.

> Note: several exercises explicitly forbid using RainbowKit or wagmi connectors. The point of this workshop is to understand what those libraries do before relying on them. You may use wagmi / RainbowKit for the exercises that do not ban them, or for extra polish.

Avoid `web3.js v1`: it is unmaintained.

## Points List

### Setting Up
- Create a Git repository for your frontend and share it with the teacher.
- Get an RPC API key for Sepolia (from Alchemy, Infura, or any other provider) (**2 pts**, manual).
- Scaffold your frontend (**2 pts**, manual).
- Call `submitExercise()` on the Evaluator from the wallet you will use for the rest of the TD (**2 pts**, automatic).

### Wallet Integration (From Scratch)
> You may not use `wagmi`, RainbowKit, Web3Modal, or any other connector library in this section. Talk to the wallet directly.
- Implement a wallet-connection flow using only `window.ethereum`. Call `eth_requestAccounts`, store the resulting address in your app state, and subscribe to the `accountsChanged` and `chainChanged` events to react to wallet activity (**2 pts**, manual).
- Add a WalletConnect v2 integration from scratch using `@walletconnect/ethereum-provider` directly (no RainbowKit, no Web3Modal). Users without a browser wallet should be able to connect their mobile wallet via QR code (**2 pts**, manual).
- Add a "Switch to Sepolia" button that calls `wallet_switchEthereumChain`, and falls back to `wallet_addEthereumChain` if the chain is not configured in the user's wallet (**2 pts**, manual).

### Chain Detection
- Create a page `/chain-info`.
- Display `chainId`, the latest block number, and the connected user address (**2 pts**, manual).
- Show an error page and redirect the user to it if the connected chain is not Sepolia (**2 pts**, manual).

### Reading and Writing: Free Claim (FakeBAYC)
- Create a page `/fakeBayc`.
- Display the collection name and the total minted token count (**2 pts**, manual).
- Add a button that calls `claimAToken()` on `FakeBAYC` for the connected user.
- Call `ex1_claimedFakeBAYC()` on the Evaluator once your wallet holds at least one `FakeBAYC` token (**2 pts**, automatic).
- Create a page `/fakeBayc/[tokenId]`.
- Display the image, name, and description referenced by the token's metadata URI (**2 pts**, manual).
- Show a clean error state on `/fakeBayc/[tokenId]` when the token does not exist (**2 pts**, manual).
- Create a page `/fakeBayc/gallery/[address]` that lists every `FakeBAYC` token id owned by `[address]`, with lazy-loaded images (**2 pts**, manual).

### Paying Through Functions (FakeNefturians)
- Create a page `/fakeNefturians`.
- Display the current token price in ETH and add a button that calls `buyAToken()` with the required value (**2 pts**, manual).
- Call `ex2_boughtFakeNefturians()` on the Evaluator once your wallet holds at least one `FakeNefturians` token (**2 pts**, automatic).
- Create a page `/fakeNefturians/[address]`.
- List every `FakeNefturians` token id owned by `[address]` (**2 pts**, manual).

### Calling a Minter With a Signature (FakeMeebits)
- Create a page `/fakeMeebits`.
- Read `FakeMeebitsClaimer` to figure out which token ids have not been claimed yet (**2 pts**, manual).
- Let the user pick an unclaimed token id and the matching signature from [`signatures/output-sig.json`](./signatures/output-sig.json), then call `claimAToken(tokenId, signature)` on `FakeMeebitsClaimer` from the user's wallet (**2 pts**, manual).
- Call `ex3_claimedFakeMeebits()` on the Evaluator once your wallet holds at least one `FakeMeebits` token (**2 pts**, automatic).

### UX Quality
- Build a transaction lifecycle UI: show pending state, success with Etherscan link, and user-friendly revert handling for every write call in the dApp (**2 pts**, manual).
- Add ENS reverse-resolution for the connected address: if a primary ENS name is set, display it instead of the raw hex (**2 pts**, manual).

### Extra Points
Extra points are available if you find bugs or improvements this TD can benefit from, and submit a PR to make it better. Ideas include:
- Caching `tokenURI` metadata fetches with SWR or React Query.
- Resolving `ipfs://` URIs with a public gateway and a timeout fallback.
- Dark mode / responsive design.
- Publishing the Evaluator contract on Etherscan using the "Verify and publish" functionality.
- Adding a leaderboard page showing all addresses that have earned points.

## TD Addresses
Network: Ethereum Sepolia
- **TDToken (ERC20 Points)**: [`0x96eA03b5ecfF6EeeD96EE8EcEf1153Aa79a03997`](https://sepolia.etherscan.io/address/0x96eA03b5ecfF6EeeD96EE8EcEf1153Aa79a03997)
- **Evaluator**: [`0x2822168E32E642a93DC677384d8f3F13E5b0EfC2`](https://sepolia.etherscan.io/address/0x2822168E32E642a93DC677384d8f3F13E5b0EfC2)
- **FakeBAYC**: [`0xF865E7DF924c46556d01997B35ed7A3f85069B62`](https://sepolia.etherscan.io/address/0xF865E7DF924c46556d01997B35ed7A3f85069B62)
- **FakeNefturians**: [`0x9a5E2c5B08cA4031d3F7fA1D7AAb8FFE79a988E2`](https://sepolia.etherscan.io/address/0x9a5E2c5B08cA4031d3F7fA1D7AAb8FFE79a988E2)
- **FakeMeebits**: [`0x71A66d19c6ABFc629e0c71D6606105af991713F0`](https://sepolia.etherscan.io/address/0x71A66d19c6ABFc629e0c71D6606105af991713F0)
- **FakeMeebitsClaimer**: [`0x86FB988958dB5A703B3A458284c36976638A67e3`](https://sepolia.etherscan.io/address/0x86FB988958dB5A703B3A458284c36976638A67e3)

> I encourage you to complete all exercises on the same network and with the same address for optimal point tracking.
