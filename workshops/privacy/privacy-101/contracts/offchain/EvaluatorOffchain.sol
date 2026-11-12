// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "../EvaluatorBase.sol";

/// @notice Records the points earned on chains this contract cannot read
/// (Part 2: Monero, Part 3: Zcash). The checks themselves are done off-chain
/// by the grader scripts, which hold the instructor's Monero and Zcash keys.
contract EvaluatorOffchain is EvaluatorBase {
    uint256 public constant EX_MONERO = 1;
    uint256 public constant EX_ZCASH = 2;

    struct MoneroSubmission {
        string txid;
        string proof;
    }

    mapping(address => MoneroSubmission) public moneroSubmissions;
    /// @dev A Monero or Zcash transaction can only be credited once.
    mapping(bytes32 => bool) public usedTransactions;

    event MoneroProofSubmitted(address indexed student, string txid, string proof);

    constructor(TDERC20_PRIVACY token) EvaluatorBase(token) {}

    // -----------------------------------------------------------------------
    // Part 2: Monero
    // -----------------------------------------------------------------------

    /// @notice Submit the transaction id and the `get_tx_proof` signature of a
    /// payment to the instructor. The proof message must be the caller's
    /// lowercase address.
    function ex_moneroProof(string calldata txid, string calldata proof) external {
        require(bytes(txid).length == 64, "txid must be 64 hex characters");
        require(bytes(proof).length > 0, "empty proof");
        moneroSubmissions[msg.sender] = MoneroSubmission(txid, proof);
        emit MoneroProofSubmitted(msg.sender, txid, proof);
    }

    /// @notice Called by the Monero grader once `check_tx_proof` succeeded.
    function gradeMonero(address student) external onlyTeachers {
        string memory txid = moneroSubmissions[student].txid;
        require(bytes(txid).length != 0, "no submission");
        _consume(keccak256(abi.encodePacked("monero:", txid)));
        _validate(student, EX_MONERO, 5);
    }

    // -----------------------------------------------------------------------
    // Part 3: Zcash
    // -----------------------------------------------------------------------

    /// @notice Called by the Zcash grader for each shielded payment whose memo
    /// contains a student address.
    function gradeZcash(address student, string calldata txid) external onlyTeachers {
        _consume(keccak256(abi.encodePacked("zcash:", txid)));
        _validate(student, EX_ZCASH, 4);
    }

    function _consume(bytes32 key) internal {
        require(!usedTransactions[key], "transaction already credited");
        usedTransactions[key] = true;
    }
}
