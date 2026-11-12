// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "../../../contracts/pool/IVerifier.sol";

/// @notice Stand-in for the generated zero-knowledge verifier. A "proof" is
/// valid when it equals the keccak256 hash of the public inputs. This lets the
/// test-suite exercise the Evaluator and the pool logic without a prover.
contract MockVerifier is IVerifier {
    function verify(bytes calldata proof, bytes32[] calldata publicInputs) external pure returns (bool) {
        return proof.length == 32 && bytes32(proof) == keccak256(abi.encodePacked(publicInputs));
    }
}
