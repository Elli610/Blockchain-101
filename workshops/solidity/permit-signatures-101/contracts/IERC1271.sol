// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

/// @notice ERC-1271 standard signature validation for smart contract wallets.
interface IERC1271 {
    /// @dev MUST return the bytes4 magic value 0x1626ba7e when the signature
    /// is considered valid, and any other value otherwise.
    function isValidSignature(bytes32 hash, bytes memory signature) external view returns (bytes4 magicValue);
}
