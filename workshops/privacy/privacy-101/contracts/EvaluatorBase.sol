// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "./TDERC20_PRIVACY.sol";

/// @notice Shared plumbing for the Privacy 101 evaluators: the points token,
/// the teacher role (instructor and grader bots) and per-student progression.
abstract contract EvaluatorBase {
    TDERC20_PRIVACY public immutable TDERC20;

    mapping(address => bool) public teachers;
    mapping(address => mapping(uint256 => bool)) public exerciseProgression;

    event ExerciseValidated(address indexed student, uint256 indexed exerciseId, uint256 points);

    constructor(TDERC20_PRIVACY token) {
        TDERC20 = token;
        teachers[msg.sender] = true;
    }

    modifier onlyTeachers() {
        require(teachers[msg.sender], "Not a teacher");
        _;
    }

    function setTeacher(address teacher, bool isTeacher) external onlyTeachers {
        teachers[teacher] = isTeacher;
    }

    /// @dev Credits `points` once per (student, exercise).
    function _validate(address student, uint256 exerciseId, uint256 points) internal {
        if (exerciseProgression[student][exerciseId]) return;
        exerciseProgression[student][exerciseId] = true;
        TDERC20.distributeTokens(student, points);
        emit ExerciseValidated(student, exerciseId, points);
    }
}
