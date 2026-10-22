// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract FakeNefturians is ERC721Enumerable {
    uint256 public tokenCounter;
    uint256 public tokenPrice = 0.001 ether;
    address public immutable owner;
    string private baseTokenURI;

    constructor()
        ERC721("Fake Nefturians", "NFTR")
    {
        owner = msg.sender;
        baseTokenURI = "https://api.nefturians.io/metadata/";
        _safeMint(msg.sender, tokenCounter);
        tokenCounter++;
    }

    function buyAToken() public payable {
        require(msg.value >= tokenPrice, "FakeNefturians: insufficient payment");
        _safeMint(msg.sender, tokenCounter);
        tokenCounter++;
    }

    function withdraw() public {
        require(msg.sender == owner, "FakeNefturians: caller is not the owner");
        (bool ok, ) = owner.call{value: address(this).balance}("");
        require(ok, "FakeNefturians: withdraw failed");
    }

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }
}
