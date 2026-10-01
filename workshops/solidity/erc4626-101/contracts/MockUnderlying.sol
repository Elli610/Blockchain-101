// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Mock ERC20 used as the underlying asset for student ERC4626 vaults.
/// @dev Anyone can mint tokens via getTokens() so the Evaluator (or students) can obtain
///      the assets required to interact with a vault during testing.
contract MockUnderlying is ERC20 {
    constructor() ERC20("Mock Underlying", "MOCK") {}

    function getTokens(uint256 amount) external {
        _mint(msg.sender, amount);
    }
}
