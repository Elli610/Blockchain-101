// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract FakeBAYC is ERC721Enumerable {
    uint256 public tokenCounter;
    string private baseTokenURI;

    constructor()
        ERC721("Fake Bored Ape Yacht Club", "FBAYC")
    {
        baseTokenURI = "https://gateway.pinata.cloud/ipfs/QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/";
        _safeMint(msg.sender, tokenCounter);
        tokenCounter++;
    }

    function claimAToken() public {
        _safeMint(msg.sender, tokenCounter);
        tokenCounter++;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }
}
