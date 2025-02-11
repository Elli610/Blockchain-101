// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IExerciseSolution {
    function depositSomeTokens() external;

    function withdrawSomeTokens() external;

    function borrowSomeTokens() external;

    function repaySomeTokens() external;

    function doAFlashLoan() external;

    function repayFlashLoan() external;
}
