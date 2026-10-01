// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

/// @notice Interface every student solution contract must implement.
///
/// The student's contract is registered on the Evaluator via `submitExercise`.
/// The Evaluator will call the functions below to grade Parts 2, 5 and 7.
interface IExerciseSolution {
    /// @notice Reconstruct the EIP-712 digest for the Evaluator's `Greeting`
    /// struct and recover the signer using `ecrecover`.
    ///
    /// The struct is:
    ///   Greeting(address who, string content, uint256 nonce, uint256 deadline)
    ///
    /// The domain is the Evaluator's own EIP-712 domain (name, version,
    /// chainId, verifyingContract == Evaluator address).
    ///
    /// Requirements the student MUST enforce:
    ///  * revert with "expired" if `deadline < block.timestamp`
    ///  * revert with "malleable" if `s > secp256k1n / 2`
    ///  * revert with "bad v" if `v` is not 27 or 28
    ///  * on success, return the recovered address (never `address(0)`)
    function recoverGreeting(
        address who,
        string calldata content,
        uint256 nonce,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external view returns (address signer);

    /// @notice Address of the student's own ERC20 token with a working
    /// `permit()` (ERC-2612 compatible). The Evaluator uses it in Part 5.
    ///
    /// The token MUST expose the following surface at minimum:
    ///  * name(), symbol(), decimals()
    ///  * balanceOf, allowance, approve, transfer, transferFrom
    ///  * permit(owner, spender, value, deadline, v, r, s)
    ///  * nonces(address)
    ///  * DOMAIN_SEPARATOR()
    ///
    /// The student SHOULD also expose a public mint or faucet so anyone can
    /// obtain tokens for testing.
    function getPermitToken() external view returns (address);

    /// @notice Optional. Address of an ERC-1271 smart-contract wallet the
    /// student controls. Return `address(0)` if you skip the bonus exercise.
    function getSmartWallet() external view returns (address);
}
