// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "../EvaluatorBase.sol";
import "./IERC6538Registry.sol";

/// @notice Grades Part 5 (stealth addresses).
///
/// Design notes:
///  * Exercise 1 is checked entirely on-chain against the ERC-6538 registry.
///  * Deriving a stealth address requires elliptic-curve arithmetic that is
///    not practical on-chain, so exercises 2 and 3 rely on a grader bot
///    (scripts/grader-stealth.ts) that holds the instructor's stealth keys.
///  * For exercise 2 the bot only stores a hash of the stealth address it
///    paid. The student proves control of that address with a signature.
contract EvaluatorStealth is EvaluatorBase {
    /// @dev ERC-5564 scheme 1: secp256k1 with view tags.
    uint256 public constant SCHEME_ID = 1;
    string public constant CLAIM_PREFIX = "I control this stealth address for: ";

    IERC6538Registry public immutable registry;

    mapping(address => bool) public paymentRequested;
    mapping(address => bytes32) public stealthAddressHash;

    event PaymentRequested(address indexed student);
    event StealthPaymentSent(address indexed student);

    constructor(TDERC20_PRIVACY token, IERC6538Registry registry_) EvaluatorBase(token) {
        registry = registry_;
    }

    // -----------------------------------------------------------------------
    // Exercise 1: publish a stealth meta-address
    // -----------------------------------------------------------------------

    function ex1_registered() external {
        bytes memory meta = registry.stealthMetaAddressOf(msg.sender, SCHEME_ID);
        require(meta.length == 66, "meta-address must be 66 bytes");
        require(_isCompressedPrefix(meta[0]), "bad spending key prefix");
        require(_isCompressedPrefix(meta[33]), "bad viewing key prefix");
        _validate(msg.sender, 1, 2);
    }

    // -----------------------------------------------------------------------
    // Exercise 2: receive a stealth payment
    // -----------------------------------------------------------------------

    function ex2_requestPayment() external {
        require(exerciseProgression[msg.sender][1], "do exercise 1 first");
        paymentRequested[msg.sender] = true;
        emit PaymentRequested(msg.sender);
    }

    /// @notice Called by the grader bot after it paid a stealth address
    /// derived from the student's meta-address.
    function setStealthAddressHash(address student, bytes32 hash) external onlyTeachers {
        require(paymentRequested[student], "no payment requested");
        stealthAddressHash[student] = hash;
        emit StealthPaymentSent(student);
    }

    /// @notice `signature` is a personal_sign, made with the stealth private
    /// key, of `claimMessage(msg.sender)`.
    function ex2_claim(bytes calldata signature) external {
        bytes32 expected = stealthAddressHash[msg.sender];
        require(expected != bytes32(0), "no stealth payment recorded yet");
        bytes32 digest = MessageHashUtils.toEthSignedMessageHash(bytes(claimMessage(msg.sender)));
        address signer = ECDSA.recover(digest, signature);
        require(keccak256(abi.encodePacked(signer)) == expected, "not signed by the stealth address");
        _validate(msg.sender, 2, 3);
    }

    function claimMessage(address student) public pure returns (string memory) {
        return string.concat(CLAIM_PREFIX, Strings.toHexString(student));
    }

    // -----------------------------------------------------------------------
    // Exercise 3: send a stealth payment
    // -----------------------------------------------------------------------

    /// @notice Called by the grader bot when it detects a correct stealth
    /// payment to the instructor announced with the student's address.
    function gradeSend(address student) external onlyTeachers {
        _validate(student, 3, 3);
    }

    function _isCompressedPrefix(bytes1 b) internal pure returns (bool) {
        return b == 0x02 || b == 0x03;
    }
}
