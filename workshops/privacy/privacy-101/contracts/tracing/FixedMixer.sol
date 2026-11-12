// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

/// @notice Custodial fixed-denomination "mixer" used by Part 1. Every deposit
/// and every payout is exactly `denomination`, so amounts carry no information.
contract FixedMixer {
    address public immutable operator;
    uint256 public immutable denomination;

    event Deposit(address indexed from);
    event Withdrawal(address indexed to);

    constructor(uint256 denomination_) {
        operator = msg.sender;
        denomination = denomination_;
    }

    function deposit() external payable {
        require(msg.value == denomination, "wrong amount");
        emit Deposit(msg.sender);
    }

    function withdraw(address payable to) external {
        require(msg.sender == operator, "not operator");
        _payout(to);
    }

    function withdrawBatch(address payable[] calldata to) external {
        require(msg.sender == operator, "not operator");
        for (uint256 i = 0; i < to.length; i++) {
            _payout(to[i]);
        }
    }

    function _payout(address payable to) internal {
        emit Withdrawal(to);
        (bool ok, ) = to.call{value: denomination}("");
        require(ok, "transfer failed");
    }
}
