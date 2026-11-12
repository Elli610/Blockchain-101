// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "poseidon-solidity/PoseidonT3.sol";
import "./IMiniPool.sol";

/// @notice Append-only Merkle tree hashed with Poseidon, keeping a history of
/// its most recent roots. Provided as a building block for Part 8.
///
/// Only the path from the newest leaf to the root is stored
/// (`filledSubtrees`), which is all that is needed to append the next leaf.
/// Empty leaves have value 0.
abstract contract IncrementalMerkleTree is IIncrementalMerkleTree {
    uint32 public constant ROOT_HISTORY_SIZE = 30;

    uint32 public immutable override LEVELS;

    uint32 public override nextIndex;
    uint32 public currentRootIndex;

    /// @dev zeros[i] is the root of an empty subtree of height i.
    bytes32[] public zeros;
    bytes32[] public filledSubtrees;
    bytes32[ROOT_HISTORY_SIZE] public roots;

    constructor(uint32 levels) {
        require(levels > 0 && levels < 32, "levels out of range");
        LEVELS = levels;

        bytes32 zero = bytes32(0);
        for (uint32 i = 0; i < levels; i++) {
            zeros.push(zero);
            filledSubtrees.push(zero);
            zero = hashLeftRight(zero, zero);
        }
        roots[0] = zero;
    }

    function hashLeftRight(bytes32 left, bytes32 right) public pure returns (bytes32) {
        return bytes32(PoseidonT3.hash([uint256(left), uint256(right)]));
    }

    function currentRoot() public view override returns (bytes32) {
        return roots[currentRootIndex];
    }

    function isKnownRoot(bytes32 root) public view override returns (bool) {
        if (root == bytes32(0)) return false;
        for (uint32 i = 0; i < ROOT_HISTORY_SIZE; i++) {
            if (roots[i] == root) return true;
        }
        return false;
    }

    /// @dev Appends `leaf` and returns its index.
    function _insert(bytes32 leaf) internal returns (uint32 index) {
        index = nextIndex;
        require(index < uint32(1) << LEVELS, "tree is full");

        uint32 currentIndex = index;
        bytes32 currentHash = leaf;
        for (uint32 i = 0; i < LEVELS; i++) {
            if (currentIndex % 2 == 0) {
                filledSubtrees[i] = currentHash;
                currentHash = hashLeftRight(currentHash, zeros[i]);
            } else {
                currentHash = hashLeftRight(filledSubtrees[i], currentHash);
            }
            currentIndex /= 2;
        }

        currentRootIndex = (currentRootIndex + 1) % ROOT_HISTORY_SIZE;
        roots[currentRootIndex] = currentHash;
        nextIndex = index + 1;
    }
}
