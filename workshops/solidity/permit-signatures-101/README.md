# Permit and Signatures 101

## Introduction
Welcome! This is an automated workshop covering three closely related standards used everywhere in modern EVM applications:

1. **EIP-191 / `personal_sign`**: the classic prefixed message signature used by wallets.
2. **EIP-712 typed data**: structured, self-describing signatures with a domain separator.
3. **ERC-2612 `permit`**: gasless ERC-20 approvals via an EIP-712 signature.
4. **Permit2**: Uniswap's universal permit contract that adds signature-based transfers on top of any ERC-20, regardless of whether it implements ERC-2612.
5. **ERC-1271** (bonus): signature validation for smart-contract wallets.

By the end of the workshop you will have:
* signed and verified messages using both `personal_sign` and EIP-712 typed data,
* implemented on-chain signature recovery with correct domain separation, deadline and malleability protection,
* built and deployed your own ERC-2612 permit token from scratch (no library shortcuts),
* used Permit2 with both `SignatureTransfer` and `AllowanceTransfer`,
* optionally, implemented an ERC-1271 smart-contract wallet.

This workshop assumes you have completed [ERC20 101](../erc20-101/) and are comfortable reading and deploying ERC-20 contracts.

## How to Work on This TD
The TD ships with three deployed contracts:
- A points token, ticker **TD-PERMIT-101**, used to keep track of your score. Transfers are disabled: points cannot be moved between addresses.
- A **`MockUnderlying`** ERC-20 (ticker **MOCK**) that already supports `permit()`. It exposes a public `getTokens(uint256)` faucet.
- An **`Evaluator`** contract that grades every exercise and mints TD-PERMIT-101 tokens when a test passes.

Your job is to collect as many TD-PERMIT-101 points as possible. The rules:
- To receive points, you must trigger `TDERC20.distributeTokens(msg.sender, n)` inside the Evaluator by successfully calling one of the `exN_...` functions.
- You will need to submit ONE solution contract that implements [`IExerciseSolution.sol`](./contracts/IExerciseSolution.sol). Register it via `submitExercise(<yourSolution>)`. You can resubmit at any time (a different contract cannot be paired with two different students).
- A high-level description of each exercise is given below. For the exact requirements, read [`Evaluator.sol`](./contracts/Evaluator.sol).
- Off-chain signing is done from your own machine using the helper scripts in [`scripts/`](./scripts). Feel free to adapt them or write your own.

### Getting to Work
1. Clone the repo and enter this workshop:
   ```bash
   git clone <repo url>
   cd workshops/solidity/permit-signatures-101
   npm install
   ```
2. Create a `.env` file based on [`.env.example`](./.env.example). You need at minimum a `PRIVATE_KEY` and a `SEPOLIA_RPC_URL`.
3. Test your connection:
   ```bash
   npx hardhat console --network sepolia
   ```
