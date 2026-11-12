# Part 8: Build Your Own Privacy Pool with Noir

## Introduction
In [part 1](./01-deanonymize.md) you broke two naive mixers. In parts 3, 4 and 6 you used systems that all share one construction: **commitments in a Merkle tree, plus a zero-knowledge proof of membership, plus a nullifier**. Now you build it.

`MiniPool` is a fixed-denomination ETH mixer:
- anyone can deposit exactly `0.01 ETH` along with a commitment,
- anyone holding the secrets behind a commitment can withdraw `0.01 ETH` to any address, once, without revealing which deposit is theirs.

The zero-knowledge circuit is written in [Noir](https://noir-lang.org/).

* **Network:** Sepolia
* **Grading:** Evaluator, **12 points** (plus a bonus)
* **Tools:** Hardhat or Foundry, `nargo` (Noir compiler), `bb` (Barretenberg prover)

> **This is an educational contract.** It is unaudited and deliberately minimal. Deploy it on test networks only.

> **Verify before the session**
> - The Noir and Barretenberg versions pinned by the starter kit, and the exact `bb` commands for that version (flags have changed between releases).
> - That the Poseidon implementation used in the circuit and the one used in Solidity produce identical outputs. The starter kit must ship a test vector.

## The Design

### Commitment
The depositor picks two random field elements, a `nullifier` and a `secret`, and computes:
```
commitment    = H(nullifier, secret)
nullifierHash = H(nullifier)
```
`H` is a hash function that is cheap to prove in a circuit (Poseidon). Only `commitment` is sent with the deposit.

### Merkle tree
The contract keeps an append-only **incremental Merkle tree** of depth 20 whose leaves are the commitments. It stores the last 30 roots, so that a proof generated just before someone else's deposit is still accepted.

### Withdrawal proof
To withdraw, the user proves in zero knowledge:

> "I know `nullifier`, `secret` and a Merkle path such that `H(nullifier, secret)` is a leaf of the tree with root `root`, and `H(nullifier)` equals `nullifierHash`."

| Input | Visibility | Purpose |
|---|---|---|
| `nullifier`, `secret` | private | The note |
| `path_siblings[20]`, `path_index` | private | Where the note is in the tree |
| `root` | public | Which tree state the proof is about |
| `nullifier_hash` | public | Prevents spending the same note twice |
| `recipient` | public | Binds the proof to a destination |
| `relayer`, `fee` | public | Binds the proof to a relayer and its fee |

`recipient`, `relayer` and `fee` are not used in the logic of the circuit. They are public inputs so that the proof becomes invalid if anyone changes them. Without this, whoever sees your withdrawal in the mempool could copy the proof and redirect the funds.

### Contract
```solidity
interface IMiniPool {
    function DENOMINATION() external view returns (uint256);
    function LEVELS() external view returns (uint32);

    function deposit(bytes32 commitment) external payable;
    function withdraw(
        bytes calldata proof,
        bytes32 root,
        bytes32 nullifierHash,
        address payable recipient,
        address payable relayer,
        uint256 fee
    ) external;

    function currentRoot() external view returns (bytes32);
    function isKnownRoot(bytes32 root) external view returns (bool);
    function isSpent(bytes32 nullifierHash) external view returns (bool);
    function nextIndex() external view returns (uint32);

    event Deposit(bytes32 indexed commitment, uint32 leafIndex, uint256 timestamp);
    event Withdrawal(address recipient, bytes32 nullifierHash, address indexed relayer, uint256 fee);
}
```
`withdraw` must:
1. revert if `fee > DENOMINATION`,
2. revert if `nullifierHash` is already spent,
3. revert if `root` is not one of the stored recent roots,
4. revert if the proof does not verify against the public inputs `(root, nullifierHash, recipient, relayer, fee)`,
5. mark `nullifierHash` as spent,
6. send `DENOMINATION - fee` to `recipient` and `fee` to `relayer`.

## How to Work on This Part
1. Start from the starter kit in [`circuits/`](./circuits) and [`contracts/`](./contracts) (provided with the workshop).
2. Write the circuit, generate the Solidity verifier, write `MiniPool`, deploy both on Sepolia.
3. Register your pool with `evaluator.submitPool(<yourPool>)`.
4. The Evaluator cannot generate proofs. **You** generate them off-chain and pass them to the Evaluator, which then calls your pool and checks its behaviour.

Each student is assigned a recipient address by the Evaluator: read it with `evaluator.recipientOf(yourAddress)`. Proofs submitted for grading must use that recipient, `relayer = address(0)` and `fee = 0` unless stated otherwise.

## Points List

### Step 1: the circuit (ungraded, but everything depends on it)
1. Write `main.nr` with the inputs listed above.
2. Implement the Merkle root computation: starting from the commitment, hash with each sibling, on the left or right according to the corresponding bit of `path_index`.
3. Write Noir tests (`nargo test`) for: a valid note, a wrong secret, a wrong sibling.
4. Compile and generate the verifier contract:
   ```bash
   nargo compile
   bb write_vk -b ./target/minipool.json -o ./target
   bb write_solidity_verifier -k ./target/vk -o ./contracts/Verifier.sol
   ```
   Use the flags documented for the pinned `bb` version, in particular the option that selects the EVM-compatible (Keccak) transcript when writing the key and when proving.

### Step 2: deploy and register (1 point)
Deploy the verifier and `MiniPool`. Call `evaluator.submitPool(<yourPool>)`. The Evaluator checks `DENOMINATION() == 0.01 ether` and `LEVELS() == 20`. **1 point**.

### Step 3: deposits (2 points)
1. Generate a note off-chain (`nullifier`, `secret`) and compute its commitment.
2. Send `0.01` Sepolia ETH to the Evaluator, then call `evaluator.ex3_deposit(commitment)`. The Evaluator calls `deposit` on your pool and checks that:
   - `nextIndex()` increased by one,
   - `currentRoot()` changed and `isKnownRoot(newRoot)` is true,
   - a deposit with the wrong value reverts.
   **2 points**.

### Step 4: a full withdrawal (4 points)
1. Rebuild the tree off-chain from your pool's `Deposit` events and compute the Merkle path of your note.
2. Generate a proof with `recipient = evaluator.recipientOf(you)`.
3. Call `evaluator.ex4_withdraw(proof, root, nullifierHash)`. In one transaction the Evaluator:
   - calls `withdraw` with a **different recipient** and expects a revert (**1 point**),
   - calls `withdraw` with a non-zero fee that was not in the proof and expects a revert (**1 point**),
   - calls `withdraw` with the correct parameters and checks that the recipient's balance increased by exactly `0.01 ETH` (**1 point**),
   - calls `withdraw` again with the same proof and expects a revert (**1 point**).

### Step 5: unknown root (1 point)
Deposit a new note, generate a valid proof, and call `evaluator.ex5_unknownRoot(proof, nullifierHash)`. The Evaluator submits it with a root that your pool has never had and expects a revert. The note stays unspent. **1 point**.

### Step 6: root history (2 points)
1. Generate a proof for the unspent note from step 5 against the current root.
2. **Before** submitting it, make another deposit so that the current root changes.
3. Call `evaluator.ex6_staleRoot(proof, root, nullifierHash)`. The Evaluator checks that `root != currentRoot()` and that the withdrawal still succeeds. **2 points**.

### Step 7: relayer (2 points)
1. Deposit a note. Generate a proof with `relayer = address(evaluator)` and `fee = 0.001 ether`.
2. Call `evaluator.ex7_relay(proof, root, nullifierHash)`. The Evaluator acts as the relayer and checks that it received the fee and the recipient received `0.009 ETH`. **2 points**.

### Bonus: association set (3 points)
Extend your pool in the spirit of [Privacy Pools](./04-privacy-pools.md).
1. The Evaluator publishes an **association root**: the root of a Merkle tree containing only "approved" commitments. Your commitments from the previous steps are approved when you call `evaluator.requestApproval(commitment)`.
2. Add a second Merkle path to your circuit proving that your commitment is also in the association tree, with `association_root` as an extra public input.
3. Add `withdrawWithAssociation(...)` to your pool; it must check the association root against the Evaluator.
4. Call `evaluator.bonus_association(...)`. The Evaluator checks that an approved note can withdraw and that a proof against a made-up association root is rejected. **3 points**.

## Attack Your Own Pool (ungraded)
Go back to the heuristics of [part 1](./01-deanonymize.md) and apply them to your pool and your classmates' pools.

1. Your pool has only your own deposits in it. What is your anonymity set?
2. In step 4, the deposit and the withdrawal are a few minutes apart. What does an observer conclude?
3. Why is a fixed denomination necessary here, when Privacy Pools and Zcash allow any amount?
4. You withdrew to a fresh address. How does it pay for gas, with and without the relayer of step 7?
5. The `Deposit` event reveals the leaf index and timestamp. Is that a problem?
6. What would happen if two users deposited the same commitment?
7. What would happen if `H` were not collision resistant? If the verifier contract had a bug? If the proving system needed a trusted setup and the ceremony were compromised?

## Notes and Hints
- **Field elements.** Circuit values live in the BN254 scalar field. Generate `nullifier` and `secret` as random values smaller than the field modulus, and make sure every `bytes32` you pass on-chain is reduced the same way.
- **Addresses as public inputs.** Pass `recipient` and `relayer` to the circuit as field elements (`uint256(uint160(addr))`), and build the public input array in the contract in the same order as in `main.nr`.
- **Same hash on both sides.** The tree is hashed on-chain at deposit time and inside the circuit at withdrawal time. If the two Poseidon implementations differ in any parameter, no proof will ever verify. Test with a known vector first.
- **Zero values.** Empty subtrees need a well-defined hash at each level. Precompute them once.
- **Do not reuse a note.** Depositing the same commitment twice lets you withdraw only once: the nullifier is the same.
- **Debugging a rejected proof.** Verify it off-chain with `bb verify` first. If it verifies off-chain and fails on-chain, the public inputs differ: log them from both sides and compare.
- **Gas.** Verifying a proof on-chain costs a few hundred thousand gas at least, and hashing 20 tree levels at deposit is not free either. Measure both.
