// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "@semaphore-protocol/contracts/interfaces/ISemaphore.sol";
import "../../../contracts/voting/IVotingSolution.sol";

/// @notice Instructor reference solution for Part 6. Used by the test-suite.
contract VotingSolution is IVotingSolution {
    ISemaphore public immutable semaphore;
    uint256 public immutable groupId;
    uint256 public immutable ballotId;

    mapping(uint256 => uint256) public tally;

    constructor(ISemaphore semaphore_, uint256 ballotId_) {
        semaphore = semaphore_;
        ballotId = ballotId_;
        groupId = semaphore_.createGroup();
    }

    function join(uint256 identityCommitment) external {
        semaphore.addMember(groupId, identityCommitment);
    }

    function vote(ISemaphore.SemaphoreProof calldata proof) external {
        require(proof.scope == ballotId, "wrong ballot");
        require(proof.message <= 1, "unknown option");
        // Reverts on an invalid proof or a nullifier that was already used.
        semaphore.validateProof(groupId, proof);
        tally[proof.message]++;
    }
}
