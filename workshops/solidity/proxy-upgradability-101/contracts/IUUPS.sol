// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

/// @notice Minimal UUPS surface (EIP-1822).
///
/// A UUPS implementation MUST:
///  * store the current implementation address in the standard EIP-1967 slot
///    `bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1)`,
///  * expose `upgradeTo` (and/or `upgradeToAndCall`) protected by an
///    `_authorizeUpgrade`-style access check,
///  * expose `proxiableUUID()` returning the same EIP-1967 slot constant so
///    callers can refuse to upgrade to a non-UUPS impl (the "brick" trap).
interface IUUPS {
    function upgradeTo(address newImplementation) external;
    function proxiableUUID() external view returns (bytes32);
}
