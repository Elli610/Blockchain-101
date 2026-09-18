// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

/// @notice Minimal ERC-20 + ERC-2612 surface used by the Evaluator to test
/// student-deployed permit tokens. Kept local, and named distinctly from
/// canonical library interfaces to avoid symbol collisions in the compilation
/// unit.
interface IStudentPermitToken {
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function nonces(address owner) external view returns (uint256);

    function DOMAIN_SEPARATOR() external view returns (bytes32);

    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}
