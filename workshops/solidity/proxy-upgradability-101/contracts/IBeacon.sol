// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

/// @notice Minimal Beacon interface. A BeaconProxy delegatecalls to whatever
/// `implementation()` currently returns.
interface IBeacon {
    function implementation() external view returns (address);
}
