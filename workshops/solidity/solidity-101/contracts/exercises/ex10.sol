// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "../exerciseTemplate.sol";

/*
Exercise 10: Analyzing past transactions
In this exercise, you need to:
- Use Etherscan to visualize this contract's transaction history
- Analyze events
- Use a function 
- Your points are credited by the contract
*/

/*
What you need to know to complete this exercise
A) What was included in the previous exercises

*/
contract Ex10 is ExerciseTemplate {
    mapping(address => uint) private privateValues;
    mapping(address => bool) public exerciseWasStarted;
    uint[20] private randomValuesStore;
    uint public nextValueStoreRank;

    event showPrivateVariableInEvent(uint i, uint myVariable);
    event showUserRank(uint i);

    constructor(ERC20TD _TDERC20) ExerciseTemplate(_TDERC20) {}

    function setRandomValueStore(
        uint[20] memory _randomValuesStore
    ) public onlyTeachers {
        randomValuesStore = _randomValuesStore;
        nextValueStoreRank = 0;
        for (uint i = 0; i < randomValuesStore.length; i++) {
            emit showPrivateVariableInEvent(i, randomValuesStore[i] + i);
        }
    }

    function assignRank() public {
        privateValues[msg.sender] = randomValuesStore[nextValueStoreRank];
        emit showUserRank(nextValueStoreRank);
        nextValueStoreRank += 1;
        if (nextValueStoreRank >= randomValuesStore.length) {
            nextValueStoreRank = 0;
        }
        exerciseWasStarted[msg.sender] = true;
    }

    function showYouKnowPrivateValue(uint _privateValue) public {
        require(privateValues[msg.sender] == _privateValue);
        require(exerciseWasStarted[msg.sender] == true);

        // Validating exercise
        creditStudent(2, msg.sender);
        validateExercise(msg.sender);
    }
}