import { network } from "hardhat";
import "dotenv/config";

// deploy with: npx hardhat run scripts/deploy-amm101.ts --build-profile production --network sepolia

// Uniswap V4 PoolManager ABI (minimal for initialize)
const POOL_MANAGER_ABI = [
  "function initialize(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96) external returns (int24 tick)",
];

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

  // Uniswap V4 addresses (Sepolia)
  const poolManagerV4 = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";
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

  // ============================================
  // Deploy Uniswap V4 Pool (ETH-DummyToken)
  // ============================================
  console.log("\n=== Initializing Uniswap V4 Pool ===");

  // Sort tokens: ETH (address(0)) is always currency0 since it's the lowest address
  const currency0 = "0x0000000000000000000000000000000000000000"; // Native ETH
  const currency1 = dummytokenAddress; // DummyToken

  // Fee: 500 = 0.05%
  const fee = 500;
  // TickSpacing for 500 fee tier is 10
  const tickSpacing = 10;
  // No hooks
  const hooks = "0x0000000000000000000000000000000000000000";

  // Calculate sqrtPriceX96 for initial price: 2 ETH = 1000 DummyToken
  // In Uniswap V4, sqrtPriceX96 = sqrt(price) * 2^96
  // Price is expressed as token1/token0 = DummyToken/ETH
  // Price = 1000 / 2 = 500 DummyToken per ETH
  const sqrtPriceX96 = calculateSqrtPriceX96(500n);
  console.log(`Calculated sqrtPriceX96: ${sqrtPriceX96.toString()}`);

  // Create pool key
  const poolKey = {
    currency0,
    currency1,
    fee,
    tickSpacing,
    hooks,
  };

  console.log("Pool Key:", poolKey);

  // Get PoolManager contract
  const poolManager = new ethers.Contract(
    poolManagerV4,
    POOL_MANAGER_ABI,
    (await ethers.getSigners())[0]
  );

  // Initialize the pool
  console.log("Initializing pool...");
  try {
    const initTx = await poolManager.initialize(poolKey, sqrtPriceX96);
    const receipt = await initTx.wait();
    console.log(`Pool initialized! Tx hash: ${receipt.hash}`);

    // Calculate pool ID for reference
    const poolId = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address", "uint24", "int24", "address"],
        [currency0, currency1, fee, tickSpacing, hooks]
      )
    );
    console.log(`Pool ID: ${poolId}`);
  } catch (error: any) {
    if (error.message?.includes("PoolAlreadyInitialized")) {
      console.log("Pool already exists, skipping initialization");
    } else {
      throw error;
    }
  }

  console.log("\n=== Deployment Summary ===");
  console.log(`PointERC20: ${erc20Address}`);
  console.log(`DummyToken: ${dummytokenAddress}`);
  console.log(`Evaluator: ${evaluatorAddress}`);
  console.log(`\nUniswap V4 Pool Details:`);
  console.log(`  Currency0 (ETH): ${currency0}`);
  console.log(`  Currency1 (DummyToken): ${currency1}`);
  console.log(`  Fee: ${fee} (0.05%)`);
  console.log(`  TickSpacing: ${tickSpacing}`);
  console.log(`  Initial Price: 2 ETH = 1000 DummyToken (500 DTK/ETH)`);

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
}

// Calculate sqrtPriceX96 from price
// sqrtPriceX96 = sqrt(price) * 2^96
function calculateSqrtPriceX96(price: bigint): bigint {
  const Q192 = 2n ** 192n;
  // sqrt(price * 2^192) = sqrt(price) * 2^96
  return sqrt(price * Q192);
}

// Babylonian method for integer square root
function sqrt(value: bigint): bigint {
  if (value < 0n) throw new Error("Square root of negative number");
  if (value === 0n) return 0n;
  if (value < 4n) return 1n;

  let z = value;
  let x = value / 2n + 1n;
  while (x < z) {
    z = x;
    x = (value / x + x) / 2n;
  }
  return z;
}

// Helper function to generate random string
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
