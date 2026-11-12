// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

/// @notice Views of the commitment tree. `IncrementalMerkleTree` implements them.
interface IIncrementalMerkleTree {
    /// @notice Depth of the tree.
    function LEVELS() external view returns (uint32);

    /// @notice Index the next leaf will get, i.e. the number of leaves.
    function nextIndex() external view returns (uint32);

    function currentRoot() external view returns (bytes32);

    /// @notice True for the current root and a limited number of older ones.
    function isKnownRoot(bytes32 root) external view returns (bool);
}

/// @notice Interface your Part 8 contract must implement.
interface IMiniPool is IIncrementalMerkleTree {
    event Deposit(bytes32 indexed commitment, uint32 leafIndex, uint256 timestamp);
    event Withdrawal(address recipient, bytes32 nullifierHash, address indexed relayer, uint256 fee);

    /// @notice Exact amount of every deposit, in wei.
    function DENOMINATION() external view returns (uint256);

    function deposit(bytes32 commitment) external payable;

    /// @dev Public inputs of the proof, in order:
    /// root, nullifierHash, recipient, relayer, fee.
    function withdraw(
        bytes calldata proof,
        bytes32 root,
        bytes32 nullifierHash,
        address payable recipient,
        address payable relayer,
        uint256 fee
    ) external;

    function isSpent(bytes32 nullifierHash) external view returns (bool);
}

/// @notice Extra function required by the bonus exercise.
interface IMiniPoolAssociation is IMiniPool {
    /// @dev Public inputs of the proof, in order:
    /// root, associationRoot, nullifierHash, recipient, relayer, fee.
    function withdrawWithAssociation(
        bytes calldata proof,
        bytes32 root,
        bytes32 associationRoot,
        bytes32 nullifierHash,
        address payable recipient,
        address payable relayer,
        uint256 fee
    ) external;
}
