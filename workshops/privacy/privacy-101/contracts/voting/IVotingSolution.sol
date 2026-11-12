// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "@semaphore-protocol/contracts/interfaces/ISemaphore.sol";

/// @notice Interface your Part 6 contract must implement.
interface IVotingSolution {
    /// @notice Semaphore group holding the voters of this ballot.
    function groupId() external view returns (uint256);

    /// @notice Identifier of the ballot. It is the scope of every vote proof.
    function ballotId() external view returns (uint256);

    /// @notice Adds an identity commitment to the group.
    function join(uint256 identityCommitment) external;

    /// @notice Casts the vote `proof.message` (0 or 1).
    function vote(ISemaphore.SemaphoreProof calldata proof) external;

    /// @notice Number of votes received by `option`.
    function tally(uint256 option) external view returns (uint256);
}
