// Verify all three deployed contracts against Sourcify's new v2 API.
// Reads build-info from the Hardhat artifacts folder.
import * as fs from "fs";
import * as path from "path";

const CHAIN_ID = "11155111";
const SOURCIFY_URL = "https://sourcify.dev/server/v2/verify";

interface Target {
  address: string;
  contract: string; // "contracts/File.sol:Name"
}

const targets: Target[] = [
  { address: "0x0Fc3679199493fb5fD7fe1132dfC8eF0b48C9661", contract: "contracts/TDERC20_PERMIT.sol:TDERC20_PERMIT" },
  { address: "0x1C9d04b35642801C8Ff4591B6E8ba49fCDF1Bb77", contract: "contracts/MockUnderlying.sol:MockUnderlying" },
  { address: "0xB91F87D09a6582b25B20149C60Ad40f23F99d8Dc", contract: "contracts/Evaluator.sol:Evaluator" },
];

async function main() {
  const buildInfoDir = path.join(__dirname, "..", "artifacts", "build-info");
  const files = fs.readdirSync(buildInfoDir).filter((f) => f.endsWith(".json"));
  if (files.length === 0) throw new Error("No build-info found. Run `npx hardhat compile` first.");
  const buildInfoPath = path.join(buildInfoDir, files[0]);
  const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, "utf-8"));

  const compilerVersion: string = buildInfo.solcLongVersion; // e.g. "0.8.27+commit.40a35a09"
  const stdJsonInput = buildInfo.input;

  // Sourcify wants outputSelection to include what it needs. Give it everything.
  stdJsonInput.settings.outputSelection = {
    "*": {
      "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "metadata"],
      "": ["ast"],
    },
  };

  for (const t of targets) {
    console.log(`\n=== ${t.contract} @ ${t.address} ===`);
    const body = {
      stdJsonInput,
      compilerVersion,
      contractIdentifier: t.contract,
    };
    const res = await fetch(`${SOURCIFY_URL}/${CHAIN_ID}/${t.address}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    console.log(`http=${res.status}`);
    console.log(text.slice(0, 800));

    // Job created; poll for completion if we got a jobId.
    try {
      const j = JSON.parse(text);
      if (j.verificationId) {
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 3000));
          const poll = await fetch(`https://sourcify.dev/server/v2/verify/${j.verificationId}`);
          const pt = await poll.text();
          const pj = JSON.parse(pt);
          if (pj.isJobCompleted) {
            console.log(`  completed: ${JSON.stringify(pj.contract ?? pj.error ?? pj)}`);
            break;
          }
          console.log(`  polling... (${i + 1})`);
        }
      }
    } catch {}
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
