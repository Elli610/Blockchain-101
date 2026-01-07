import { network } from "hardhat";
import "dotenv/config";

// deploy with: npx hardhat run scripts/deploy-amm101.ts --build-profile production --network sepolia
async function main() {
  const { ethers, networkName } = await network.connect();

  console.log(`Deploying contracts to ${networkName}...`);

  // Deploy PointERC20
  console.log("Deploying PointERC20...");
  const erc20 = await ethers.deployContract("PointERC20", [
    "AMM-101",
    "AMM-101",
    0,
  ]);
  await erc20.waitForDeployment();
  const erc20Address = await erc20.getAddress();
  console.log(`PointERC20 deployed at ${erc20Address}`);

  // Deploy DummyToken
  console.log("Deploying DummyToken...");
  const dummytoken = await ethers.deployContract("DummyToken", [
    "dummyToken",
    "DTK",
    ethers.parseUnits("2000000000", 18), // 2 billion tokens with 18 decimals
  ]);
  await dummytoken.waitForDeployment();
  const dummytokenAddress = await dummytoken.getAddress();
  console.log(`DummyToken deployed at ${dummytokenAddress}`);

  // Uniswap V2 addresses
  const positionManagerV4 = "0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4";
  const stateViewV4 = "0xe1dd9c3fa50edb962e442f60dfbc432e24537e4c";
  const wethAddress = "0x0000000000000000000000000000000000000000";

  // Deploy Evaluator
  console.log("Deploying Evaluator...");
  const evaluator = await ethers.deployContract("Evaluator", [
    erc20Address,
    dummytokenAddress,
    positionManagerV4,
    stateViewV4,
    wethAddress,
  ]);
  await evaluator.waitForDeployment();
  const evaluatorAddress = await evaluator.getAddress();
  console.log(`Evaluator deployed at ${evaluatorAddress}`);

  // Set the teacher
  console.log("Setting teacher...");
  const setTeacherTx = await erc20.setTeacher(evaluatorAddress, true);
  await setTeacherTx.wait();
  console.log("Teacher set successfully");

  // Generate random values
  const randomSupplies: number[] = [];
  const randomTickers: string[] = [];

  for (let i = 0; i < 20; i++) {
    randomSupplies.push(Math.floor(Math.random() * 1000000000));
    randomTickers.push(generateRandomString(5));
  }

  console.log("Random Tickers:", randomTickers);
  console.log("Random Supplies:", randomSupplies);

  // Set random tickers and supply
  console.log("Setting random tickers and supply...");
  const setRandomTx = await evaluator.setRandomTickersAndSupply(
    randomSupplies,
    randomTickers
  );
  await setRandomTx.wait();
  console.log("Random tickers and supply set successfully");

  console.log("\n=== Deployment Summary ===");
  console.log(`PointERC20: ${erc20Address}`);
  console.log(`DummyToken: ${dummytokenAddress}`);
  console.log(`Evaluator: ${evaluatorAddress}`);
  console.log("\nTo verify on Etherscan:");
  console.log(
    `npx hardhat verify --network ${networkName} ${erc20Address} "TD-AMM-101" "TD-AMM-101" 0`
  );
  console.log(
    `npx hardhat verify --network ${networkName} ${dummytokenAddress} "dummyToken" "DTK" "${ethers.parseUnits(
      "2000000000",
      18
    )}"`
  );
  console.log(
    `npx hardhat verify --network ${networkName} ${evaluatorAddress} ${erc20Address} ${dummytokenAddress} ${positionManagerV4} ${stateViewV4} ${wethAddress}`
  );

  console.log(
    "Don't forget to deploy a uniswxap v4 pool with WETH and DummyToken"
  );
}

// Helper function to generate random string (replacement for @supercharge/strings)
function generateRandomString(length: number): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
