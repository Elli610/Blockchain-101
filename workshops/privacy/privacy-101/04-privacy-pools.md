# Part 4: Privacy Pools on Sepolia

## Introduction
Monero and Zcash are separate chains built for privacy. Privacy Pools is a smart-contract protocol that brings shielded balances to Ethereum itself. Its distinguishing idea is the **association set**: when you withdraw, you prove not only that your funds come from *some* deposit, but that they come from a deposit belonging to a set that has been screened. This lets honest users dissociate from illicit funds without revealing which deposit is theirs.

In this part you will use the Privacy Pools testnet on Sepolia as a regular user, then look at what happened on-chain.

* **Network:** Sepolia
* **Grading:** ungraded walkthrough, written answers
* **Tools:** a browser wallet with Sepolia ETH, a block explorer

> **Verify before the session**
> - The testnet app URL and contract addresses. The official [deployments page](https://docs.privacypools.com/deployments) only lists mainnet. The v2 web app lives in [`0xbow-io/privacy-pools-website-v2`](https://github.com/0xbow-io/privacy-pools-website-v2) and the contracts in [`0xbow-io/privacy-pools-v2-monorepo`](https://github.com/0xbow-io/privacy-pools-v2-monorepo); take the Sepolia configuration from there.
> - How long association-set approval takes on testnet. If it is slow, do steps 1 to 3 at the start of the day and come back later.
> - Fallback if the testnet is down: the instructor deploys the open-source v1 contracts ([`0xbow-io/privacy-pools-core`](https://github.com/0xbow-io/privacy-pools-core)) on Sepolia.

## How It Works

### The pool
1. **Deposit.** You send funds to the pool together with a **commitment**, a hash of secrets only you know. The commitment is inserted into a Merkle tree (the *state tree*). The deposit transaction is public: everyone sees your address and the amount.
2. **Private spend.** Later, you produce a zero-knowledge proof that you know the secrets behind *one of the commitments in the tree*, and publish a **nullifier** so the same commitment cannot be spent twice. The proof does not reveal which commitment.
3. **Relayer.** A relayer submits the withdrawal transaction and pays the gas, taking a fee from the withdrawn amount. Your fresh recipient address never needs funding (remember exercise 4 of [part 1](./01-deanonymize.md)).

### The association set
Each deposit gets a **label**. An *association set provider* (ASP) screens deposits and publishes the Merkle root of the labels it approves. A private spend must also prove that your deposit's label is in the latest approved set.

### Ragequit
If the ASP does not approve your deposit, or you simply want out, you can **ragequit**: withdraw your funds publicly, back to the depositing address. You never lose access to your money, but you get no privacy.

### What v2 adds
The first version supported deposit, partial withdrawal and ragequit per asset. Version 2 turns the pool into a shielded ledger: several assets share one anonymity set, and notes can be **transferred privately inside the pool** to another user (encrypted to their viewing key) without leaving it.

## Walkthrough

### 1. Prepare
- Get Sepolia ETH on your student address.
- Create a second, **fresh** address in your wallet. Do not fund it. This will be your withdrawal recipient.
- Open the testnet app at [testnet.privacypools.com](https://testnet.privacypools.com) and connect your student address.

### 2. Create your pool account
The app derives your pool secrets, either from a signature or from a recovery phrase it shows you. Save whatever it gives you in your notes.

**Question:** where are your notes stored? What happens if you clear your browser data?

### 3. Deposit
Deposit a small amount of Sepolia ETH.

Open the transaction in the explorer and answer:
1. Which contract did you call?
2. Which values in the event logs are public? Find your commitment and your label.
3. Could an observer know how much you deposited, and from which address?

### 4. Wait for approval
Your deposit starts as pending. Find where the app shows its status.

**Question:** who decides whether your deposit is approved, and what do they publish on-chain when they do?

### 5. Private transfer (v2)
Pair up with a classmate.
1. Exchange your in-pool receiving identifiers as the app instructs.
2. Send them part of your shielded balance.
3. Look for the transaction in the explorer. What does an observer learn about sender, recipient and amount?

### 6. Withdraw through the relayer
Withdraw part of your balance to your **fresh** address.

Open the transaction and answer:
1. Who is the `from` of the transaction? Is it you?
2. Does your student address appear anywhere in the transaction?
3. What fee did the relayer take?
4. The amount you withdrew is public. Considering [part 1](./01-deanonymize.md), what should you avoid doing with amounts and timing?

### 7. Ragequit
Make a second small deposit, then ragequit it immediately instead of withdrawing privately.

Open the transaction and compare it with step 6. What is revealed this time?

## Reading the Contracts
Find the deployed contracts from your transactions and browse the verified source.

1. Locate the deposit entry point. What checks does it apply before accepting a deposit?
2. Locate the function that verifies a private spend. What are the **public inputs** of the proof? Map each one to a concept above (state root, association set root, nullifier, recipient or relayer data).
3. Why must the recipient (or data committing to it) be a public input? What could a relayer do otherwise?
4. Find where the ASP root is stored and who is allowed to update it.
5. Are the contracts upgradeable? Who holds that power? What could a malicious upgrade do, and is there a delay that would let users exit first?

## Questions
1. Compare the trust assumptions of Privacy Pools (ASP, relayer, contract admin) with Zcash and Monero. Which parties can stop you from transacting privately? Which can steal funds? Which can deanonymize you?
2. The ASP can refuse or revoke approval but cannot freeze funds. Which mechanism guarantees that?
3. A fixed-denomination mixer hides amounts by making them all equal. Privacy Pools allows arbitrary amounts. What new deanonymization risk does that create, and how do partial withdrawals and in-pool transfers help?
4. Is the anonymity set of your withdrawal "all deposits" or "all approved deposits not yet fully withdrawn"? Why does the distinction matter?

## Notes and Hints
- Use small amounts and expect testnet instability.
- Proof generation happens in your browser and can take from a few seconds to a minute.
- Keep the fresh recipient address unfunded until the withdrawal arrives. Funding it yourself links it to you.
