// Instructor reference solution for the Part 8 bonus. Used by the test-suite.
use poseidon::poseidon::bn254::{hash_1, hash_2};

global LEVELS: u32 = 20;

fn compute_root(leaf: Field, siblings: [Field; LEVELS], index: Field) -> Field {
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
    association_siblings: [Field; LEVELS],
    association_index: Field,
    root: pub Field,
    association_root: pub Field,
    nullifier_hash: pub Field,
    recipient: pub Field,
    relayer: pub Field,
    fee: pub Field,
) {
    let commitment = hash_2([nullifier, secret]);
    assert(hash_1([nullifier]) == nullifier_hash, "wrong nullifier hash");
    assert(compute_root(commitment, path_siblings, path_index) == root, "note is not in the tree");
    // The same commitment must also belong to the approved set.
    assert(
        compute_root(commitment, association_siblings, association_index) == association_root,
        "note is not in the association set",
    );

    let _ = recipient * relayer * fee;
}
