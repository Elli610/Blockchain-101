// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
import "./interfaces/IPool.sol";
import "./ERC20TD.sol";
import {AAVE_POOL_ADDRESS, DAI_ADDRESS} from "./Constants.sol";

contract ExerciseSolution {
    function depositSomeTokens() external {
        // Approve dai for AAVE
        ERC20TD(DAI_ADDRESS).approve(AAVE_POOL_ADDRESS, 10 * 10 ** 18);
        // Deposit in AAVE
        IPool(AAVE_POOL_ADDRESS).supply(DAI_ADDRESS, 10 * 10 ** 18, address(this), 0);
    }
}
