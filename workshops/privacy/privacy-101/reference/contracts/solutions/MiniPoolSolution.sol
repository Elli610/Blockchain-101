// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "../../../contracts/pool/IMiniPool.sol";
import "../../../contracts/pool/IVerifier.sol";
import "../../../contracts/pool/IncrementalMerkleTree.sol";

interface IAssociationSetProvider {
    function isKnownAssociationRoot(bytes32 root) external view returns (bool);
}

/// @notice Instructor reference solution for Part 8, bonus included.
/// Used by the test-suite.
contract MiniPoolSolution is IMiniPoolAssociation, IncrementalMerkleTree {
    uint256 public constant override DENOMINATION = 0.001 ether;

    IVerifier public immutable verifier;
    IVerifier public immutable associationVerifier;
    IAssociationSetProvider public immutable associationSetProvider;

    mapping(bytes32 => bool) public override isSpent;
    mapping(bytes32 => bool) public commitments;

    constructor(
        IVerifier verifier_,
        IVerifier associationVerifier_,
        IAssociationSetProvider associationSetProvider_
    ) IncrementalMerkleTree(20) {
        verifier = verifier_;
        associationVerifier = associationVerifier_;
        associationSetProvider = associationSetProvider_;
    }

    function deposit(bytes32 commitment) external payable {
        require(msg.value == DENOMINATION, "wrong amount");
        require(!commitments[commitment], "commitment already deposited");
        commitments[commitment] = true;
        uint32 leafIndex = _insert(commitment);
        emit Deposit(commitment, leafIndex, block.timestamp);
    }

    function withdraw(
        bytes calldata proof,
        bytes32 root,
        bytes32 nullifierHash,
        address payable recipient,
        address payable relayer,
        uint256 fee
    ) external {
        bytes32[] memory publicInputs = new bytes32[](5);
        publicInputs[0] = root;
        publicInputs[1] = nullifierHash;
        publicInputs[2] = bytes32(uint256(uint160(address(recipient))));
        publicInputs[3] = bytes32(uint256(uint160(address(relayer))));
        publicInputs[4] = bytes32(fee);
        _withdraw(verifier, proof, publicInputs, root, nullifierHash, recipient, relayer, fee);
    }

    function withdrawWithAssociation(
        bytes calldata proof,
        bytes32 root,
        bytes32 associationRoot,
        bytes32 nullifierHash,
        address payable recipient,
        address payable relayer,
        uint256 fee
    ) external {
        require(associationSetProvider.isKnownAssociationRoot(associationRoot), "unknown association root");
        bytes32[] memory publicInputs = new bytes32[](6);
        publicInputs[0] = root;
        publicInputs[1] = associationRoot;
        publicInputs[2] = nullifierHash;
        publicInputs[3] = bytes32(uint256(uint160(address(recipient))));
        publicInputs[4] = bytes32(uint256(uint160(address(relayer))));
        publicInputs[5] = bytes32(fee);
        _withdraw(associationVerifier, proof, publicInputs, root, nullifierHash, recipient, relayer, fee);
    }

    function _withdraw(
        IVerifier verifier_,
        bytes calldata proof,
        bytes32[] memory publicInputs,
        bytes32 root,
        bytes32 nullifierHash,
        address payable recipient,
        address payable relayer,
        uint256 fee
    ) internal {
        require(fee <= DENOMINATION, "fee exceeds denomination");
        require(!isSpent[nullifierHash], "note already spent");
        require(isKnownRoot(root), "unknown root");
        require(verifier_.verify(proof, publicInputs), "invalid proof");

        isSpent[nullifierHash] = true;
        emit Withdrawal(recipient, nullifierHash, relayer, fee);

        (bool ok, ) = recipient.call{value: DENOMINATION - fee}("");
        require(ok, "payment to recipient failed");
        if (fee > 0) {
            (ok, ) = relayer.call{value: fee}("");
            require(ok, "payment to relayer failed");
        }
    }
}
