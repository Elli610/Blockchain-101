// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

/// @notice Subset of the ERC-6538 stealth meta-address registry.
interface IERC6538Registry {
    function registerKeys(uint256 schemeId, bytes calldata stealthMetaAddress) external;

    function stealthMetaAddressOf(address registrant, uint256 schemeId) external view returns (bytes memory);
}
