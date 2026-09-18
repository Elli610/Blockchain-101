// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

/// @notice The student's single "facade" contract that surfaces every address
/// the Evaluator needs across the four levels. Return `address(0)` for a slot
/// you have not built yet; the Evaluator will simply not grade that exercise.
///
/// The Evaluator NEVER holds any admin role. Every upgrade must be triggered
/// by the student's own EOA. The Evaluator only reads state and checks the
/// bytecode / storage results.
interface IExerciseSolution {
    // -------- Level 1: EIP-1167 minimal proxy --------
    function getMinimalProxyLogic() external view returns (address);
    function getMinimalProxy()      external view returns (address);

    // -------- Level 2: Transparent Proxy (EIP-1967) --------
    function getTransparentLogicV1() external view returns (address);
    function getTransparentLogicV2() external view returns (address);
    function getTransparentProxy()   external view returns (address);
    /// A LogicV2 that INTENTIONALLY inserts a new storage slot BEFORE `value`
    /// (broken storage layout). Used by the collision-trap exercise.
    function getTransparentLogicBroken() external view returns (address);

    // -------- Level 3: UUPS (EIP-1822) --------
    function getUUPSLogicV1() external view returns (address);
    function getUUPSLogicV2() external view returns (address);
    function getUUPSProxy()   external view returns (address);
    /// A non-UUPS impl (missing / wrong `proxiableUUID`) used to test the
    /// brick-protection exercise.
    function getUUPSNonUpgradeable() external view returns (address);

    // -------- Level 4: Beacon Proxy --------
    function getBeaconLogicV1() external view returns (address);
    function getBeaconLogicV2() external view returns (address);
    function getBeacon()        external view returns (address);
    function getBeaconProxyA()  external view returns (address);
    function getBeaconProxyB()  external view returns (address);
}
