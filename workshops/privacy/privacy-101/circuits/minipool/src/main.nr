// Part 8 starter circuit. Fill in the TODOs.
//
// hash_2([a, b]) and hash_1([a]) are the Poseidon hashes used on-chain by
// IncrementalMerkleTree.sol and off-chain by scripts/lib/pool.ts.
use poseidon::poseidon::bn254::{hash_1, hash_2};

global LEVELS: u32 = 20;

/// Root of the Merkle tree containing `leaf` at position `index`.
/// siblings[i] is the sibling of the node at level i (level 0 = leaves).
fn compute_root(leaf: Field, siblings: [Field; LEVELS], index: Field) -> Field {
    // Bit i of the index tells whether the node at level i is a right child.
    let index_bits: [bool; LEVELS] = index.to_le_bits();

    // TODO: walk up the tree. At each level, hash the current node with its
    // sibling, in the order given by index_bits[i].
    let _ = (siblings, index_bits);
    leaf
}

// The order of the public inputs here is the order your contract must use
// when it calls the verifier: root, nullifier_hash, recipient, relayer, fee.
fn main(
    nullifier: Field,
    secret: Field,
    path_siblings: [Field; LEVELS],
    path_index: Field,
    root: pub Field,
    nullifier_hash: pub Field,
    recipient: pub Field,
    relayer: pub Field,
    fee: pub Field,
) {
    // TODO 1: recompute the commitment from the note.
    // TODO 2: check that nullifier_hash is the hash of the nullifier.
    // TODO 3: check that the commitment is in the tree whose root is `root`.
    let _ = (nullifier, secret, path_siblings, path_index, root, nullifier_hash);

    // recipient, relayer and fee take no part in the statement. Being public
    // inputs, they are bound to the proof: changing one invalidates it.
    let _ = recipient * relayer * fee;
}

#[test]
fn test_single_leaf() {
    // A tree whose only leaf is the note (1, 2).
    let nullifier = 1;
    let secret = 2;
    let mut siblings = [0; LEVELS];
    let mut zero = 0;
    let mut root = hash_2([nullifier, secret]);
    for i in 0..LEVELS {
        siblings[i] = zero;
        root = hash_2([root, zero]);
        zero = hash_2([zero, zero]);
    }
    main(nullifier, secret, siblings, 0, root, hash_1([nullifier]), 3, 4, 5);
}

// TODO: add tests that must fail (wrong secret, wrong sibling, wrong
// nullifier hash) using #[test(should_fail)].
