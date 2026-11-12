import { HardhatUserConfig, subtask } from "hardhat/config";
import { TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS } from "hardhat/builtin-tasks/task-names";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

// The local test-suite needs a few extra contracts (mocks of third-party
// deployments and instructor reference solutions). They live under
// reference/contracts so that they stay out of the workshop's contracts folder.
function listSolidityFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSolidityFiles(full);
    return entry.name.endsWith(".sol") ? [full] : [];
  });
}

subtask(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS).setAction(async (_, { config }, runSuper) => {
  const paths: string[] = await runSuper();
  return [...paths, ...listSolidityFiles(path.join(config.paths.root, "reference", "contracts"))];
});

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
    },
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
  mocha: {
    timeout: 600000,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  // The hardhat-verify Sourcify client still targets Sourcify's API v1, which
  // has been removed. Etherscan verification is used instead.
  sourcify: {
    enabled: false,
  },
};

export default config;
