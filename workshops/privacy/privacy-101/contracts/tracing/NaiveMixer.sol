// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

/// @notice Custodial "mixer" used by Part 1. Users deposit any amount and ask
/// the operator, off-chain, to pay it out to another address.
/// It offers no privacy: that is the point of the exercise.
contract NaiveMixer {
    address public immutable operator;

    event Deposit(address indexed from, uint256 amount);
    event Withdrawal(address indexed to, uint256 amount);

    constructor() {
        operator = msg.sender;
    }

    function deposit() external payable {
        require(msg.value > 0, "empty deposit");
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(address payable to, uint256 amount) external {
        require(msg.sender == operator, "not operator");
        emit Withdrawal(to, amount);
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "transfer failed");
    }
}
