// Instructor reference solution for Part 8. Used by the test-suite.
use poseidon::poseidon::bn254::{hash_1, hash_2};

global LEVELS: u32 = 20;

/// Root of the Merkle tree containing `leaf` at position `index`.
fn compute_root(leaf: Field, siblings: [Field; LEVELS], index: Field) -> Field {
    // Bit i of the index tells whether the node at level i is a right child.
    let index_bits: [bool; LEVELS] = index.to_le_bits();
    let mut node = leaf;
    for i in 0..LEVELS {
        let (left, right) = if index_bits[i] {
            (siblings[i], node)
        } else {
            (node, siblings[i])
        };
        node = hash_2([left, right]);
    }
    node
}

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
    let commitment = hash_2([nullifier, secret]);
    assert(hash_1([nullifier]) == nullifier_hash, "wrong nullifier hash");
    assert(compute_root(commitment, path_siblings, path_index) == root, "note is not in the tree");

    // recipient, relayer and fee take no part in the statement. Being public
    // inputs, they are bound to the proof: changing one invalidates it.
    let _ = recipient * relayer * fee;
}

#[test]
fn test_single_leaf() {
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

#[test(should_fail_with = "note is not in the tree")]
fn test_wrong_secret() {
    let siblings = [0; LEVELS];
    let root = compute_root(hash_2([1, 2]), siblings, 0);
    main(1, 3, siblings, 0, root, hash_1([1]), 0, 0, 0);
}
