// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./FakeMeebits.sol";

contract FakeMeebitsClaimer {
    using ECDSA for bytes32;

    event UpdateWhitelist(address indexed account, bool value);
    event ATokenWasClaimed(uint256 indexed tokenNumber, address indexed tokenClaimer);
    event TipReceived(address indexed tipper, uint256 amount);
    event TipsWithdrawn(address indexed withdrawer, uint256 amount);

    mapping(address => bool) public whitelist;
    mapping(uint256 => bool) public tokensThatWereClaimed;

    uint256 public immutable maxTokenId;
    uint256 public totalFunds;
    FakeMeebits public immutable fakeMeebits;

    constructor(uint256 _maxTokenId, address _fakeMeebits) {
        whitelist[msg.sender] = true;
        maxTokenId = _maxTokenId;
        fakeMeebits = FakeMeebits(_fakeMeebits);
    }

    receive() external payable {
        totalFunds += msg.value;
        emit TipReceived(msg.sender, msg.value);
    }

    function claimAToken(uint256 _tokenToClaim, bytes calldata _signature) external payable {
        require(!tokensThatWereClaimed[_tokenToClaim], "Claimer: token already claimed");
        require(_tokenToClaim <= maxTokenId, "Claimer: tokenId out of bounds");

        bytes32 hash = keccak256(abi.encode(address(fakeMeebits), _tokenToClaim));
        bytes32 ethHash = hash.toEthSignedMessageHash();
        address signer = ethHash.recover(_signature);
        require(whitelist[signer], "Claimer: signer not whitelisted");

        tokensThatWereClaimed[_tokenToClaim] = true;
        fakeMeebits.mintAToken(_tokenToClaim);

        emit ATokenWasClaimed(_tokenToClaim, msg.sender);

        if (msg.value > 0) {
            totalFunds += msg.value;
            emit TipReceived(msg.sender, msg.value);
        }
    }

    function updateWhitelist(address _account, bool _value) external onlyWhitelisted {
        whitelist[_account] = _value;
        emit UpdateWhitelist(_account, _value);
    }

    function withdrawTips() external onlyWhitelisted {
        uint256 amount = totalFunds;
        totalFunds = 0;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Claimer: withdraw failed");
        emit TipsWithdrawn(msg.sender, amount);
    }

    modifier onlyWhitelisted() {
        require(whitelist[msg.sender], "Claimer: account not whitelisted");
        _;
    }
}
