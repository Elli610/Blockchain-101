// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "@semaphore-protocol/contracts/interfaces/ISemaphore.sol";
import "@semaphore-protocol/contracts/interfaces/ISemaphoreGroups.sol";
import "../EvaluatorBase.sol";
import "./IVotingSolution.sol";

/// @notice Grades Part 6 (private voting with Semaphore).
///
/// The Evaluator cannot generate zero-knowledge proofs. Students generate
/// them off-chain and hand them to the Evaluator, which forwards them to the
/// student's Voting contract and checks how it reacts.
contract EvaluatorVoting is EvaluatorBase {
    uint256 public constant MIN_MEMBERS = 3;

    address public immutable semaphore;

    mapping(address => IVotingSolution) public studentVoting;
    mapping(address => bool) public hasBeenPaired;
    /// @dev Nullifier and option of the vote accepted in exercise 3.
    mapping(address => uint256) public votedNullifier;
    mapping(address => uint256) public votedOption;

    constructor(TDERC20_PRIVACY token, address semaphore_) EvaluatorBase(token) {
        semaphore = semaphore_;
    }

    // -----------------------------------------------------------------------
    // Exercise 1: deploy and register
    // -----------------------------------------------------------------------

    function submitVoting(IVotingSolution voting) external {
        require(!hasBeenPaired[address(voting)], "contract already paired");
        hasBeenPaired[address(voting)] = true;
        studentVoting[msg.sender] = voting;

        // Reverts if the group does not exist.
        address admin = ISemaphoreGroups(semaphore).getGroupAdmin(voting.groupId());
        require(admin == address(voting), "Voting must be the group admin");
        _validate(msg.sender, 1, 1);
    }

    // -----------------------------------------------------------------------
    // Exercise 2: build an electorate
    // -----------------------------------------------------------------------

    function ex2_members() external {
        IVotingSolution voting = _votingOf(msg.sender);
        uint256 size = ISemaphoreGroups(semaphore).getMerkleTreeSize(voting.groupId());
        require(size >= MIN_MEMBERS, "not enough members");
        _validate(msg.sender, 2, 1);
    }

    // -----------------------------------------------------------------------
    // Exercise 3: cast an anonymous vote
    // -----------------------------------------------------------------------

    function ex3_vote(ISemaphore.SemaphoreProof calldata proof) external {
        IVotingSolution voting = _votingOf(msg.sender);
        require(exerciseProgression[msg.sender][2], "do exercise 2 first");
        require(proof.scope == voting.ballotId(), "scope must be the ballot id");
        require(proof.message <= 1, "option must be 0 or 1");

        uint256 before = voting.tally(proof.message);
        voting.vote(proof);
        require(voting.tally(proof.message) == before + 1, "tally not incremented");

        votedNullifier[msg.sender] = proof.nullifier;
        votedOption[msg.sender] = proof.message;
        _validate(msg.sender, 3, 2);
    }

    // -----------------------------------------------------------------------
    // Exercise 4: no double voting
    // -----------------------------------------------------------------------

    function ex4_doubleVote(ISemaphore.SemaphoreProof calldata proof) external {
        IVotingSolution voting = _votingOf(msg.sender);
        require(exerciseProgression[msg.sender][3], "do exercise 3 first");
        // Same identity and same ballot give the same nullifier.
        require(proof.nullifier == votedNullifier[msg.sender], "use the identity that voted in ex3");
        require(proof.scope == voting.ballotId(), "scope must be the ballot id");
        require(proof.message <= 1 && proof.message != votedOption[msg.sender], "vote for the other option");
        // The proof itself must be sound: only the reuse may cause the revert.
        require(ISemaphore(semaphore).verifyProof(voting.groupId(), proof), "invalid proof");

        require(_voteReverts(voting, proof), "double vote was accepted");
        _validate(msg.sender, 4, 1);
    }

    // -----------------------------------------------------------------------
    // Exercise 5: wrong ballot
    // -----------------------------------------------------------------------

    function ex5_wrongScope(ISemaphore.SemaphoreProof calldata proof) external {
        IVotingSolution voting = _votingOf(msg.sender);
        require(exerciseProgression[msg.sender][3], "do exercise 3 first");
        require(proof.scope != voting.ballotId(), "scope must differ from the ballot id");
        require(proof.message <= 1, "option must be 0 or 1");
        require(ISemaphore(semaphore).verifyProof(voting.groupId(), proof), "invalid proof");

        require(_voteReverts(voting, proof), "vote for another ballot was accepted");
        _validate(msg.sender, 5, 1);
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    function _votingOf(address student) internal view returns (IVotingSolution voting) {
        voting = studentVoting[student];
        require(address(voting) != address(0), "no Voting contract submitted");
    }

    function _voteReverts(IVotingSolution voting, ISemaphore.SemaphoreProof calldata proof) internal returns (bool) {
        try voting.vote(proof) {
            return false;
        } catch {
            return true;
        }
    }
}
