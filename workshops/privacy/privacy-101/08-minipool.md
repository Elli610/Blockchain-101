# Part 8: Build Your Own Privacy Pool with Noir

## Introduction
In [part 1](./01-deanonymize.md) you broke custodial mixers whose operator knew everything. In parts 3, 4 and 6 you used systems that all share one construction: **commitments in a Merkle tree, plus a zero-knowledge proof of membership, plus a nullifier**. Now you build it.

`MiniPool` is a fixed-denomination ETH mixer with no operator:
- anyone can deposit exactly `0.001 ETH` along with a commitment,
- anyone holding the secrets behind a commitment can withdraw `0.001 ETH` to any address, once, without revealing which deposit is theirs.

The zero-knowledge circuit is written in [Noir](https://noir-lang.org/).

* **Network:** Sepolia
* **Grading:** Evaluator, **12 points** (plus a 3-point bonus)
* **Tools:** Hardhat, and the Noir toolchain. The workshop's npm dependencies include the Noir compiler and the Barretenberg prover, so nothing else has to be installed. `nargo` is optional but gives you `nargo test`.

> **This is an educational contract.** It is unaudited and deliberately minimal. Deploy it on test networks only.

> **Verify before the session**
> - `npm test` passes. `test/pool-zk.test.ts` compiles the reference circuits, generates their verifiers and replays this whole part with real proofs. It needs network access the first time, to fetch the Noir Poseidon library.
> - The toolchain versions are pinned in `package.json` (`@noir-lang/noir_js`, `@noir-lang/noir_wasm`, `@aztec/bb.js`). If students also use the `nargo` and `bb` command-line tools, their versions must be compatible with those.

## The Design

### Commitment
The depositor picks two random field elements, a `nullifier` and a `secret`, and computes:
```
commitment    = H(nullifier, secret)
nullifierHash = H(nullifier)
```
`H` is Poseidon, a hash function that is cheap to prove in a circuit. Only `commitment` is sent with the deposit.

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
Your pool implements [`IMiniPool`](./contracts/pool/IMiniPool.sol):
```solidity
interface IMiniPool is IIncrementalMerkleTree {
    function DENOMINATION() external view returns (uint256);

    function deposit(bytes32 commitment) external payable;
    function withdraw(
        bytes calldata proof,
        bytes32 root,
        bytes32 nullifierHash,
        address payable recipient,
        address payable relayer,
        uint256 fee
    ) external;

    function isSpent(bytes32 nullifierHash) external view returns (bool);

    event Deposit(bytes32 indexed commitment, uint32 leafIndex, uint256 timestamp);
    event Withdrawal(address recipient, bytes32 nullifierHash, address indexed relayer, uint256 fee);
}
```
`IIncrementalMerkleTree` adds `LEVELS()`, `nextIndex()`, `currentRoot()` and `isKnownRoot(root)`.

`deposit` must revert unless `msg.value == DENOMINATION`, insert the commitment in the tree and emit `Deposit` with the index of the new leaf.

`withdraw` must:
1. revert if `fee > DENOMINATION`,
2. revert if `nullifierHash` is already spent,
3. revert if `root` is not one of the stored recent roots,
4. revert if the proof does not verify against the public inputs `(root, nullifierHash, recipient, relayer, fee)`,
5. mark `nullifierHash` as spent,
6. send `DENOMINATION - fee` to `recipient` and `fee` to `relayer`.

## What Is Provided
This is a shortened build: the plumbing is given, the two pieces that matter are yours.

| File | What it is |
|---|---|
| [`contracts/pool/IncrementalMerkleTree.sol`](./contracts/pool/IncrementalMerkleTree.sol) | The Poseidon Merkle tree with root history. Inherit from it. Read it: it is 70 lines. |
| [`contracts/pool/IVerifier.sol`](./contracts/pool/IVerifier.sol) | Interface of the generated verifier. |
| [`circuits/minipool`](./circuits/minipool) | The circuit skeleton, with its inputs declared and `TODO`s. **You write this.** |
| [`scripts/pool-verifier.ts`](./scripts/pool-verifier.ts) | Compiles the circuit and writes `contracts/Verifier.sol`. |
| [`scripts/pool-note.ts`](./scripts/pool-note.ts) | Creates a note and saves it under `notes/`. |
| [`scripts/pool-prove.ts`](./scripts/pool-prove.ts) | Rebuilds the tree from your pool's `Deposit` events and generates a withdrawal proof. |
| [`scripts/lib/pool.ts`](./scripts/lib/pool.ts), [`scripts/lib/noir.ts`](./scripts/lib/noir.ts) | The code behind those scripts. |

**You write** the circuit and the `MiniPool` contract.

## How to Work on This Part
1. Fill in [`circuits/minipool/src/main.nr`](./circuits/minipool/src/main.nr).
2. Generate the verifier, write `MiniPool`, deploy both on Sepolia.
3. Register your pool with `submitPool(<yourPool>)` on the [`EvaluatorPool`](./contracts/pool/EvaluatorPool.sol) contract (called "the Evaluator" below).
4. The Evaluator cannot generate proofs. **You** generate them off-chain and pass them to the Evaluator, which then calls your pool with correct and with tampered parameters and checks how it reacts.

Each student is assigned a recipient address by the Evaluator: `evaluator.recipientOf(yourAddress)`. Nobody holds its key, so what you withdraw there is burned. Proofs submitted for grading must use that recipient, `relayer = address(0)` and `fee = 0` unless stated otherwise. `scripts/pool-prove.ts` uses these defaults.

## Points List

### Step 1: the circuit (ungraded, but everything depends on it)
1. Implement `compute_root`: starting from the leaf, hash with each sibling, on the left or right according to the corresponding bit of the index.
2. Implement the three checks of `main`.
3. Add tests that must fail: a wrong secret, a wrong sibling, a wrong nullifier hash. If you have `nargo` installed, run them with `nargo test` inside `circuits/minipool`.
4. Generate the verifier contract:
   ```bash
   npx hardhat run scripts/pool-verifier.ts
   ```
   This writes `contracts/Verifier.sol`, which contains a `HonkVerifier` contract and two libraries it must be linked with. With the command-line tools, the equivalent is `nargo compile`, then `bb write_vk` and `bb write_solidity_verifier` with the EVM target.

   Regenerate and redeploy the verifier **every time you change the circuit**.

### Step 2: deploy and register (1 point)
1. Write `MiniPool`. It inherits `IMiniPool` and `IncrementalMerkleTree`, and takes the verifier address in its constructor.
2. Deploy the verifier and the pool. From a Hardhat script:
   ```ts
   import { ethers } from "hardhat";
   import { POSEIDON_T3, deployHonkVerifier } from "./lib/deploy";

   const verifier = await deployHonkVerifier("contracts/Verifier.sol");
   const MiniPool = await ethers.getContractFactory("MiniPool", {
     libraries: { [POSEIDON_T3]: process.env.POSEIDON_T3_ADDRESS! },
   });
   const pool = await MiniPool.deploy(verifier.target);
   ```
   `IncrementalMerkleTree` calls the `PoseidonT3` library, which is already deployed (address in the [README](./README.md#deployed-addresses)).
3. Call `evaluator.submitPool(<yourPool>)`. The Evaluator checks `DENOMINATION() == 0.001 ether` and `LEVELS() == 20`. **1 point**.

### Step 3: deposits (2 points)
1. Create a note:
   ```bash
   npx hardhat run scripts/pool-note.ts
   ```
2. Call `evaluator.ex3_deposit(commitment)` **with a value of `0.001` ETH**. The Evaluator deposits it into your pool and checks that:
   - a deposit of the wrong amount reverts,
   - `nextIndex()` increased by one,
   - `currentRoot()` changed and `isKnownRoot(newRoot)` is true.
   **2 points**.

All the deposits of this part go through `ex3_deposit`. You only get the points once.

### Step 4: a full withdrawal (4 points)
1. Generate a proof for your note:
   ```bash
   POOL_ADDRESS=<yourPool> NOTE_FILE=notes/<commitment>.json \
     npx hardhat run --network sepolia scripts/pool-prove.ts
   ```
2. Call `evaluator.ex4_withdraw(proof, root, nullifierHash)`. In one transaction the Evaluator:
   - calls `withdraw` with a **different recipient** and expects a revert,
   - calls `withdraw` with a relayer and a fee that are not in the proof and expects a revert,
   - calls `withdraw` with the correct parameters and checks that the recipient received exactly `0.001 ETH` and that `isSpent(nullifierHash)` is now true,
   - calls `withdraw` again with the same proof and expects a revert.

   All four checks must pass. **4 points**.

### Step 5: unknown root (1 point)
1. Deposit a new note (step 3) and generate a valid proof for it.
2. Call `evaluator.ex5_unknownRoot(proof, nullifierHash)`. The Evaluator submits it with a root that your pool has never had and expects a revert. The note must stay unspent. **1 point**.

### Step 6: root history (2 points)
1. Keep the proof of step 5: it was made against what was then the current root.
2. **Before** submitting it, make another deposit so that the current root changes.
3. Call `evaluator.ex6_staleRoot(proof, root, nullifierHash)`. The Evaluator checks that `root != currentRoot()` and that the withdrawal still succeeds. **2 points**.

### Step 7: relayer (2 points)
1. Generate a proof for the note deposited in step 6, with the Evaluator as relayer and a fee of `0.0001` ETH:
   ```bash
   RELAYER=<EvaluatorPool address> FEE=100000000000000 POOL_ADDRESS=<yourPool> NOTE_FILE=notes/<commitment>.json \
     npx hardhat run --network sepolia scripts/pool-prove.ts
   ```
2. Call `evaluator.ex7_relay(proof, root, nullifierHash)`. The Evaluator acts as the relayer and checks that it received the fee and the recipient received `0.0009 ETH`. **2 points**.

### Bonus: association set (3 points)
Extend your pool in the spirit of [Privacy Pools](./04-privacy-pools.md). Here the Evaluator plays the association set provider: it keeps its own Merkle tree (same depth, same hash) containing only "approved" commitments.

1. Deposit a note, then call `evaluator.requestApproval(commitment)`. This appends your commitment to the Evaluator's tree and emits `CommitmentApproved(commitment, leafIndex)`. (A real provider would screen the deposit first. This one approves anything.)
2. Write a second circuit that additionally proves that your commitment is in the association tree. Its public inputs, in order: `root`, `association_root`, `nullifier_hash`, `recipient`, `relayer`, `fee`. Generate its verifier:
   ```bash
   CIRCUIT=circuits/<your second circuit> VERIFIER=contracts/AssociationVerifier.sol \
     npx hardhat run scripts/pool-verifier.ts
   ```
   Two generated verifier files declare contracts with the same names. Refer to them by their fully qualified name, as `deployHonkVerifier` does.
3. Add `withdrawWithAssociation(...)` to your pool (see `IMiniPoolAssociation`). It must refuse any `associationRoot` for which `evaluator.isKnownAssociationRoot(associationRoot)` is false.
4. Rebuild the association tree from the `CommitmentApproved` events, generate the proof, and call `evaluator.bonus_association(proof, root, associationRoot, nullifierHash)`. The Evaluator checks that a made-up association root is refused and that the real one lets you withdraw. **3 points**.

## Attack Your Own Pool (ungraded)
Go back to the heuristics of [part 1](./01-deanonymize.md) and apply them to your pool and your classmates' pools.

1. Your pool has only your own deposits in it. What is your anonymity set?
2. In step 4, the deposit and the withdrawal are a few minutes apart. What does an observer conclude?
3. Why is a fixed denomination necessary here, when Privacy Pools and Zcash allow any amount?
4. You withdrew to a fresh address. How does it pay for gas, with and without the relayer of step 7?
5. The `Deposit` event reveals the leaf index and timestamp. Is that a problem?
6. What would happen if two users deposited the same commitment?
7. What would happen if `H` were not collision resistant? If the verifier contract had a bug? If the proving system needed a trusted setup and the ceremony were compromised?
8. In the bonus, the association set of a withdrawal contains every approved commitment. What happens to your privacy if you are the only approved depositor?

## Notes and Hints
- **Field elements.** Circuit values live in the BN254 scalar field. A `bytes32` passed as a public input must be smaller than the field modulus; Poseidon outputs always are.
- **Addresses as public inputs.** Pass `recipient` and `relayer` to the verifier as `bytes32(uint256(uint160(addr)))`, and build the public input array in the contract in the same order as in `main.nr`.
- **Same hash on both sides.** The tree is hashed on-chain at deposit time and inside the circuit at withdrawal time. The three implementations used here (`poseidon-solidity`, the Noir `poseidon` library, `poseidon-lite`) are compatible. If you swap one, test with a known vector first.
- **Check before paying.** Mark the nullifier as spent before sending ETH, not after.
- **Do not reuse a note.** Depositing the same commitment twice lets you withdraw only once: the nullifier is the same.
- **Debugging a rejected proof.** If `pool-prove.ts` fails with a failed assertion, your inputs do not satisfy the circuit (for example, the tree you rebuilt differs from the on-chain one). If the proof is generated but rejected on-chain, the public inputs differ, or the deployed verifier does not match your current circuit.
- **Gas.** With the reference solution, a withdrawal costs about 3.8 million gas (almost all of it is proof verification) and a deposit about 0.8 million (20 Poseidon hashes). Set your gas limits accordingly, and compare with your own numbers.
- **Keep `notes/` private.** It is git-ignored. Whoever reads a note file can withdraw the note.
