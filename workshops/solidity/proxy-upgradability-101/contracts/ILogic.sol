// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

/// @notice Shared interface every level's implementation contract must expose.
///
/// The workshop uses a single logic contract shape across the four levels so
/// the Evaluator can uniformly test that:
///  * state (the `value`) persists across upgrades,
///  * code changes (`version()`) after an upgrade,
///  * `initialize` is callable exactly once through the proxy.
interface ILogic {
    /// @notice Set the initial `value`. MUST be callable exactly once through
    /// the proxy. Subsequent calls MUST revert.
    function initialize(uint256 initialValue) external;

    /// @notice Return the current value stored in the proxy.
    function value() external view returns (uint256);

    /// @notice Overwrite the current value.
    function setValue(uint256 newValue) external;

    /// @notice Return an identifier for the implementation code.
    /// V1 MUST return "v1"; V2 MUST return "v2".
    function version() external view returns (string memory);
}
