// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

// Pulls the Semaphore contracts into the build so the test-suite can deploy
// a local instance. On Sepolia the workshop uses the official deployment.
import "@semaphore-protocol/contracts/Semaphore.sol";
import "@semaphore-protocol/contracts/base/SemaphoreVerifier.sol";
