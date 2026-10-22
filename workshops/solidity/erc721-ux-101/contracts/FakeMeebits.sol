// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract FakeMeebits is ERC721 {
    mapping(address => bool) public whitelist;
    string private baseTokenURI;

    constructor() ERC721("Fake Meebits", "FMB") {
        baseTokenURI = "https://meebits.larvalabs.com/meebit/";
        whitelist[msg.sender] = true;
    }

    function mintAToken(uint256 _tokenId) public onlyMinter {
        _safeMint(tx.origin, _tokenId);
    }

    function manageMinter(address newMinter, bool permission) public onlyMinter {
        whitelist[newMinter] = permission;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }

    modifier onlyMinter() {
        require(whitelist[msg.sender], "FakeMeebits: account not whitelisted");
        _;
    }
}
