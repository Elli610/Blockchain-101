// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "./TDERC20_PROXY.sol";
import "./IExerciseSolution.sol";
import "./ILogic.sol";
import "./IUUPS.sol";
import "./IBeacon.sol";

/// @notice Grades every exercise of the Proxy and Upgradability 101 workshop.
///
/// Design notes
/// ============
///  * The Evaluator NEVER holds admin/owner on any student proxy. All upgrades
///    are triggered by the student's own EOA off-chain, between exercise
///    calls. Each `exN_...` reads the resulting state and awards points.
///  * On-chain reading of another contract's raw storage is impossible from
///    Solidity, so grading uses BEHAVIOURAL checks only (version, roundtrip,
///    revert-on-unauthorised-call).
///  * Where a "structural" property matters (e.g. the EIP-1167 45-byte
///    template, or the storage collision in Level 2), grading exploits an
///    observable side-effect rather than direct introspection.
interface IBrokenLogic {
    /// @notice The student's broken V2 must expose this extra getter so the
    /// Evaluator can confirm the pre-upgrade `value` has been shifted into
    /// a different slot. See ex7.
    function wrongSlot0() external view returns (uint256);
}

contract Evaluator {
    // -----------------------------------------------------------------------
    // Constants
    // -----------------------------------------------------------------------

    /// @dev EIP-1967 implementation slot:
    ///   bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1)
    bytes32 public constant EIP1967_IMPLEMENTATION_SLOT =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    /// @dev EIP-1167 minimal-proxy template pieces.
    bytes10 private constant EIP1167_PREFIX = 0x363d3d373d3d3d363d73;
    bytes15 private constant EIP1167_SUFFIX = 0x5af43d82803e903d91602b57fd5bf3;

    /// @dev Sentinel value written through the proxy in ex5, then checked
    /// after the collision upgrade in ex7.
    uint256 private constant COLLISION_SENTINEL =
        0x1337cafebabe1337cafebabe1337cafebabe1337cafebabe1337cafebabe1337;

    // -----------------------------------------------------------------------
    // Storage
    // -----------------------------------------------------------------------

    TDERC20_PROXY public TDERC20;

    mapping(address => bool) public teachers;
    mapping(address => mapping(uint256 => bool)) public exerciseProgression;
    mapping(address => IExerciseSolution) public studentExerciseSolution;
    mapping(address => bool) public hasBeenPaired;

    event constructedCorrectly(address tdErc20);

    constructor(TDERC20_PROXY _td) {
        TDERC20 = _td;
        teachers[msg.sender] = true;
        emit constructedCorrectly(address(_td));
    }

    fallback() external payable {}
    receive() external payable {}

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

    // =======================================================================
    // Level 1: EIP-1167 Minimal Proxy
    // =======================================================================

    /// @notice Verify the Level 1 logic implementation is a working ILogic
    /// contract on its own.
    function ex1_deployLogicMinimal() external {
        _requireSolution();
        address logic = studentExerciseSolution[msg.sender].getMinimalProxyLogic();
        require(logic.code.length > 0, "logic has no code");
        require(_streq(ILogic(logic).version(), "v1"), "logic.version must be v1");
        _award(msg.sender, 1, 2);
    }

    /// @notice The Level 1 proxy runtime code MUST match the exact 45-byte
    /// EIP-1167 template with the logic address embedded at bytes [10..29].
    function ex2_deployMinimalProxyBytecode() external {
        _requireSolution();
        IExerciseSolution sol = studentExerciseSolution[msg.sender];
        address proxy = sol.getMinimalProxy();
        address logic = sol.getMinimalProxyLogic();

        require(proxy.code.length == 45, "proxy code length must be 45");
        bytes memory expected = abi.encodePacked(
            EIP1167_PREFIX,
            logic,
            EIP1167_SUFFIX
        );
        require(keccak256(proxy.code) == keccak256(expected), "proxy code != EIP-1167 template");

        _award(msg.sender, 2, 3);
    }

    /// @notice Verify state lives in the proxy and code delegates to the impl.
    function ex3_minimalProxyDelegates() external {
        _requireSolution();
        address proxy = studentExerciseSolution[msg.sender].getMinimalProxy();

        // First call may initialize; ignore its result. On a correctly built
        // impl, subsequent initialize calls revert.
        try ILogic(proxy).initialize(1) { } catch { }

        uint256 marker = uint256(keccak256(abi.encode(msg.sender, block.number, "minimal")));
        ILogic(proxy).setValue(marker);
        require(ILogic(proxy).value() == marker, "value not persisted through proxy");
        require(_streq(ILogic(proxy).version(), "v1"), "proxy did not delegate to v1");

        _award(msg.sender, 3, 2);
    }

    // =======================================================================
    // Level 2: Transparent Proxy (EIP-1967)
    // =======================================================================

    /// @notice The Transparent proxy is up, delegates to V1, and initialize +
    /// setValue + value roundtrip works.
    function ex4_transparentProxyBasics() external {
        _requireSolution();
        IExerciseSolution sol = studentExerciseSolution[msg.sender];
        address proxy = sol.getTransparentProxy();
        address v1 = sol.getTransparentLogicV1();

        require(proxy.code.length > 0 && v1.code.length > 0, "no code");
        require(proxy != v1, "proxy must not be the impl itself");
        require(_streq(ILogic(proxy).version(), "v1"), "proxy not on v1");

        try ILogic(proxy).initialize(1) { } catch { }
        uint256 marker = uint256(keccak256(abi.encode(msg.sender, "transparent-basic")));
        ILogic(proxy).setValue(marker);
        require(ILogic(proxy).value() == marker, "value not persisted");

        _award(msg.sender, 4, 3);
    }

    /// @notice After the student upgrades the Transparent proxy to V2, the
    /// proxy MUST expose V2's `version()` and MUST keep state working.
    /// Also writes `COLLISION_SENTINEL` into `value` so ex7 can prove the
    /// storage-collision trap on the subsequent upgrade to `broken`.
    function ex5_transparentUpgrade() external {
        _requireSolution();
        IExerciseSolution sol = studentExerciseSolution[msg.sender];
        address proxy = sol.getTransparentProxy();
        address v2 = sol.getTransparentLogicV2();

        require(v2.code.length > 0, "v2 no code");
        require(_streq(ILogic(proxy).version(), "v2"), "proxy did not upgrade to v2");

        // Set the sentinel so ex7 can observe the storage shift.
        ILogic(proxy).setValue(COLLISION_SENTINEL);
        require(ILogic(proxy).value() == COLLISION_SENTINEL, "state broken after upgrade");

        _award(msg.sender, 5, 3);
    }

    /// @notice The Evaluator (not admin) MUST NOT be able to trigger an
    /// upgrade. Either the proxy reverts on admin-mismatch, or the call falls
    /// through to the impl which does not have an `upgradeTo` selector and
    /// reverts. Both are acceptable outcomes.
    function ex6_transparentAdminGating() external {
        _requireSolution();
        IExerciseSolution sol = studentExerciseSolution[msg.sender];
        address proxy = sol.getTransparentProxy();
        address v2 = sol.getTransparentLogicV2();

        string memory versionBefore = ILogic(proxy).version();
        require(_streq(versionBefore, "v2"), "call this after ex5 (proxy must be on v2)");

        // Attempt to hijack from a non-admin caller.
        (bool ok, ) = proxy.call(abi.encodeWithSignature("upgradeTo(address)", address(this)));
        require(!ok, "non-admin was able to upgradeTo(this)");

        (ok, ) = proxy.call(abi.encodeWithSignature("upgradeTo(address)", v2));
        require(!ok, "non-admin was able to upgradeTo(v2)");

        require(_streq(ILogic(proxy).version(), versionBefore), "version changed after unauthorised call");

        _award(msg.sender, 6, 3);
    }

    /// @notice Storage-collision trap. The student registered a `broken` V2
    /// that inserts an extra storage slot BEFORE `value`, shifting the layout.
    /// After the student upgrades the Transparent proxy to `broken`, this
    /// exercise confirms the collision by observing that:
    ///   * `version()` returns "vBROKEN"
    ///   * `value()` now reads slot 1 (previously unused), returning 0
    ///   * `wrongSlot0()` returns the old value (COLLISION_SENTINEL) that
    ///     used to live at slot 0.
    function ex7_transparentStorageCollision() external {
        _requireSolution();
        require(exerciseProgression[msg.sender][5], "run ex5 first (need sentinel written)");

        IExerciseSolution sol = studentExerciseSolution[msg.sender];
        address proxy = sol.getTransparentProxy();
        address broken = sol.getTransparentLogicBroken();

        require(broken.code.length > 0, "broken impl no code");
        require(_streq(ILogic(proxy).version(), "vBROKEN"), "proxy not on broken impl (version must be vBROKEN)");

        // The old `value` (COLLISION_SENTINEL) is now sitting at what the
        // broken impl calls `wrongSlot0`. `value()` reads slot 1, which is
        // untouched, so it returns 0.
        require(ILogic(proxy).value() == 0, "broken value() must read the empty shifted slot");

        try IBrokenLogic(proxy).wrongSlot0() returns (uint256 wrong) {
            require(wrong == COLLISION_SENTINEL, "wrongSlot0 must hold the pre-collision value");
        } catch {
            revert("broken impl must expose wrongSlot0() view");
        }

        _award(msg.sender, 7, 3);
    }

    // =======================================================================
    // Level 3: UUPS (EIP-1822)
    // =======================================================================

    /// @notice UUPS basics: proxy delegates to V1 and V1 is UUPS-safe.
    function ex8_uupsBasics() external {
        _requireSolution();
        IExerciseSolution sol = studentExerciseSolution[msg.sender];
        address proxy = sol.getUUPSProxy();
        address v1 = sol.getUUPSLogicV1();

        require(proxy.code.length > 0 && v1.code.length > 0, "no code");
        require(proxy != v1, "proxy must not be the impl");
        require(_streq(ILogic(proxy).version(), "v1"), "proxy not on v1");

        try ILogic(proxy).initialize(1) { } catch { }
        uint256 marker = uint256(keccak256(abi.encode(msg.sender, "uups-basic")));
        ILogic(proxy).setValue(marker);
        require(ILogic(proxy).value() == marker, "value not persisted");

        require(
            IUUPS(v1).proxiableUUID() == EIP1967_IMPLEMENTATION_SLOT,
            "v1.proxiableUUID != EIP-1967 slot"
        );

        _award(msg.sender, 8, 3);
    }

    /// @notice After the student upgrades the UUPS proxy to V2, state must
    /// persist and V2 must also be UUPS-safe.
    function ex9_uupsUpgrade() external {
        _requireSolution();
        IExerciseSolution sol = studentExerciseSolution[msg.sender];
        address proxy = sol.getUUPSProxy();
        address v2 = sol.getUUPSLogicV2();

        require(v2.code.length > 0, "v2 no code");
        require(_streq(ILogic(proxy).version(), "v2"), "proxy did not upgrade to v2");
        require(
            IUUPS(v2).proxiableUUID() == EIP1967_IMPLEMENTATION_SLOT,
            "v2.proxiableUUID != EIP-1967 slot"
        );

        // Roundtrip after upgrade.
        ILogic(proxy).setValue(0xC0FFEE);
        require(ILogic(proxy).value() == 0xC0FFEE, "state broken after upgrade");

        _award(msg.sender, 9, 3);
    }

    /// @notice Brick-protection: the student's `upgradeTo` MUST refuse to
    /// point at a contract whose `proxiableUUID()` does not return the
    /// canonical EIP-1967 slot. The student demonstrates this by:
    ///   1. Registering a non-UUPS impl via `getUUPSNonUpgradeable()`.
    ///   2. Attempting to upgrade the proxy to that impl off-chain. The tx
    ///      must revert.
    ///   3. Calling ex10 to confirm the proxy is still on V2.
    function ex10_uupsBrickProtection() external {
        _requireSolution();
        IExerciseSolution sol = studentExerciseSolution[msg.sender];
        address proxy = sol.getUUPSProxy();
        address v2 = sol.getUUPSLogicV2();
        address bad = sol.getUUPSNonUpgradeable();

        require(bad != address(0) && bad.code.length > 0, "no non-UUPS impl registered");
        require(bad != v2, "non-UUPS impl must be distinct from v2");

        // The impl really is non-UUPS: proxiableUUID reverts OR returns wrong.
        bool badLooksUUPS;
        try IUUPS(bad).proxiableUUID() returns (bytes32 slot) {
            badLooksUUPS = (slot == EIP1967_IMPLEMENTATION_SLOT);
        } catch {
            badLooksUUPS = false;
        }
        require(!badLooksUUPS, "registered impl claims to be UUPS-safe; not a brick candidate");

        // The proxy must still be on V2. Since brick protection refused the
        // dangerous upgrade, no state change happened.
        require(_streq(ILogic(proxy).version(), "v2"), "proxy no longer on v2 (brick protection missing?)");

        _award(msg.sender, 10, 4);
    }

    // =======================================================================
    // Level 4: Beacon Proxy
    // =======================================================================

    /// @notice Beacon exposes `implementation()` and both proxies delegate.
    function ex11_beaconBasics() external {
        _requireSolution();
        IExerciseSolution sol = studentExerciseSolution[msg.sender];
        address beacon = sol.getBeacon();
        address logicV1 = sol.getBeaconLogicV1();
        address a = sol.getBeaconProxyA();
        address b = sol.getBeaconProxyB();

        require(beacon.code.length > 0, "beacon no code");
        require(IBeacon(beacon).implementation() == logicV1, "beacon.implementation != v1");
        require(a.code.length > 0 && b.code.length > 0, "beacon proxy no code");
        require(a != b, "beacon proxies must be distinct");

        try ILogic(a).initialize(1) { } catch { }
        try ILogic(b).initialize(2) { } catch { }
        require(_streq(ILogic(a).version(), "v1"), "ProxyA not on v1");
        require(_streq(ILogic(b).version(), "v1"), "ProxyB not on v1");

        _award(msg.sender, 11, 2);
    }

    /// @notice State in one beacon proxy must be independent of the other.
    function ex12_beaconStateIndependence() external {
        _requireSolution();
        IExerciseSolution sol = studentExerciseSolution[msg.sender];
        address a = sol.getBeaconProxyA();
        address b = sol.getBeaconProxyB();

        uint256 va = uint256(keccak256(abi.encode(msg.sender, "beacon-a")));
        uint256 vb = va ^ 1;

        ILogic(a).setValue(va);
        ILogic(b).setValue(vb);
        require(ILogic(a).value() == va, "A value wrong");
        require(ILogic(b).value() == vb, "B value wrong");
        require(ILogic(a).value() != ILogic(b).value(), "state not independent");

        _award(msg.sender, 12, 2);
    }

    /// @notice After the student upgrades the beacon to V2, BOTH proxies must
    /// immediately see V2 code and preserve their independent state.
    function ex13_beaconUpgrade() external {
        _requireSolution();
        IExerciseSolution sol = studentExerciseSolution[msg.sender];
        address beacon = sol.getBeacon();
        address logicV2 = sol.getBeaconLogicV2();
        address a = sol.getBeaconProxyA();
        address b = sol.getBeaconProxyB();

        require(logicV2.code.length > 0, "beacon v2 no code");
        require(IBeacon(beacon).implementation() == logicV2, "beacon not upgraded to v2");
        require(_streq(ILogic(a).version(), "v2"), "ProxyA did not observe upgrade");
        require(_streq(ILogic(b).version(), "v2"), "ProxyB did not observe upgrade");

        uint256 va = 0xAAA000 + block.number;
        uint256 vb = 0xBBB000 + block.number;
        ILogic(a).setValue(va);
        ILogic(b).setValue(vb);
        require(ILogic(a).value() == va, "A state broken");
        require(ILogic(b).value() == vb, "B state broken");
        require(ILogic(a).value() != ILogic(b).value(), "state cross-contamination after upgrade");

        _award(msg.sender, 13, 3);
    }

    // =======================================================================
    // Internal helpers
    // =======================================================================

    function _requireSolution() internal view {
        require(exerciseProgression[msg.sender][0], "No solution submitted");
    }

    function _award(address who, uint256 exId, uint256 points) internal {
        if (!exerciseProgression[who][exId]) {
            exerciseProgression[who][exId] = true;
            TDERC20.distributeTokens(who, points);
        }
    }

    function _streq(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
}
