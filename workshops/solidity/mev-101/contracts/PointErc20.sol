// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract PointErc20 is ERC20 {
    uint16 public value;

    constructor(
        uint16 value_,
        uint256 mintAmount,
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) {
        value = value_;
        _mint(msg.sender, mintAmount);
    }
}
