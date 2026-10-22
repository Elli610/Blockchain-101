// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20Points is ERC20 {
    mapping(address => bool) public teachers;
    event DenyTransfer(address recipient, uint256 amount);
    event DenyTransferFrom(address sender, address recipient, uint256 amount);

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
        teachers[msg.sender] = true;
    }

    function distributeTokens(address tokenReceiver, uint256 amount) public onlyTeachers {
        _mint(tokenReceiver, amount * (10 ** decimals()));
    }

    function setTeacher(address teacherAddress, bool isTeacher) public onlyTeachers {
        teachers[teacherAddress] = isTeacher;
    }

    modifier onlyTeachers() {
        require(teachers[msg.sender], "ERC20Points: caller is not a teacher");
        _;
    }

    function transfer(address recipient, uint256 amount) public override returns (bool) {
        emit DenyTransfer(recipient, amount);
        return false;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        emit DenyTransferFrom(sender, recipient, amount);
        return false;
    }
}
