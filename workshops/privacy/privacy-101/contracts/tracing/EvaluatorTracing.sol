// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "../EvaluatorBase.sol";

/// @notice Grades Part 1 (Deanonymize Me).
///
/// Design notes:
///  * The instructor seeds several independent scenario sets on-chain (see
///    scripts/seed-tracing.ts) and records, for each exercise of each set, the
///    starting point given to students (`challenge`) and a hash of the answer.
///  * Each student is assigned one set, derived from their address.
///  * A wrong answer does not revert: it consumes one of `MAX_ATTEMPTS`.
contract EvaluatorTracing is EvaluatorBase {
    uint256 public constant MAX_ATTEMPTS = 3;
    uint256 public constant EXERCISES = 5;

    struct Scenario {
        bytes32 challenge;
        bytes32 answerHash;
    }

    uint256 public numSets;
    mapping(uint256 => mapping(uint256 => Scenario)) private _scenarios;
    mapping(address => mapping(uint256 => uint256)) public attempts;

    event ScenarioSetRegistered(uint256 indexed setId);
    event WrongAnswer(address indexed student, uint256 indexed exerciseId, uint256 attemptsLeft);

    constructor(TDERC20_PRIVACY token) EvaluatorBase(token) {}

    // -----------------------------------------------------------------------
    // Instructor
    // -----------------------------------------------------------------------

    /// @notice Registers (or overwrites) a scenario set. Index 0 of each array
    /// is exercise 1.
    function setScenarioSet(
        uint256 setId,
        bytes32[EXERCISES] calldata challenges,
        bytes32[EXERCISES] calldata answerHashes
    ) external onlyTeachers {
        require(setId <= numSets, "sets must be contiguous");
        if (setId == numSets) numSets++;
        for (uint256 i = 0; i < EXERCISES; i++) {
            _scenarios[setId][i + 1] = Scenario(challenges[i], answerHashes[i]);
        }
        emit ScenarioSetRegistered(setId);
    }

    // -----------------------------------------------------------------------
    // Views
    // -----------------------------------------------------------------------

    function setOf(address student) public view returns (uint256) {
        require(numSets > 0, "no scenario registered");
        return uint256(keccak256(abi.encodePacked(student))) % numSets;
    }

    /// @notice Starting point of `exerciseId` for `student`: an address
    /// (left-padded) for exercise 1, a transaction hash for the others.
    function getChallenge(uint256 exerciseId, address student) external view returns (bytes32) {
        require(exerciseId >= 1 && exerciseId <= EXERCISES, "unknown exercise");
        return _scenarios[setOf(student)][exerciseId].challenge;
    }

    function hashAnswer(uint256 setId, uint256 exerciseId, address answer) public pure returns (bytes32) {
        return keccak256(abi.encode(setId, exerciseId, answer));
    }

    // -----------------------------------------------------------------------
    // Exercises
    // -----------------------------------------------------------------------

    function ex1_fundingLink(address owner) external returns (bool) {
        return _submit(1, owner, 1);
    }

    function ex2_amountFingerprint(address depositor) external returns (bool) {
        return _submit(2, depositor, 2);
    }

    function ex3_timing(address depositor) external returns (bool) {
        return _submit(3, depositor, 2);
    }

    function ex4_gasFunder(address depositor) external returns (bool) {
        return _submit(4, depositor, 1);
    }

    function ex5_cluster(address consolidation) external returns (bool) {
        return _submit(5, consolidation, 2);
    }

    function _submit(uint256 exerciseId, address answer, uint256 points) internal returns (bool) {
        require(!exerciseProgression[msg.sender][exerciseId], "already validated");
        require(attempts[msg.sender][exerciseId] < MAX_ATTEMPTS, "no attempts left");
        attempts[msg.sender][exerciseId]++;

        uint256 setId = setOf(msg.sender);
        if (hashAnswer(setId, exerciseId, answer) != _scenarios[setId][exerciseId].answerHash) {
            emit WrongAnswer(msg.sender, exerciseId, MAX_ATTEMPTS - attempts[msg.sender][exerciseId]);
            return false;
        }
        _validate(msg.sender, exerciseId, points);
        return true;
    }
}