4. Copy the deployed contract addresses (see the [Deployed Addresses](#deployed-addresses) section at the bottom) into your `.env`.
5. Work through the exercises below in order.

## Understanding the Building Blocks

Before jumping into the exercises, make sure the following mental model is clear.

### `personal_sign` (EIP-191)
When a wallet signs a "message" via `personal_sign`, it hashes:
```
keccak256("\x19Ethereum Signed Message:\n" || len(message) || message)
```
where `len(message)` is the ASCII decimal string of the length in bytes. On-chain you reproduce this same construction and then call `ecrecover`.

### EIP-712 typed data
For every EIP-712 signed struct there are three pieces:
1. A **domain separator**, one hash per contract, computed as:
   ```
   DOMAIN_SEPARATOR = keccak256(abi.encode(
       keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
       keccak256(bytes(name)),
       keccak256(bytes(version)),
       chainId,
       verifyingContract
   ))
   ```
2. A **type hash** for the struct, e.g. for the workshop's `Greeting`:
   ```
   GREETING_TYPEHASH = keccak256(
       "Greeting(address who,string content,uint256 nonce,uint256 deadline)"
   )
   ```
3. A **struct hash**, computed by hashing the type hash with the fields (strings and bytes are hashed first):
   ```
   structHash = keccak256(abi.encode(
       GREETING_TYPEHASH,
       who,
       keccak256(bytes(content)),
       nonce,
       deadline
   ))
   ```
The final digest to sign is:
```
digest = keccak256(abi.encodePacked(hex"1901", DOMAIN_SEPARATOR, structHash))
```
That digest is the input to `ecrecover(digest, v, r, s)`.

### Signature safety
Every production verifier MUST enforce:
* **Deadline check**: refuse signatures whose declared deadline is in the past.
* **Nonce check**: prevent replay by consuming a per-signer nonce.
* **Malleability check**: reject signatures where `s > secp256k1n / 2`. The half order is:
  ```
  0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0
  ```
  For any valid signature `(v, r, s)` there is a "malleable twin" `(v', r, N - s)` with `v' = 27+28-v` that verifies the same public key. Reject it.
* **Zero-signer check**: `ecrecover` returns `address(0)` for garbage input. Reject that too.

### ERC-2612 permit
An ERC-2612 token supports:
```solidity
function permit(
    address owner,
    address spender,
    uint256 value,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
) external;
```
Internally, `permit` builds an EIP-712 struct of the form:
```
Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)
```
using the token's own DOMAIN_SEPARATOR, recovers the signer, and sets `allowance[owner][spender] = value`. Each call increments `nonces(owner)` by 1.

### Permit2
Permit2 is a single canonical contract that lives at:
```
0x000000000022D473030F116dDEE9F6B43aC78BA3
```
on every EVM chain (including Sepolia). To use it against any ERC-20:
1. The token holder first does a ONE-TIME `token.approve(PERMIT2, type(uint256).max)`.
2. From then on, they can grant per-signature or per-allowance permissions to third parties WITHOUT another on-chain approve.

Permit2 exposes two flavours:
* **SignatureTransfer (`permitTransferFrom`)**: one-shot. The signature encodes the exact token, amount and nonce; the spender consumes it once to pull tokens.
* **AllowanceTransfer (`permit` + `transferFrom`)**: sets a time-limited allowance registered inside Permit2 for a given spender, then the spender can move tokens as many times as they want (up to the amount, up to the expiration).

## Points List
> See the deployed contract addresses at the end of this document.

Total points available: **36**.

### Setting Up (2 points)
- Create a Git repository and share it with the instructor.
- Get an RPC API key.
- Deploy a first `Solution` contract implementing [`IExerciseSolution.sol`](./contracts/IExerciseSolution.sol) (any stub will do at first), and call `submitExercise(<yourSolution>)` on the Evaluator. This grants **2 points**.

### Part 1: `personal_sign` (2 points)
1. Read the message string built by `Evaluator.ex1_personalSign`. It is exactly:
   ```
   I want Permit101 points at address: 0x<your lowercase address>
   ```
2. Sign it with `personal_sign` (i.e. `signer.signMessage` in ethers). See [`scripts/sign-personal.ts`](./scripts/sign-personal.ts).
3. Call `ex1_personalSign(bytes signature)` on the Evaluator. **2 points**.

### Part 2: EIP-712 typed data (2 points)
1. Query the Evaluator for your assigned `content`:
   ```
   evaluator.getContentFor(yourAddress) -> string
   ```
2. Query the Evaluator for your current nonce: `evaluator.evaluatorNonce(yourAddress)`.
3. Sign a `Greeting{who, content, nonce, deadline}` typed struct using the Evaluator's EIP-712 domain (`name = "Permit101Evaluator"`, `version = "1"`, chainId = 11155111 on Sepolia, `verifyingContract = evaluator`).
4. Call `ex2_signTypedGreeting(content, nonce, deadline, v, r, s)`. **2 points**.

### Part 3: on-chain verification in your own contract (3 points)
1. Extend your solution contract with a `recoverGreeting(...)` implementation that reconstructs the digest using the SAME domain and typehash as the Evaluator, then calls `ecrecover`. It MUST enforce:
   - revert with `"expired"` if `deadline < block.timestamp`,
   - revert with `"malleable"` if `s > secp256k1n / 2`,
   - revert with `"bad v"` if `v` is not 27 or 28,
   - revert with `"invalid sig"` if `ecrecover` returns `address(0)`.
2. Sign a new Greeting with a fresh nonce (the previous exercise consumed it).
3. Call `ex3_recoverInSolution(content, nonce, deadline, v, r, s)`. The Evaluator will call YOUR `recoverGreeting` and check the return value equals `msg.sender`. **3 points**.

### Part 4: signature safety (4 points)
1. Sign a fresh, canonical (low-s) Greeting. Ethers guarantees canonical signatures; if you sign manually, verify that `s <= secp256k1n / 2`.
2. Call `ex4_rejectMalleable(content, nonce, deadline, v, r, s)`. The Evaluator will:
   - verify your canonical sig recovers to you,
   - compute the malleable twin (flip s and v),
   - call `recoverGreeting` on your contract with the twin and expect it to revert.
   **2 points**.
3. Call `ex5_rejectExpired(content, nonce, v, r, s)` with any (v, r, s). The Evaluator invokes your `recoverGreeting` with `deadline = 0` and expects a revert. **2 points**.

### Part 5: ERC-2612 permit against `MockUnderlying` (4 points)
1. Call `mockUnderlying.getTokens(<amount>)` to top up your MOCK balance.
2. Sign a permit granting the Evaluator the right to spend some MOCK. See [`scripts/sign-permit-2612.ts`](./scripts/sign-permit-2612.ts).
3. Call `ex6_permitMock(value, deadline, v, r, s)`. **2 points**.
4. Sign another permit (nonce has incremented). Call `ex7_permitAndPull(value, deadline, v, r, s)`. The Evaluator will consume the permit AND immediately `transferFrom` the tokens. **2 points**.

### Part 6: build your own permit-enabled ERC-20 (7 points)
This is the meat of the workshop. Do NOT inherit a library implementation of `permit`. Write it yourself.

1. Write a contract `MyPermitToken` that:
   - implements the standard `IERC20` surface,
   - exposes a public `mint(address, uint256)` or faucet so you can top up your test balance,
   - exposes `nonces(address) -> uint256`,
   - exposes `DOMAIN_SEPARATOR() -> bytes32` computed at construction using the token's own name, `"1"` as the version, the chainId and the token address,
   - exposes `permit(owner, spender, value, deadline, v, r, s)` that:
     * reverts on expired deadline,
     * rebuilds the EIP-712 digest for the type
       `Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)`,
     * recovers the signer with `ecrecover` and requires it equals `owner` and is not `address(0)`,
     * enforces canonical `s` (reject malleable signatures),
     * increments `nonces[owner]` on success,
     * sets `allowance[owner][spender] = value`.
2. Deploy it, and update your solution contract's `getPermitToken()` to return its address.
3. Call `ex8_deployedPermitToken()`. The Evaluator checks the metadata and rebuilds the expected `DOMAIN_SEPARATOR` to make sure yours was NOT hard-coded (chainId must be baked in dynamically). **2 points**.
4. Sign a permit for the Evaluator against YOUR token. Use `TOKEN=<yourToken>` with the same script as in Part 5. Call `ex9_permitOnStudentToken(value, deadline, v, r, s)`. **3 points**.
5. Call `ex10_rejectExpiredOnStudentToken(value, v, r, s)` with any (v, r, s). The Evaluator will call `permit` on your token with `deadline = 0` and expect a revert. **2 points**.

### Part 7: replay protection (2 points)
1. Sign one fresh permit for your token.
2. Call `ex11_rejectReplayOnStudentToken(value, deadline, v, r, s)`. The Evaluator consumes the permit once (must succeed) and then attempts the exact same call again, expecting a revert. This confirms your nonce increments correctly. **2 points**.

### Part 8: Permit2 (7 points)
1. Approve Permit2 to spend your MOCK once. From any script or Etherscan:
   ```
   mockUnderlying.approve(0x000000000022D473030F116dDEE9F6B43aC78BA3, type(uint256).max)
   ```
   Call `ex12_approvePermit2()`. **1 point**.
2. Sign a Permit2 `PermitTransferFrom` using [`scripts/sign-permit2-transfer.ts`](./scripts/sign-permit2-transfer.ts). Pass the resulting signature to `ex13_permit2SignatureTransfer(amount, nonce, deadline, signature)`. **3 points**.
3. Sign a Permit2 `PermitSingle` using [`scripts/sign-permit2-allowance.ts`](./scripts/sign-permit2-allowance.ts). Pass the resulting signature to `ex14_permit2AllowanceTransfer(amount, expiration, nonce, sigDeadline, signature)`. **3 points**.

### Part 9 (bonus): ERC-1271 smart wallet (3 points)
1. Write and deploy a small `SmartWallet` contract that stores your EOA address as `owner` and implements:
   ```solidity
   function isValidSignature(bytes32 hash, bytes memory signature) external view returns (bytes4);
   ```
   It should recover the signer from `signature` (matching whatever format you produce off-chain) and return `0x1626ba7e` if it equals `owner`, and any other value otherwise.
2. Update `getSmartWallet()` in your solution contract to return the wallet address.
3. Read `Evaluator.smartWalletChallenge(yourAddress)` to get the deterministic hash your wallet must accept.
4. Produce a signature that your wallet will validate for that hash. See [`scripts/sign-1271.ts`](./scripts/sign-1271.ts) for a starter.
5. Call `ex15_smartWallet1271(signature)`. **3 points**.

## Notes and Hints
- **Nonces**: `evaluatorNonce[msg.sender]` in the Evaluator increments after ex2 and ex3. Fetch it fresh before each signature.
- **Chain id on Sepolia**: `11155111`. Bake it into every domain separator dynamically (read `block.chainid`), not as a hard-coded literal, otherwise cross-chain replay becomes possible if the contract is redeployed.
- **`personal_sign` vs typed data**: ethers.js `signer.signMessage(x)` produces a `personal_sign` result. `signer.signTypedData(domain, types, value)` produces an EIP-712 result. Do NOT mix them.
- **Domain name for `MockUnderlying`**: `"Mock Underlying"`. Version: `"1"`.
- **Malleable twin**: given `(v, r, s)` with `s <= N/2`, the twin is `(v', r, N - s)` where `v' = 55 - v` (i.e. 27 -> 28, 28 -> 27) and `N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141`.
- **Canonical `s` in ethers**: ethers always emits canonical signatures; if you construct signatures manually, remember to normalise.
- **Permit2 nonces**:
  * `SignatureTransfer` uses a bitmap-based nonce. Any 256-bit value that has not yet been consumed works.
  * `AllowanceTransfer` uses a sequential 48-bit nonce per `(owner, token, spender)`. Read it from `permit2.allowance(owner, token, spender)` before signing.
- **Debugging failing signatures**: reproduce the digest yourself in JS (`ethers.TypedDataEncoder.hash(domain, types, value)`) and compare to what your contract computes via a view helper.
- **Do not hard-code the domain separator** in your token. Compute it in the constructor from `block.chainid`. Otherwise `ex8` will fail.
- **Do not use `abi.encodePacked` for structs**. EIP-712 struct hashing uses `abi.encode` on fixed-size fields (with strings / bytes replaced by their keccak256).

## Deployed Addresses

> Sepolia (chainId 11155111). All three contracts are verified on Etherscan and Sourcify.

| Contract | Address |
|---|---|
| `TDERC20_PERMIT` (points token) | [`0x0Fc3679199493fb5fD7fe1132dfC8eF0b48C9661`](https://sepolia.etherscan.io/address/0x0Fc3679199493fb5fD7fe1132dfC8eF0b48C9661#code) |
| `MockUnderlying` (MOCK)         | [`0x1C9d04b35642801C8Ff4591B6E8ba49fCDF1Bb77`](https://sepolia.etherscan.io/address/0x1C9d04b35642801C8Ff4591B6E8ba49fCDF1Bb77#code) |
| `Evaluator`                     | [`0xB91F87D09a6582b25B20149C60Ad40f23F99d8Dc`](https://sepolia.etherscan.io/address/0xB91F87D09a6582b25B20149C60Ad40f23F99d8Dc#code) |
| `Permit2` (canonical)           | [`0x000000000022D473030F116dDEE9F6B43aC78BA3`](https://sepolia.etherscan.io/address/0x000000000022D473030F116dDEE9F6B43aC78BA3#code) |

Evaluator EIP-712 domain:
```
name             = "Permit101Evaluator"
version          = "1"
chainId          = 11155111
verifyingContract = 0xB91F87D09a6582b25B20149C60Ad40f23F99d8Dc
DOMAIN_SEPARATOR = 0x29bece5ac381f89f9f339eb8601469aa01277d73f3942dbd568eff5f702b19dd
```
