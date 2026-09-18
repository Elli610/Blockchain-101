// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @notice Faucet ERC20 with ERC-2612 permit support. Used by the Evaluator to
/// exercise the ERC-2612 and Permit2 flows against a canonical implementation.
/// Students should NOT reuse this contract as a solution: the goal of the
/// workshop is to build the permit mechanics manually against IExerciseSolution.
contract MockUnderlying is ERC20Permit {
    constructor() ERC20("Mock Underlying", "MOCK") ERC20Permit("Mock Underlying") {}

    /// @notice Public faucet. Anyone may pull up to `amount` tokens.
    function getTokens(uint256 amount) external {
        _mint(msg.sender, amount);
    }
}
