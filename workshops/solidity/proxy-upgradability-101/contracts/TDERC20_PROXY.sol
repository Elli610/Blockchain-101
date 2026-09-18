// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Non-transferable marks token for the Proxy and Upgradability 101 workshop.
contract TDERC20_PROXY is ERC20 {
    mapping(address => bool) public teachers;

    event DenyTransfer(address recipient, uint256 amount);
    event DenyTransferFrom(address sender, address recipient, uint256 amount);

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply
    ) ERC20(name_, symbol_) {
        _mint(msg.sender, initialSupply);
        teachers[msg.sender] = true;
    }

    modifier onlyTeachers() {
        require(teachers[msg.sender], "Not a teacher");
        _;
    }

    function distributeTokens(address to, uint256 amount) public onlyTeachers {
        _mint(to, amount * (10 ** decimals()));
    }

    function setTeacher(address teacher, bool isTeacher) public onlyTeachers {
        teachers[teacher] = isTeacher;
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
