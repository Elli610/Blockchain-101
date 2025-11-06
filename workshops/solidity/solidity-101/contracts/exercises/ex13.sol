// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "../exerciseTemplate.sol";

/*
Exercise: Compute a number using inline assembly
In this exercise, you need to:
- Compute the value of `_valueToCompute` using inline assembly
- The computed value must match `aValueToCompare`
*/

contract Ex13 is ExerciseTemplate {
    uint256 public constant aValueToCompare = 484;

    constructor(ERC20TD _TDERC20) ExerciseTemplate(_TDERC20) {}

    function computeAndSubmit(uint _valueToCompute) public {
        uint computedValue;

        assembly {
            computedValue := add(sub(mul(_valueToCompute, 2), 4), 192)
        }

        require(
            computedValue == aValueToCompare,
            "Computed value does not match the expected result"
        );

        creditStudent(2, msg.sender);
        validateExercise(msg.sender);
    }
}

// 41c2cc0c9e11501a3eec0956812949b1b9b2d14d9dc7118df2ef1aac71f18767
