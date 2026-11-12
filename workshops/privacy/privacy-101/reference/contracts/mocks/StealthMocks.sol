// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "../../../contracts/stealth/IERC5564Announcer.sol";
import "../../../contracts/stealth/IERC6538Registry.sol";

/// @notice Minimal local stand-ins for the canonical ERC-6538 registry and
/// ERC-5564 announcer. On Sepolia the workshop uses the real deployments.
contract ERC6538RegistryMock is IERC6538Registry {
    mapping(address => mapping(uint256 => bytes)) private _metaAddresses;

    function registerKeys(uint256 schemeId, bytes calldata stealthMetaAddress) external {
        _metaAddresses[msg.sender][schemeId] = stealthMetaAddress;
    }

    function stealthMetaAddressOf(address registrant, uint256 schemeId) external view returns (bytes memory) {
        return _metaAddresses[registrant][schemeId];
    }
}

contract ERC5564AnnouncerMock is IERC5564Announcer {
    function announce(
        uint256 schemeId,
        address stealthAddress,
        bytes memory ephemeralPubKey,
        bytes memory metadata
    ) external {
        emit Announcement(schemeId, stealthAddress, msg.sender, ephemeralPubKey, metadata);
    }
}
