// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "../EvaluatorBase.sol";
import "./IMiniPool.sol";
import "./IncrementalMerkleTree.sol";

/// @notice Grades Part 8 (build your own privacy pool).
///
/// Design notes:
///  * The Evaluator cannot generate zero-knowledge proofs. Students generate
///    them off-chain; the Evaluator submits them to the student's pool with
///    correct and with tampered parameters and checks how the pool reacts.
///  * Every graded withdrawal pays a recipient chosen by the Evaluator
///    (`recipientOf`), so a proof cannot be copied from another student.
///  * For the bonus, the Evaluator plays the association set provider: it
///    keeps its own Merkle tree of approved commitments.
contract EvaluatorPool is EvaluatorBase, IncrementalMerkleTree {
    uint256 public constant DENOMINATION = 0.001 ether;
    uint256 public constant RELAYER_FEE = 0.0001 ether;
    uint32 public constant POOL_LEVELS = 20;

    mapping(address => IMiniPool) public studentPool;
    mapping(address => bool) public hasBeenPaired;

    /// @dev Every association root ever published stays valid.
    mapping(bytes32 => bool) public isKnownAssociationRoot;
    mapping(bytes32 => bool) public isApproved;

    event CommitmentApproved(bytes32 indexed commitment, uint32 leafIndex);

    constructor(TDERC20_PRIVACY token) EvaluatorBase(token) IncrementalMerkleTree(POOL_LEVELS) {}

    /// @dev Receives relayer fees (exercise 7).
    receive() external payable {}

    function withdrawFees(address payable to) external onlyTeachers {
        (bool ok, ) = to.call{value: address(this).balance}("");
        require(ok, "transfer failed");
    }

    /// @notice Address every graded withdrawal of `student` must pay.
    /// Nobody holds its key: funds sent there are burned.
    function recipientOf(address student) public pure returns (address payable) {
        return payable(address(uint160(uint256(keccak256(abi.encodePacked("privacy-101-recipient", student))))));
    }

    // -----------------------------------------------------------------------
    // Step 2: deploy and register
    // -----------------------------------------------------------------------

    function submitPool(IMiniPool pool) external {
        require(!hasBeenPaired[address(pool)], "pool already paired");
        hasBeenPaired[address(pool)] = true;
        studentPool[msg.sender] = pool;

        require(pool.DENOMINATION() == DENOMINATION, "wrong denomination");
        require(pool.LEVELS() == POOL_LEVELS, "wrong tree depth");
        _validate(msg.sender, 2, 1);
    }

    // -----------------------------------------------------------------------
    // Step 3: deposits
    // -----------------------------------------------------------------------

    /// @notice Send exactly `DENOMINATION` with this call. The Evaluator
    /// deposits it into your pool under `commitment`.
    function ex3_deposit(bytes32 commitment) external payable {
        IMiniPool pool = _poolOf(msg.sender);
        require(msg.value == DENOMINATION, "send exactly the denomination");

        uint32 indexBefore = pool.nextIndex();
        bytes32 rootBefore = pool.currentRoot();

        try pool.deposit{value: DENOMINATION / 2}(commitment) {
            revert("deposit of a wrong amount was accepted");
        } catch {}

        pool.deposit{value: DENOMINATION}(commitment);

        require(pool.nextIndex() == indexBefore + 1, "nextIndex not incremented");
        bytes32 rootAfter = pool.currentRoot();
        require(rootAfter != rootBefore, "root did not change");
        require(pool.isKnownRoot(rootAfter), "new root is not known");
        _validate(msg.sender, 3, 2);
    }

    // -----------------------------------------------------------------------
    // Step 4: a full withdrawal
    // -----------------------------------------------------------------------

    /// @notice `proof` must be made for `recipientOf(msg.sender)`, a zero
    /// relayer and a zero fee.
    function ex4_withdraw(bytes calldata proof, bytes32 root, bytes32 nullifierHash) external {
        IMiniPool pool = _poolOf(msg.sender);
        address payable recipient = recipientOf(msg.sender);
        address payable none = payable(address(0));

        // 1. Same proof, another recipient.
        address payable thief = payable(address(uint160(address(recipient)) ^ 1));
        require(_withdrawReverts(pool, proof, root, nullifierHash, thief, none, 0), "tampered recipient accepted");

        // 2. Same proof, a fee that was not signed off by the prover.
        require(
            _withdrawReverts(pool, proof, root, nullifierHash, recipient, payable(address(this)), 1),
            "tampered fee accepted"
        );

        // 3. The honest withdrawal.
        uint256 balanceBefore = recipient.balance;
        pool.withdraw(proof, root, nullifierHash, recipient, none, 0);
        require(recipient.balance == balanceBefore + DENOMINATION, "recipient was not paid the denomination");
        require(pool.isSpent(nullifierHash), "nullifier not marked as spent");

        // 4. Replay.
        require(_withdrawReverts(pool, proof, root, nullifierHash, recipient, none, 0), "double spend accepted");

        _validate(msg.sender, 4, 4);
    }

    // -----------------------------------------------------------------------
    // Step 5: unknown root
    // -----------------------------------------------------------------------

    function ex5_unknownRoot(bytes calldata proof, bytes32 nullifierHash) external {
        IMiniPool pool = _poolOf(msg.sender);
        require(exerciseProgression[msg.sender][4], "do step 4 first");
        require(!pool.isSpent(nullifierHash), "use an unspent note");

        bytes32 unknownRoot = keccak256(abi.encodePacked("privacy-101-unknown-root", msg.sender));
        require(!pool.isKnownRoot(unknownRoot), "isKnownRoot accepts anything");
        require(
            _withdrawReverts(pool, proof, unknownRoot, nullifierHash, recipientOf(msg.sender), payable(address(0)), 0),
            "unknown root accepted"
        );
        require(!pool.isSpent(nullifierHash), "nullifier spent by a failed withdrawal");
        _validate(msg.sender, 5, 1);
    }

    // -----------------------------------------------------------------------
    // Step 6: root history
    // -----------------------------------------------------------------------

    function ex6_staleRoot(bytes calldata proof, bytes32 root, bytes32 nullifierHash) external {
        IMiniPool pool = _poolOf(msg.sender);
        require(exerciseProgression[msg.sender][4], "do step 4 first");
        require(root != pool.currentRoot(), "root must not be the current root");

        address payable recipient = recipientOf(msg.sender);
        uint256 balanceBefore = recipient.balance;
        pool.withdraw(proof, root, nullifierHash, recipient, payable(address(0)), 0);
        require(recipient.balance == balanceBefore + DENOMINATION, "recipient was not paid the denomination");
        _validate(msg.sender, 6, 2);
    }

    // -----------------------------------------------------------------------
    // Step 7: relayer
    // -----------------------------------------------------------------------

    /// @notice `proof` must be made for `recipientOf(msg.sender)`, this
    /// contract as relayer and `RELAYER_FEE` as fee.
    function ex7_relay(bytes calldata proof, bytes32 root, bytes32 nullifierHash) external {
        IMiniPool pool = _poolOf(msg.sender);
        require(exerciseProgression[msg.sender][4], "do step 4 first");

        address payable recipient = recipientOf(msg.sender);
        uint256 recipientBefore = recipient.balance;
        uint256 relayerBefore = address(this).balance;
        pool.withdraw(proof, root, nullifierHash, recipient, payable(address(this)), RELAYER_FEE);
        require(recipient.balance == recipientBefore + DENOMINATION - RELAYER_FEE, "wrong amount paid to recipient");
        require(address(this).balance == relayerBefore + RELAYER_FEE, "wrong fee paid to relayer");
        _validate(msg.sender, 7, 2);
    }

    // -----------------------------------------------------------------------
    // Bonus: association set
    // -----------------------------------------------------------------------

    /// @notice Adds `commitment` to the association set. A real association
    /// set provider would screen the deposit first; this one approves anything.
    function requestApproval(bytes32 commitment) external {
        require(!isApproved[commitment], "already approved");
        isApproved[commitment] = true;
        uint32 index = _insert(commitment);
        isKnownAssociationRoot[currentRoot()] = true;
        emit CommitmentApproved(commitment, index);
    }

    function associationRoot() external view returns (bytes32) {
        return currentRoot();
    }

    function bonus_association(
        bytes calldata proof,
        bytes32 root,
        bytes32 associationRoot_,
        bytes32 nullifierHash
    ) external {
        IMiniPoolAssociation pool = IMiniPoolAssociation(address(_poolOf(msg.sender)));
        require(exerciseProgression[msg.sender][4], "do step 4 first");
        require(isKnownAssociationRoot[associationRoot_], "not an association root of this Evaluator");

        address payable recipient = recipientOf(msg.sender);
        address payable none = payable(address(0));

        // A root that this Evaluator never published must be refused.
        bytes32 madeUpRoot = keccak256(abi.encodePacked("privacy-101-made-up-association", msg.sender));
        try pool.withdrawWithAssociation(proof, root, madeUpRoot, nullifierHash, recipient, none, 0) {
            revert("made-up association root accepted");
        } catch {}

        uint256 balanceBefore = recipient.balance;
        pool.withdrawWithAssociation(proof, root, associationRoot_, nullifierHash, recipient, none, 0);
        require(recipient.balance == balanceBefore + DENOMINATION, "recipient was not paid the denomination");
        _validate(msg.sender, 8, 3);
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    function _poolOf(address student) internal view returns (IMiniPool pool) {
        pool = studentPool[student];
        require(address(pool) != address(0), "no pool submitted");
    }

    function _withdrawReverts(
        IMiniPool pool,
        bytes calldata proof,
        bytes32 root,
        bytes32 nullifierHash,
        address payable recipient,
        address payable relayer,
        uint256 fee
    ) internal returns (bool) {
        try pool.withdraw(proof, root, nullifierHash, recipient, relayer, fee) {
            return false;
        } catch {
            return true;
        }
    }
}
