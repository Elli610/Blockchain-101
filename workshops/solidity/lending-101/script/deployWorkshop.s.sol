// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

// forge script script/deployWorkshop.s.sol:DeployScript --rpc-url <your-rpc-url> --broadcast --private-key <your-private-key> --resume
// forge verify-contract CONTRACT_ADDRESS ERC20TD --chain-id 11155111 --watch --constructor-args $(cast abi-encode "constructor(string,string,uint256)" "Lending-101" "Lend-101" 0) --etherscan-api-key your_etherscan_api_key
// forge verify-contract CONTRACT_ADDRESS Evaluator --chain-id 11155111 --watch --constructor-args $(cast abi-encode "constructor(address,address,address,address,address)" "0x8dBC7695655eA16e041476fa583f2F86cE4f83C9" "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357" "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8" "0x36B5dE936eF1710E1d22EabE5231b28581a92ECc" "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951") --etherscan-api-key your_etherscan_api_key

import "forge-std/Test.sol";
import {Script} from "forge-std/Script.sol";
import {ERC20TD} from "../src/ERC20TD.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Evaluator} from "../src/Evaluator.sol";
import {AAVE_POOL_ADDRESS, ADAI_ADDRESS, ADAI_ADDRESS, USDC_ADDRESS, VARIABLE_DEBT_USDC_ADDRESS} from "../src/Constants.sol";
// forge script script/deployWorkshop.s.sol:DeployScript --rpc-url <your-rpc-url> --broadcast --private-key <your-private-key>
contract DeployScript is Script {
    function run() public {
        vm.startBroadcast();

        // Deploy ERC20TD
        ERC20TD erc20 = new ERC20TD("Lending-101", "Lend-101", 0);

        // Deploy Evaluator
        Evaluator evaluator = new Evaluator(
            erc20,
            IERC20(ADAI_ADDRESS),
            IERC20(USDC_ADDRESS),
            IERC20(VARIABLE_DEBT_USDC_ADDRESS),
            AAVE_POOL_ADDRESS
        );

        // Set teacher
        erc20.setTeacher(address(evaluator), true);

        vm.stopBroadcast();

        // Log deployment addresses
        console.log("Reward token deployed at:", address(erc20));
        console.log("Evaluator deployed at:", address(evaluator));
    }
}
