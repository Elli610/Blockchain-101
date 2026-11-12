# Part 6: Private Voting with Semaphore

## Introduction
So far, privacy meant hiding payments. The same cryptography answers a more general question: *how do I prove I belong to a group without saying which member I am, and without being able to act twice?* That is exactly what an anonymous vote needs.

[Semaphore](https://semaphore.pse.dev/) is a protocol that provides this as a reusable building block. In this part you will build an anonymous voting contract on top of the Semaphore contracts deployed on Sepolia.

* **Network:** Sepolia
* **Grading:** Evaluator, **6 points**
* **Tools:** Hardhat or Foundry, the `@semaphore-protocol/core` package (identity, group and proof libraries)

> **Verify before the session**
> - That the Semaphore address below is the one the installed SDK targets. The source of truth is the `deployedContracts` list of the installed `@semaphore-protocol/utils` package, **not** the documentation website: in November 2026 the website still listed an older Sepolia deployment whose verifier rejects (`Semaphore__InvalidProof`) the proofs produced by the current SDK. The Evaluator stores the Semaphore address at deployment, so it must be redeployed if the address changes.
> - This part was run end to end on Sepolia in November 2026 with `@semaphore-protocol/core` 4.14.5.

## The Building Blocks

### Identity
A Semaphore **identity** is a private key from which a public **identity commitment** is derived. The commitment is what gets added to a group.
```ts
import { Identity } from "@semaphore-protocol/core"
const identity = new Identity()        // keep identity.export() secret
const commitment = identity.commitment // public
```

### Group
A **group** is a Merkle tree of identity commitments, stored in the Semaphore contract.

### Proof
A member generates a zero-knowledge proof stating:
1. "I know the private key of *one of* the commitments in this tree" (membership),
2. "this **nullifier** is derived from my private key and this **scope**" (uniqueness),
3. "I am attaching this **message**" (the signal, here the vote).

```ts
import { generateProof } from "@semaphore-protocol/core"
const proof = await generateProof(identity, group, message, scope)
```

The **scope** defines what "once" means. The same identity produces the same nullifier for the same scope, so the contract can reject a second proof. With the ballot ID as scope, each member can vote once per ballot.

### On-chain
| Contract | Address on Sepolia |
|---|---|
| `Semaphore` (V4) | [`0xC10E5102A2Cc077BE3B9740Fc0Ad7e27Ff8E0245`](https://sepolia.etherscan.io/address/0xC10E5102A2Cc077BE3B9740Fc0Ad7e27Ff8E0245) |

The functions you need from `ISemaphore`:
```solidity
function createGroup() external returns (uint256 groupId);
function addMember(uint256 groupId, uint256 identityCommitment) external;
function validateProof(uint256 groupId, SemaphoreProof calldata proof) external;
```
`validateProof` reverts if the proof is invalid **or if its nullifier was already used** in that group. The proof struct exposes, among others, `message`, `scope` and `nullifier`.

## How to Work on This Part
You write and deploy one contract, `Voting`, that implements [`IVotingSolution.sol`](./contracts/voting/IVotingSolution.sol), and register it with `submitVoting(<yourVoting>)` on the [`EvaluatorVoting`](./contracts/voting/EvaluatorVoting.sol) contract (called "the Evaluator" below).

The helper [`scripts/voting-proof.ts`](./scripts/voting-proof.ts) creates identities and builds proofs for your contract; read it, it is short.
```bash
# Create an identity: prints its secret and the commitment to pass to join().
npx hardhat run scripts/voting-proof.ts

# Build a proof. VOTE_SCOPE is optional and defaults to your ballot id.
VOTING_ADDRESS=<yourVoting> SEMAPHORE_IDENTITY=<secret> VOTE_OPTION=1 \
  npx hardhat run --network sepolia scripts/voting-proof.ts
```
The last line it prints is the proof as a tuple, ready to be passed to the Evaluator, for instance with Foundry:
```bash
cast send <EvaluatorVoting> "ex3_vote((uint256,uint256,uint256,uint256,uint256,uint256[8]))" "<tuple>" \
  --private-key $PRIVATE_KEY --rpc-url $SEPOLIA_RPC_URL
```
The script reads the group members from the Semaphore events, starting at `FROM_BLOCK`: set it in your `.env` (value in the [README](./README.md#deployed-addresses)).

Interface:
```solidity
interface IVotingSolution {
    function groupId() external view returns (uint256);
    function ballotId() external view returns (uint256);
    function join(uint256 identityCommitment) external;
    function vote(ISemaphore.SemaphoreProof calldata proof) external;
    function tally(uint256 option) external view returns (uint256);
}
```

Requirements:
- The constructor calls `semaphore.createGroup()`; your contract becomes the group admin.
- `join` adds a commitment to the group. For the workshop, anyone may join. (A real vote would restrict this to eligible voters.)
- `vote` must:
  * require `proof.scope == ballotId()`,
  * require `proof.message` to be a valid option (`0` or `1`),
  * call `semaphore.validateProof(groupId(), proof)`,
  * increment the tally of `proof.message`.
- `vote` must **not** depend on `msg.sender`.

## Points List

### Exercise 1: deploy and register (1 point)
Deploy `Voting`, call `evaluator.submitVoting(<yourVoting>)`. The Evaluator checks that your group exists in the Semaphore contract and that your contract is its admin. **1 point**.

### Exercise 2: build an electorate (1 point)
1. Create at least three identities off-chain.
2. Call `join` for each commitment.
3. Call `evaluator.ex2_members()`. The Evaluator reads the group size from the Semaphore contract and expects at least 3 members. **1 point**.

### Exercise 3: cast an anonymous vote (2 points)
1. Rebuild the group off-chain from its members (same order as on-chain).
2. Generate a proof with one of your identities, `message` = your chosen option, `scope` = `ballotId()`.
3. Call `evaluator.ex3_vote(proof)`. The Evaluator calls `vote(proof)` on your contract and checks that the tally of `proof.message` increased by exactly one. **2 points**.

### Exercise 4: no double voting (1 point)
1. Generate a **second** proof with the **same identity** but the other option.
2. Call `evaluator.ex4_doubleVote(proof)`. The Evaluator checks that the proof is valid and carries the same nullifier as your vote of exercise 3, calls `vote(proof)` and expects a revert. **1 point**.

### Exercise 5: wrong ballot (1 point)
1. Generate a proof with an identity that has not voted, using a `scope` different from `ballotId()`.
2. Call `evaluator.ex5_wrongScope(proof)`. The Evaluator checks that the proof is valid, then expects your contract to revert. **1 point**.

### Class vote
The instructor deploys one `Voting` contract for the whole class.
1. Join it with a new identity.
2. Once everyone has joined, vote. **Send the transaction from an address that is not your student address**, or ask a classmate to send your proof for you.
3. Watch the tally. Try to work out who voted for what.

## Questions
1. In exercise 3 the Evaluator knew exactly which student submitted which vote. Where did the anonymity go? What does this tell you about the difference between an anonymous *proof* and an anonymous *transaction*?
2. In the class vote, your `join` transaction links your address to a commitment. Why is that not a problem?
3. If you vote immediately after joining, when the group has two members, how anonymous are you? Relate this to exercise 3 of [part 1](./01-deanonymize.md).
4. Why can a classmate relay your proof without being able to change your vote?
5. Why does exercise 5 matter? What could an attacker do with a proof generated for another ballot if the contract did not check the scope?
6. Semaphore proves membership in a tree of commitments and publishes a nullifier. Zcash notes and Privacy Pools deposits do the same. What is the "group" and what is the "scope" in a mixer?
7. Nothing stops a voter from showing someone how they voted (and selling their vote). Look up how MACI addresses this.

## Notes and Hints
- The off-chain group must contain exactly the same commitments in the same order as on-chain, otherwise the Merkle root differs and the proof is rejected.
- Generate the proof against the current group. Semaphore accepts recent roots for a limited time after the tree changes.
- Proof generation downloads circuit artifacts the first time it runs.
- Save your identities (`identity.export()`); you need the same identity for exercises 3 and 4.
