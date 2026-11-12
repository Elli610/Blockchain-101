# Part 5: Stealth Addresses (ERC-5564 and ERC-6538)

## Introduction
In [part 2](./02-monero.md) you saw that a Monero address never appears on-chain: the sender derives a one-time address for each payment. ERC-5564 brings the same idea to Ethereum. The recipient publishes a **stealth meta-address** once; every sender derives a different, unlinkable **stealth address** from it; only the recipient can find and spend those funds.

Stealth addresses hide the *recipient*. They do not hide the sender or the amount. There is no zero-knowledge proof involved, only elliptic-curve Diffie-Hellman, which makes this a good first build.

* **Network:** Sepolia
* **Grading:** Evaluator and off-chain grader, **8 points**
* **Tools:** Node.js, ethers.js, an elliptic-curve library such as [`@noble/secp256k1`](https://github.com/paulmillr/noble-secp256k1). The [ScopeLift stealth address SDK](https://github.com/ScopeLift/stealth-address-sdk) can be used to check your results, but write the derivation yourself first.

## The Building Blocks

### Keys
The recipient has two key pairs on secp256k1:
* a **spending** key pair `(k_spend, K_spend)`,
* a **viewing** key pair `(k_view, K_view)`.

The **stealth meta-address** is the concatenation of the two compressed public keys (33 + 33 = 66 bytes), written `st:eth:0x<K_spend><K_view>`.

### Sending
1. Generate a random **ephemeral** key pair `(r, R)`.
2. Compute the shared secret point `S = r * K_view` and hash its coordinates: `s = keccak256(S.x || S.y)` (64 bytes hashed).
3. The **view tag** is the first byte of `s`.
4. The stealth public key is `P = K_spend + s * G`. The stealth address is the Ethereum address of `P`.
5. Send funds to that address, and publish `R` and the view tag through the announcer contract.

### Receiving
1. For each announcement, compute `S = k_view * R` and `s = keccak256(S.x || S.y)`.
2. If the first byte of `s` does not match the view tag, skip: it is not for you. (This lets you discard about 255 out of 256 announcements after a single multiplication and hash.)
3. Otherwise compute `P = K_spend + s * G` and compare its address with the announced stealth address.
4. If it matches, the private key of the stealth address is `p = k_spend + s (mod n)`.

Note that scanning only needs `k_view`. You can hand the viewing key to a scanning service without giving it the power to spend.

### The contracts
Both are deployed at the same address on every supported chain, including Sepolia.

| Contract | Address | Role |
|---|---|---|
| `ERC6538Registry` | [`0x6538E6bf4B0eBd30A8Ea093027Ac2422ce5d6538`](https://sepolia.etherscan.io/address/0x6538E6bf4B0eBd30A8Ea093027Ac2422ce5d6538#code) | Maps an address to its stealth meta-address |
| `ERC5564Announcer` | [`0x55649E01B5Df198D18D95b5cc5051630cfD45564`](https://sepolia.etherscan.io/address/0x55649E01B5Df198D18D95b5cc5051630cfD45564#code) | Emits an `Announcement` event for each stealth payment |

```solidity
// ERC-6538
function registerKeys(uint256 schemeId, bytes calldata stealthMetaAddress) external;
function stealthMetaAddressOf(address registrant, uint256 schemeId) external view returns (bytes memory);

// ERC-5564
function announce(uint256 schemeId, address stealthAddress, bytes memory ephemeralPubKey, bytes memory metadata) external;
event Announcement(uint256 indexed schemeId, address indexed stealthAddress, address indexed caller, bytes ephemeralPubKey, bytes metadata);
```
Scheme `1` is secp256k1 with view tags. The first byte of `metadata` must be the view tag.

## How to Work on This Part
- The [`EvaluatorStealth`](./contracts/stealth/EvaluatorStealth.sol) contract (called "the Evaluator" below) checks what can be checked on-chain.
- A grader bot holds the instructor's stealth keys. It sends you a stealth payment, and detects the ones you send to the instructor. The instructor runs it periodically: expect a delay between your request and its reaction.
- Put your scripts in your own repository.
- The bot's own derivation code is in [`scripts/lib/stealth.ts`](./scripts/lib/stealth.ts). Write yours first, then use it to find out where your results diverge. `npx hardhat run scripts/stealth-keys.ts` prints a fresh set of keys and its meta-address.

## Points List

### Exercise 1: publish your meta-address (2 points)
1. Generate a spending key pair and a viewing key pair. Do **not** reuse your student account key.
2. Build your 66-byte stealth meta-address.
3. From your student address, call `registerKeys(1, <metaAddress>)` on the registry.
4. Call `evaluator.ex1_registered()`. The Evaluator reads the registry and checks the length and that both halves start with a valid compressed public key prefix (`0x02` or `0x03`). **2 points**.

### Exercise 2: receive a stealth payment (3 points)
1. Call `evaluator.ex2_requestPayment()`. This emits an event that the grader bot listens to.
2. The bot reads your meta-address from the registry, derives a stealth address, sends it a little Sepolia ETH, calls `announce`, and records the **hash** of the stealth address in the Evaluator. You are not told which address it is.
3. Write a scanner: fetch `Announcement` events, filter by view tag, and find the announcement that is yours.
4. Derive the private key of the stealth address.
5. With that key, sign the message (EIP-191 `personal_sign`):
   ```
   I control this stealth address for: 0x<your lowercase student address>
   ```
   `evaluator.claimMessage(yourAddress)` returns the exact string.
6. Call `evaluator.ex2_claim(signature)` from your student address. The Evaluator recovers the signer and compares it with the stealth address recorded for you. **3 points**.

### Exercise 3: send a stealth payment (3 points)
1. Read the instructor's meta-address from the registry (the instructor's registrant address is given in class).
2. Derive a stealth address for it with a fresh ephemeral key.
3. Send at least `0.0001` Sepolia ETH to the stealth address and call `announce` with scheme `1`, the ephemeral public key, and metadata whose first byte is the view tag followed by the 20 bytes of **your student address**.
4. The grader bot scans with the instructor's viewing key. When it finds a funded stealth address that derives correctly, it credits the address found in the metadata. A stealth address counts once, for whoever announced it first. **3 points**.

Sending and announcing in two separate transactions is fragile. A helper contract that forwards ETH and announces in a single call is a good optional extra.

## Questions
1. In exercise 2, the stealth address received ETH and can pay for its own gas. If it had received an ERC-20 token instead, how would you move the token out without funding the address from an account linked to you?
2. In exercise 2 you revealed the link between your student address and the stealth address in order to be graded. Who can see that link now? How could the grading be redesigned to avoid it? (See [part 6](./06-private-voting.md).)
3. In exercise 3, your student address is in the announcement metadata in clear. What does an observer learn? What do they still not learn?
4. What does the view tag cost in privacy? (Hint: it reveals 8 bits of the shared secret hash.)
5. Compare with Monero: which of Monero's three privacy layers does ERC-5564 reproduce, and which are missing?
6. In exercise 2, a student who did [part 1](./01-deanonymize.md) could find their stealth address without any cryptography. How? What would the bot have to do differently to prevent it?
7. Bitcoin's silent payments (BIP 352) achieve the same goal without any announcement. Where does the sender's "ephemeral key" come from? (See [part 7](./07-bitcoin-coinjoin.md).)

## Notes and Hints
- Work with **compressed** public keys (33 bytes) everywhere, and convert to an uncompressed point only to compute the Ethereum address (`keccak256` of the 64-byte `x || y`, last 20 bytes).
- Check exactly what your library returns as the "shared secret" (compressed point, uncompressed point with its `0x04` prefix, or x-coordinate only). This workshop hashes the 64 bytes `x || y`. A mismatch here is the most common bug; other implementations of ERC-5564 may use a different encoding, so compare a test vector before mixing tools.
- `s` must be reduced modulo the curve order `n` before adding it to `k_spend`.
- Announcements are public and unauthenticated. Anyone can announce anything; a correct scanner must tolerate garbage.
- Limit your scan to blocks after you called `ex2_requestPayment()`.
