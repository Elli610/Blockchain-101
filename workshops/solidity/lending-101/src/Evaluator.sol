// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
pragma experimental ABIEncoderV2;

import "./ERC20TD.sol";
import "./interfaces/IExerciseSolution.sol";
import "./interfaces/IFlashLoanSimpleReceiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Evaluator {
    ERC20TD public TDAAVE;
    IERC20 public aDAI;
    IERC20 public USDC;
    IERC20 public variableDebtUSDC;
    address public AAVEPool;

    mapping(address => mapping(uint256 => bool)) public exerciseProgression;
    mapping(address => IExerciseSolution) public studentExercise;
    mapping(address => bool) public hasBeenPaired;

    event constructedCorrectly(
        address erc20Address,
        address adaiAddress,
        address UsdcAddress,
        address variableDebtUSDCAddress
    );

    constructor(
        ERC20TD _TDAAVE,
        IERC20 _aDAI,
        IERC20 _USDC,
        IERC20 _variableDebtUSDC,
        address _AAVEPool
    ) {
        TDAAVE = _TDAAVE;
        aDAI = _aDAI;
        USDC = _USDC;
        variableDebtUSDC = _variableDebtUSDC;
        AAVEPool = _AAVEPool;
        emit constructedCorrectly(
            address(TDAAVE),
            address(aDAI),
            address(USDC),
            address(variableDebtUSDC)
        );
    }

    fallback() external payable {}

    receive() external payable {}

    function ex1_showIDepositedTokens() public {
        // Sender should have deposited testnet aDAI
        require(
            aDAI.balanceOf(msg.sender) > 0,
            "Sender has not deposited DAI in AAVE"
        );

        // Distributing points
        if (!exerciseProgression[msg.sender][1]) {
            exerciseProgression[msg.sender][1] = true;
            TDAAVE.distributeTokens(msg.sender, 2);
        }
    }

    function ex2_showIBorrowedTokens() public {
        // Sender should have borrowed USDC on AAVE
        require(
            variableDebtUSDC.balanceOf(msg.sender) > 0,
            "Sender has not borrowed USDC in AAVE"
        );

        // Distributing points
        if (!exerciseProgression[msg.sender][2]) {
            exerciseProgression[msg.sender][2] = true;
            TDAAVE.distributeTokens(msg.sender, 2);
        }
    }

    function ex3_showIRepaidTokens() public {
        require(
            exerciseProgression[msg.sender][2],
            "You should have completed ex2"
        );
        // // Sender should repaid his testnet USDC
        require(
            variableDebtUSDC.balanceOf(msg.sender) == 0,
            "Sender has not deposited DAI in AAVE"
        );

        // Distributing points
        if (!exerciseProgression[msg.sender][3]) {
            exerciseProgression[msg.sender][3] = true;
            TDAAVE.distributeTokens(msg.sender, 2);
        }
    }

    function ex4_showIWithdrewTokens() public {
        require(
            exerciseProgression[msg.sender][1],
            "You should have completed ex1"
        );

        // // Sender should have no more testnet aDAI
        require(
            aDAI.balanceOf(msg.sender) == 0,
            "Sender has not deposited DAI in AAVE"
        );

        // Distributing points
        if (!exerciseProgression[msg.sender][4]) {
            exerciseProgression[msg.sender][4] = true;
            TDAAVE.distributeTokens(msg.sender, 2);
        }
    }

    function ex5_showContractCanDepositTokens() public {
        // Reading initial aDai balance
        uint256 initialBalance = aDAI.balanceOf(
            address(studentExercise[msg.sender])
        );

        // Trigger token deposit function
        studentExercise[msg.sender].depositSomeTokens();

        // Read end balance
        uint256 endBalance = aDAI.balanceOf(
            address(studentExercise[msg.sender])
        );

        // Verify that contract did borrow
        require(
            initialBalance < endBalance,
            "Your contract did not deposit tokens"
        );

        // Distributing points
        if (!exerciseProgression[msg.sender][5]) {
            exerciseProgression[msg.sender][5] = true;
            TDAAVE.distributeTokens(msg.sender, 2);
        }
    }

    function ex6_showContractCanBorrowTokens() public {
        // Reading initial variableDebtUSDC balance
        uint256 initialBalance = variableDebtUSDC.balanceOf(
            address(studentExercise[msg.sender])
        );

        // Trigger token deposit function
        studentExercise[msg.sender].borrowSomeTokens();

        // Read end balance
        uint256 endBalance = variableDebtUSDC.balanceOf(
            address(studentExercise[msg.sender])
        );

        // Verify that contract did borrow
        require(
            initialBalance < endBalance,
            "Your contract did not borrow tokens"
        );

        // Distributing points
        if (!exerciseProgression[msg.sender][6]) {
            exerciseProgression[msg.sender][6] = true;
            TDAAVE.distributeTokens(msg.sender, 2);
        }
    }

    function ex7_showContractCanRepayTokens() public {
        // Reading initial variableDebtUSDC balance
        uint256 initialBalance = variableDebtUSDC.balanceOf(
            address(studentExercise[msg.sender])
        );

        // Trigger token deposit function
        studentExercise[msg.sender].repaySomeTokens();

        // Read end balance
        uint256 endBalance = variableDebtUSDC.balanceOf(
            address(studentExercise[msg.sender])
        );

        // Verify that contract did borrow
        require(
            initialBalance > endBalance,
            "Your contract did not repay its tokens"
        );

        // Distributing points
        if (!exerciseProgression[msg.sender][7]) {
            exerciseProgression[msg.sender][7] = true;
            TDAAVE.distributeTokens(msg.sender, 2);
        }
    }

    function ex8_showContractCanWithdrawTokens() public {
        // Reading initial aDai balance
        uint256 initialBalance = aDAI.balanceOf(
            address(studentExercise[msg.sender])
        );

        // Trigger token deposit function
        studentExercise[msg.sender].withdrawSomeTokens();

        // Read end balance
        uint256 endBalance = aDAI.balanceOf(
            address(studentExercise[msg.sender])
        );

        // Verify that contract did borrow
        require(
            initialBalance > endBalance,
            "Your contract did not withdraw its tokens"
        );

        // Distributing points
        if (!exerciseProgression[msg.sender][8]) {
            exerciseProgression[msg.sender][8] = true;
            TDAAVE.distributeTokens(msg.sender, 2);
        }
    }

    // Exercise 9 - Verify that you are able to execute a flash loan
    // To validate this exercise, your solution needs to:
    // - Get a flashloan with Aave, for 1M USDC
    // - Set the flashloan call so that it calls back this contract
    // - Implement a executeOperation() function that handles loan repayment, including the fees
    // The flow is:
    // - Your contract calls AAVE's Pool on flashLoanSimple()
    // - The pool calls the evaluator on executeOperation()
    // - The evaluator calls your contract on executeOperation()
    // - The call returns to the evaluator
    // - The call returns to the pool
    // - The call returns to your contract

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool) {
        // Check https://docs.aave.com/developers/guides/flash-loans

        // Verify that caller is AAVE
        require(msg.sender == AAVEPool);

        // Distributing points
        if (!exerciseProgression[tx.origin][9]) {
            exerciseProgression[tx.origin][9] = true;
            TDAAVE.distributeTokens(tx.origin, 4);
        }

        // Transmit call to initiator
        require(
            IFlashLoanSimpleReceiver(initiator).executeOperation(
                asset,
                amount,
                premium,
                initiator,
                params
            ),
            "initiator receiver failed"
        );

        return (true);
    }

    function ex9_performFlashLoan(address studentAddress) public {}

    modifier onlyTeachers() {
        require(TDAAVE.teachers(msg.sender));
        _;
    }

    function submitExercise(IExerciseSolution studentExercise_) public {
        // Checking this contract was not used by another group before
        require(!hasBeenPaired[address(studentExercise_)]);

        // Assigning passed ERC20 as student ERC20
        studentExercise[msg.sender] = studentExercise_;
        hasBeenPaired[address(studentExercise_)] = true;
    }
}
