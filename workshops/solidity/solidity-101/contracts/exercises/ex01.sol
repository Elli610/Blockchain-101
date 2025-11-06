// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "../exerciseTemplate.sol";

/*
Exercise 1: Creating an Ethereum Public address
In this exercise, you need to:
- Create an Ethereum public address
- Get some testnet tokens
- Call function ping()
- Your points are credited
*/
/*
What you need to know to complete this exercise

A) Create a wallet using Metamask (http://metamask.io) or Rabby (https://rabby.io/)

*/
contract Ex01 is ExerciseTemplate {
    constructor(ERC20TD _TDERC20) ExerciseTemplate(_TDERC20) {}

    function ping() public {
        // Validating exercise
        creditStudent(2, msg.sender);
        validateExercise(msg.sender);
    }
}
