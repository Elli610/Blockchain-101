// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

/// @notice Minimal interface for Uniswap's Permit2 covering both entry points
/// used in this workshop: SignatureTransfer and AllowanceTransfer.
///
/// Canonical deployment on every EVM chain (including Sepolia):
///   0x000000000022D473030F116dDEE9F6B43aC78BA3
interface IPermit2 {
    // -----------------------------------------------------------------------
    // SignatureTransfer
    // -----------------------------------------------------------------------
    struct TokenPermissions {
        address token;
        uint256 amount;
    }

    struct PermitTransferFrom {
        TokenPermissions permitted;
        uint256 nonce;
        uint256 deadline;
    }

    struct SignatureTransferDetails {
        address to;
        uint256 requestedAmount;
    }

    function permitTransferFrom(
        PermitTransferFrom memory permit,
        SignatureTransferDetails calldata transferDetails,
        address owner,
        bytes calldata signature
    ) external;

    // -----------------------------------------------------------------------
    // AllowanceTransfer
    // -----------------------------------------------------------------------
    struct PermitDetails {
        address token;
        uint160 amount;
        uint48 expiration;
        uint48 nonce;
    }

    struct PermitSingle {
        PermitDetails details;
        address spender;
        uint256 sigDeadline;
    }

    function permit(
        address owner,
        PermitSingle memory permitSingle,
        bytes calldata signature
    ) external;

    function transferFrom(
        address from,
        address to,
        uint160 amount,
        address token
    ) external;

    function allowance(
        address user,
        address token,
        address spender
    ) external view returns (uint160 amount, uint48 expiration, uint48 nonce);

    function DOMAIN_SEPARATOR() external view returns (bytes32);
}
