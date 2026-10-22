// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./ERC20Points.sol";

contract Evaluator {
    mapping(address => bool) public teachers;
    ERC20Points public immutable pointsERC20;

    IERC721 public fakeBAYC;
    IERC721 public fakeNefturians;
    IERC721 public fakeMeebits;

    mapping(address => mapping(uint256 => bool)) public exerciseProgression;
    mapping(address => bool) public hasSubmitted;

    event StudentRegistered(address indexed student);
    event PointsAwarded(address indexed student, uint256 exerciseId, uint256 points);

    constructor(ERC20Points _pointsERC20) {
        pointsERC20 = _pointsERC20;
        teachers[msg.sender] = true;
    }

    function setTokenAddresses(
        address _fakeBAYC,
        address _fakeNefturians,
        address _fakeMeebits
    ) external onlyTeachers {
        fakeBAYC = IERC721(_fakeBAYC);
        fakeNefturians = IERC721(_fakeNefturians);
        fakeMeebits = IERC721(_fakeMeebits);
    }

    function setTeacher(address teacherAddress, bool isTeacher) external onlyTeachers {
        teachers[teacherAddress] = isTeacher;
    }

    function submitExercise() external {
        require(!hasSubmitted[msg.sender], "Evaluator: already submitted");
        hasSubmitted[msg.sender] = true;
        exerciseProgression[msg.sender][0] = true;
        pointsERC20.distributeTokens(msg.sender, 2);
        emit StudentRegistered(msg.sender);
        emit PointsAwarded(msg.sender, 0, 2);
    }

    function ex1_claimedFakeBAYC() external {
        require(exerciseProgression[msg.sender][0], "Evaluator: no submission");
        require(address(fakeBAYC) != address(0), "Evaluator: FakeBAYC not set");
        require(fakeBAYC.balanceOf(msg.sender) >= 1, "Evaluator: no FakeBAYC held");

        if (!exerciseProgression[msg.sender][1]) {
            exerciseProgression[msg.sender][1] = true;
            pointsERC20.distributeTokens(msg.sender, 2);
            emit PointsAwarded(msg.sender, 1, 2);
        }
    }

    function ex2_boughtFakeNefturians() external {
        require(exerciseProgression[msg.sender][0], "Evaluator: no submission");
        require(address(fakeNefturians) != address(0), "Evaluator: FakeNefturians not set");
        require(fakeNefturians.balanceOf(msg.sender) >= 1, "Evaluator: no FakeNefturians held");

        if (!exerciseProgression[msg.sender][2]) {
            exerciseProgression[msg.sender][2] = true;
            pointsERC20.distributeTokens(msg.sender, 2);
            emit PointsAwarded(msg.sender, 2, 2);
        }
    }

    function ex3_claimedFakeMeebits() external {
        require(exerciseProgression[msg.sender][0], "Evaluator: no submission");
        require(address(fakeMeebits) != address(0), "Evaluator: FakeMeebits not set");
        require(fakeMeebits.balanceOf(msg.sender) >= 1, "Evaluator: no FakeMeebits held");

        if (!exerciseProgression[msg.sender][3]) {
            exerciseProgression[msg.sender][3] = true;
            pointsERC20.distributeTokens(msg.sender, 2);
            emit PointsAwarded(msg.sender, 3, 2);
        }
    }

    modifier onlyTeachers() {
        require(teachers[msg.sender], "Evaluator: caller is not a teacher");
        _;
    }
}
