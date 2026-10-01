// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "./TDERC20_PERMIT.sol";
import "./MockUnderlying.sol";
import "./IExerciseSolution.sol";
import "./IPermit2.sol";
import "./IERC1271.sol";
import "./IStudentPermitToken.sol";

/// @notice Grades every exercise of the Permit and Signatures 101 workshop.
///
/// Design notes:
///  * The Evaluator itself is an EIP-712 verifier for a "Greeting" struct.
///  * The Evaluator's `DOMAIN_SEPARATOR` and `GREETING_TYPEHASH` are exposed
///    publicly. Students must reconstruct the digest from these values, both
///    off-chain (to sign) and on-chain (in their own solution contract).
///  * Every student is assigned a deterministic `content` string drawn from a
///    small word bank. This is what they must include in the signed struct.
///  * A per-student nonce is incremented after each successful sig check to
///    prevent replay across exercises.
contract Evaluator {
    // -----------------------------------------------------------------------
    // Constants
    // -----------------------------------------------------------------------

    /// @dev secp256k1 half order. Signatures with s > this are non-canonical.
    uint256 private constant SECP256K1_HALF_ORDER =
        0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0;

    /// @dev secp256k1 curve order N.
    uint256 private constant SECP256K1_ORDER =
        0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;

    bytes4 private constant ERC1271_MAGIC = 0x1626ba7e;

    /// @dev EIP-712 type hashes.
    bytes32 public constant EIP712_DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    bytes32 public constant GREETING_TYPEHASH =
        keccak256("Greeting(address who,string content,uint256 nonce,uint256 deadline)");

    string public constant DOMAIN_NAME = "Permit101Evaluator";
    string public constant DOMAIN_VERSION = "1";

    // -----------------------------------------------------------------------
    // Storage
    // -----------------------------------------------------------------------

    TDERC20_PERMIT public TDERC20;
    MockUnderlying public mockUnderlying;
    IPermit2 public permit2;

    bytes32 public immutable DOMAIN_SEPARATOR;

    mapping(address => bool) public teachers;
    mapping(address => mapping(uint256 => bool)) public exerciseProgression;
    mapping(address => IExerciseSolution) public studentExerciseSolution;
    mapping(address => bool) public hasBeenPaired;

    /// @dev incremented on every successful Greeting verification for a user.
    mapping(address => uint256) public evaluatorNonce;

    /// @dev word bank used to assign a per-student `content` string.
    string[20] private wordBank = [
        "alpha", "bravo", "charlie", "delta", "echo",
        "foxtrot", "golf", "hotel", "india", "juliet",
        "kilo", "lima", "mike", "november", "oscar",
        "papa", "quebec", "romeo", "sierra", "tango"
    ];

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    event constructedCorrectly(
        address tdErc20,
        address mockUnderlying,
        address permit2,
        bytes32 domainSeparator
    );

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    constructor(TDERC20_PERMIT _td, MockUnderlying _mock, IPermit2 _permit2) {
        TDERC20 = _td;
        mockUnderlying = _mock;
        permit2 = _permit2;
        teachers[msg.sender] = true;

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes(DOMAIN_NAME)),
                keccak256(bytes(DOMAIN_VERSION)),
                block.chainid,
                address(this)
            )
        );

        emit constructedCorrectly(address(_td), address(_mock), address(_permit2), DOMAIN_SEPARATOR);
    }

    fallback() external payable {}
    receive() external payable {}

    // -----------------------------------------------------------------------
    // Public helpers
    // -----------------------------------------------------------------------

    /// @notice Deterministic per-student challenge string. Students must
    /// include this exact value in every signed Greeting struct.
    function getContentFor(address student) public view returns (string memory) {
        return wordBank[uint256(keccak256(abi.encode(student))) % 20];
    }

    /// @notice Recompute the Greeting digest for the given inputs, using this
    /// contract's domain and typehash.
    function greetingDigest(
        address who,
        string calldata content,
        uint256 nonce,
        uint256 deadline
    ) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                GREETING_TYPEHASH,
                who,
                keccak256(bytes(content)),
                nonce,
                deadline
            )
        );
        return keccak256(abi.encodePacked(hex"1901", DOMAIN_SEPARATOR, structHash));
    }

    // -----------------------------------------------------------------------
    // Submission
    // -----------------------------------------------------------------------

    function submitExercise(IExerciseSolution studentExercise) public {
        require(!hasBeenPaired[address(studentExercise)], "Solution already paired");

        studentExerciseSolution[msg.sender] = studentExercise;
        hasBeenPaired[address(studentExercise)] = true;

        if (!exerciseProgression[msg.sender][0]) {
            exerciseProgression[msg.sender][0] = true;
            TDERC20.distributeTokens(msg.sender, 2);
        }
    }

    // -----------------------------------------------------------------------
    // Part 1 -- Signature basics (off-chain sign, on-chain verify)
    // -----------------------------------------------------------------------

    /// @notice Verify a `personal_sign` signature over the exact message:
    ///   "I want Permit101 points at address: 0x<checksummed-msg.sender>"
    ///
    /// The prefix "\x19Ethereum Signed Message:\n<len>" is applied by wallets
    /// automatically. The student must reproduce it here.
    function ex1_personalSign(bytes calldata signature) external {
        string memory addrStr = _toHexString(msg.sender);
        bytes memory message = abi.encodePacked(
            "I want Permit101 points at address: ",
            addrStr
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n", _uintToStr(message.length), message)
        );

        address signer = _recover(digest, signature);
        require(signer == msg.sender, "Bad signer");

        if (!exerciseProgression[msg.sender][1]) {
            exerciseProgression[msg.sender][1] = true;
            TDERC20.distributeTokens(msg.sender, 2);
        }
    }

    /// @notice Verify a typed EIP-712 Greeting signed by msg.sender.
    /// The `content` must equal `getContentFor(msg.sender)`.
    /// `deadline` must be in the future. The nonce must equal the current
    /// `evaluatorNonce[msg.sender]`.
    function ex2_signTypedGreeting(
        string calldata content,
        uint256 nonce,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(deadline >= block.timestamp, "expired");
        require(nonce == evaluatorNonce[msg.sender], "bad nonce");
        require(
            keccak256(bytes(content)) == keccak256(bytes(getContentFor(msg.sender))),
            "wrong content"
        );

        bytes32 digest = greetingDigest(msg.sender, content, nonce, deadline);
        address signer = ecrecover(digest, v, r, s);
        require(signer != address(0) && signer == msg.sender, "bad signer");

        evaluatorNonce[msg.sender] += 1;

        if (!exerciseProgression[msg.sender][2]) {
            exerciseProgression[msg.sender][2] = true;
            TDERC20.distributeTokens(msg.sender, 2);
        }
    }

    // -----------------------------------------------------------------------
    // Part 2 -- On-chain verification inside student's contract
    // -----------------------------------------------------------------------

    /// @notice Delegate signature verification to the student's own contract.
    /// The signature is over the SAME Greeting struct, using THIS contract's
    /// domain. The student must reconstruct the digest correctly inside
    /// `recoverGreeting` and return `msg.sender`.
    function ex3_recoverInSolution(
        string calldata content,
        uint256 nonce,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(exerciseProgression[msg.sender][0], "No solution submitted");
        require(deadline >= block.timestamp, "expired");
        require(nonce == evaluatorNonce[msg.sender], "bad nonce");
        require(
            keccak256(bytes(content)) == keccak256(bytes(getContentFor(msg.sender))),
            "wrong content"
        );

        IExerciseSolution sol = studentExerciseSolution[msg.sender];
        address recovered = sol.recoverGreeting(msg.sender, content, nonce, deadline, v, r, s);
        require(recovered == msg.sender, "solution returned wrong signer");

        evaluatorNonce[msg.sender] += 1;

        if (!exerciseProgression[msg.sender][3]) {
            exerciseProgression[msg.sender][3] = true;
            TDERC20.distributeTokens(msg.sender, 3);
        }
    }

    // -----------------------------------------------------------------------
    // Part 3 -- Signature safety (malleability + deadline)
    // -----------------------------------------------------------------------

    /// @notice Ensure the student's `recoverGreeting` rejects a mutated
    /// malleable copy of a valid signature.
    /// The caller provides a canonical (low-s) signature. The Evaluator flips
    /// it to high-s (and toggles v) and expects the student's function to
    /// revert.
    function ex4_rejectMalleable(
        string calldata content,
        uint256 nonce,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(exerciseProgression[msg.sender][0], "No solution submitted");
        require(deadline >= block.timestamp, "expired");
        require(uint256(s) <= SECP256K1_HALF_ORDER, "must submit canonical sig");
        require(
            keccak256(bytes(content)) == keccak256(bytes(getContentFor(msg.sender))),
            "wrong content"
        );

        // Sanity: the canonical signature really recovers msg.sender.
        bytes32 digest = greetingDigest(msg.sender, content, nonce, deadline);
        require(ecrecover(digest, v, r, s) == msg.sender, "canonical sig does not recover to sender");

        // Build the malleable twin.
        bytes32 sMall = bytes32(SECP256K1_ORDER - uint256(s));
        uint8 vMall = v == 27 ? 28 : 27;

        IExerciseSolution sol = studentExerciseSolution[msg.sender];

        bool reverted = false;
        try sol.recoverGreeting(msg.sender, content, nonce, deadline, vMall, r, sMall) returns (address) {
            reverted = false;
        } catch {
            reverted = true;
        }
        require(reverted, "solution accepted malleable signature");

        if (!exerciseProgression[msg.sender][4]) {
            exerciseProgression[msg.sender][4] = true;
            TDERC20.distributeTokens(msg.sender, 2);
        }
    }

    /// @notice Ensure the student's `recoverGreeting` rejects an expired
    /// deadline. The Evaluator invokes the student's function with
    /// `deadline = 0` and expects it to revert.
    function ex5_rejectExpired(
        string calldata content,
        uint256 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(exerciseProgression[msg.sender][0], "No solution submitted");

        IExerciseSolution sol = studentExerciseSolution[msg.sender];

        bool reverted = false;
        try sol.recoverGreeting(msg.sender, content, nonce, 0, v, r, s) returns (address) {
            reverted = false;
        } catch {
            reverted = true;
        }
        require(reverted, "solution accepted expired signature");

        if (!exerciseProgression[msg.sender][5]) {
            exerciseProgression[msg.sender][5] = true;
            TDERC20.distributeTokens(msg.sender, 2);
        }
    }

    // -----------------------------------------------------------------------
    // Part 4 -- ERC-2612 permit against MockUnderlying
    // -----------------------------------------------------------------------

    /// @notice Consume a permit signed by msg.sender that authorises THIS
    /// evaluator to spend `value` MOCK tokens.
    function ex6_permitMock(
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(value > 0, "value must be > 0");
        uint256 nonceBefore = mockUnderlying.nonces(msg.sender);

        mockUnderlying.permit(msg.sender, address(this), value, deadline, v, r, s);

        require(mockUnderlying.allowance(msg.sender, address(this)) >= value, "allowance not set");
        require(mockUnderlying.nonces(msg.sender) == nonceBefore + 1, "nonce not incremented");

        if (!exerciseProgression[msg.sender][6]) {
            exerciseProgression[msg.sender][6] = true;
            TDERC20.distributeTokens(msg.sender, 2);
        }
    }

    /// @notice Same as `ex6_permitMock`, but actually pulls the tokens via
    /// `transferFrom`. Student must call `mockUnderlying.getTokens(value)`
    /// beforehand so their balance covers the transfer.
    function ex7_permitAndPull(
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(value > 0, "value must be > 0");
        require(mockUnderlying.balanceOf(msg.sender) >= value, "insufficient MOCK balance");

        mockUnderlying.permit(msg.sender, address(this), value, deadline, v, r, s);

        uint256 balBefore = mockUnderlying.balanceOf(address(this));
        require(mockUnderlying.transferFrom(msg.sender, address(this), value), "pull failed");
        require(mockUnderlying.balanceOf(address(this)) == balBefore + value, "balance did not grow");

        if (!exerciseProgression[msg.sender][7]) {
            exerciseProgression[msg.sender][7] = true;
            TDERC20.distributeTokens(msg.sender, 2);
        }
    }

    // -----------------------------------------------------------------------
    // Part 5 -- Custom ERC20Permit deployed by the student
    // -----------------------------------------------------------------------

    /// @notice Sanity-check the student's ERC20Permit token metadata and
    /// domain separator layout.
    function ex8_deployedPermitToken() external {
        require(exerciseProgression[msg.sender][0], "No solution submitted");
        IStudentPermitToken token = IStudentPermitToken(studentExerciseSolution[msg.sender].getPermitToken());
        require(address(token) != address(0), "no permit token");

        require(bytes(token.name()).length > 0, "empty name");
        require(bytes(token.symbol()).length > 0, "empty symbol");

        // Nonce for a fresh unrelated address MUST be zero.
        require(token.nonces(address(0xdead)) == 0, "fresh nonce not zero");

        // Rebuild what a canonical DOMAIN_SEPARATOR should look like using
        // the token's own name and standard version "1". The chainId MUST be
        // baked in. Reject a hard-coded value.
        bytes32 expected = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes(token.name())),
                keccak256(bytes("1")),
                block.chainid,
                address(token)
            )
        );
        require(token.DOMAIN_SEPARATOR() == expected, "domain separator mismatch (name/version/chainid/address)");

        if (!exerciseProgression[msg.sender][8]) {
            exerciseProgression[msg.sender][8] = true;
            TDERC20.distributeTokens(msg.sender, 2);
        }
    }

    /// @notice Consume a permit on the student's own token that grants
    /// allowance to THIS evaluator.
    function ex9_permitOnStudentToken(
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(exerciseProgression[msg.sender][0], "No solution submitted");
        IStudentPermitToken token = IStudentPermitToken(studentExerciseSolution[msg.sender].getPermitToken());
        require(address(token) != address(0), "no permit token");

        uint256 nonceBefore = token.nonces(msg.sender);
        token.permit(msg.sender, address(this), value, deadline, v, r, s);

        require(token.allowance(msg.sender, address(this)) >= value, "allowance not set");
        require(token.nonces(msg.sender) == nonceBefore + 1, "nonce not incremented");

        if (!exerciseProgression[msg.sender][9]) {
            exerciseProgression[msg.sender][9] = true;
            TDERC20.distributeTokens(msg.sender, 3);
        }
    }

    /// @notice Ensure the student's token rejects an expired permit.
    function ex10_rejectExpiredOnStudentToken(
        uint256 value,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(exerciseProgression[msg.sender][0], "No solution submitted");
        IStudentPermitToken token = IStudentPermitToken(studentExerciseSolution[msg.sender].getPermitToken());

        bool reverted = false;
        try token.permit(msg.sender, address(this), value, 0, v, r, s) {
            reverted = false;
        } catch {
            reverted = true;
        }
        require(reverted, "student token accepted expired permit");

        if (!exerciseProgression[msg.sender][10]) {
            exerciseProgression[msg.sender][10] = true;
            TDERC20.distributeTokens(msg.sender, 2);
        }
    }

    /// @notice Ensure the student's token rejects a replayed permit.
    /// The caller signs ONE valid permit; the Evaluator consumes it, then
    /// tries to consume it a second time and expects a revert.
    function ex11_rejectReplayOnStudentToken(
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(exerciseProgression[msg.sender][0], "No solution submitted");
        IStudentPermitToken token = IStudentPermitToken(studentExerciseSolution[msg.sender].getPermitToken());

        token.permit(msg.sender, address(this), value, deadline, v, r, s);

        bool reverted = false;
        try token.permit(msg.sender, address(this), value, deadline, v, r, s) {
            reverted = false;
        } catch {
            reverted = true;
        }
        require(reverted, "student token accepted replay");

        if (!exerciseProgression[msg.sender][11]) {
            exerciseProgression[msg.sender][11] = true;
            TDERC20.distributeTokens(msg.sender, 2);
        }
    }

    // -----------------------------------------------------------------------
    // Part 6 -- Permit2
    // -----------------------------------------------------------------------

    /// @notice Student must have called `mockUnderlying.approve(PERMIT2, max)`
    /// prior to calling this. This is the one-time gas cost that unlocks
    /// signature-based transfers via Permit2.
    function ex12_approvePermit2() external {
        require(
            mockUnderlying.allowance(msg.sender, address(permit2)) >= type(uint128).max,
            "approve Permit2 with a very large allowance first"
        );

        if (!exerciseProgression[msg.sender][12]) {
            exerciseProgression[msg.sender][12] = true;
            TDERC20.distributeTokens(msg.sender, 1);
        }
    }

    /// @notice Pull `amount` MOCK from the student via Permit2 SignatureTransfer.
    /// Student signs a `PermitTransferFrom` with spender=address(this).
    function ex13_permit2SignatureTransfer(
        uint256 amount,
        uint256 permit2Nonce,
        uint256 deadline,
        bytes calldata signature
    ) external {
        require(amount > 0, "amount must be > 0");
        require(mockUnderlying.balanceOf(msg.sender) >= amount, "insufficient MOCK");
        require(
            mockUnderlying.allowance(msg.sender, address(permit2)) >= amount,
            "student did not approve Permit2"
        );

        IPermit2.PermitTransferFrom memory p = IPermit2.PermitTransferFrom({
            permitted: IPermit2.TokenPermissions({token: address(mockUnderlying), amount: amount}),
            nonce: permit2Nonce,
            deadline: deadline
        });
        IPermit2.SignatureTransferDetails memory td = IPermit2.SignatureTransferDetails({
            to: address(this),
            requestedAmount: amount
        });

        uint256 balBefore = mockUnderlying.balanceOf(address(this));
        permit2.permitTransferFrom(p, td, msg.sender, signature);
        require(mockUnderlying.balanceOf(address(this)) == balBefore + amount, "pull failed");

        if (!exerciseProgression[msg.sender][13]) {
            exerciseProgression[msg.sender][13] = true;
            TDERC20.distributeTokens(msg.sender, 3);
        }
    }

    /// @notice Register an allowance via Permit2 (AllowanceTransfer) then pull.
    /// Student signs a `PermitSingle` with spender=address(this).
    function ex14_permit2AllowanceTransfer(
        uint160 amount,
        uint48 expiration,
        uint48 permit2Nonce,
        uint256 sigDeadline,
        bytes calldata signature
    ) external {
        require(amount > 0, "amount must be > 0");
        require(mockUnderlying.balanceOf(msg.sender) >= amount, "insufficient MOCK");
        require(
            mockUnderlying.allowance(msg.sender, address(permit2)) >= amount,
            "student did not approve Permit2"
        );

        IPermit2.PermitSingle memory single = IPermit2.PermitSingle({
            details: IPermit2.PermitDetails({
                token: address(mockUnderlying),
                amount: amount,
                expiration: expiration,
                nonce: permit2Nonce
            }),
            spender: address(this),
            sigDeadline: sigDeadline
        });

        permit2.permit(msg.sender, single, signature);

        (uint160 allowed,,) = permit2.allowance(msg.sender, address(mockUnderlying), address(this));
        require(allowed >= amount, "permit2 allowance not set");

        uint256 balBefore = mockUnderlying.balanceOf(address(this));
        permit2.transferFrom(msg.sender, address(this), amount, address(mockUnderlying));
        require(mockUnderlying.balanceOf(address(this)) == balBefore + amount, "transfer failed");

        if (!exerciseProgression[msg.sender][14]) {
            exerciseProgression[msg.sender][14] = true;
            TDERC20.distributeTokens(msg.sender, 3);
        }
    }

    // -----------------------------------------------------------------------
    // Part 7 -- ERC-1271 (bonus)
    // -----------------------------------------------------------------------

    /// @notice Deterministic challenge each student's smart wallet must sign.
    function smartWalletChallenge(address student) public view returns (bytes32) {
        return keccak256(abi.encode(address(this), student, "Permit101:1271"));
    }

    function ex15_smartWallet1271(bytes calldata signature) external {
        require(exerciseProgression[msg.sender][0], "No solution submitted");
        address wallet = studentExerciseSolution[msg.sender].getSmartWallet();
        require(wallet != address(0), "no smart wallet");
        require(wallet.code.length > 0, "wallet is EOA");

        bytes32 hashToSign = smartWalletChallenge(msg.sender);
        bytes4 magic = IERC1271(wallet).isValidSignature(hashToSign, signature);
        require(magic == ERC1271_MAGIC, "isValidSignature did not return magic value");

        if (!exerciseProgression[msg.sender][15]) {
            exerciseProgression[msg.sender][15] = true;
            TDERC20.distributeTokens(msg.sender, 3);
        }
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    function _recover(bytes32 digest, bytes calldata sig) internal pure returns (address) {
        require(sig.length == 65, "bad sig length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            let ptr := sig.offset
            r := calldataload(ptr)
            s := calldataload(add(ptr, 32))
            v := byte(0, calldataload(add(ptr, 64)))
        }
        require(uint256(s) <= SECP256K1_HALF_ORDER, "malleable");
        require(v == 27 || v == 28, "bad v");
        address signer = ecrecover(digest, v, r, s);
        require(signer != address(0), "invalid sig");
        return signer;
    }

    function _toHexString(address a) internal pure returns (string memory) {
        bytes20 data = bytes20(a);
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(data[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(data[i] & 0x0f)];
        }
        return string(str);
    }

    function _uintToStr(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 j = v;
        uint256 len;
        while (j != 0) { len++; j /= 10; }
        bytes memory b = new bytes(len);
        while (v != 0) {
            len -= 1;
            b[len] = bytes1(uint8(48 + v % 10));
            v /= 10;
        }
        return string(b);
    }
}
