// Verify deployed contracts against Sourcify's v2 API.
// Works around hardhat-verify@2.1.3 still pointing at removed legacy endpoints.
//
// Usage:
//   TDERC20_ADDRESS=0x... EVALUATOR_ADDRESS=0x... \
//     ts-node scripts/sourcify-verify.ts
import * as fs from "fs";
import * as path from "path";

const CHAIN_ID = "11155111";
const SOURCIFY_URL = "https://sourcify.dev/server/v2/verify";

interface Target {
  address: string;
  contract: string;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function main() {
  const targets: Target[] = [
    { address: requireEnv("TDERC20_ADDRESS"), contract: "contracts/TDERC20_PROXY.sol:TDERC20_PROXY" },
    { address: requireEnv("EVALUATOR_ADDRESS"), contract: "contracts/Evaluator.sol:Evaluator" },
  ];

  const buildInfoDir = path.join(__dirname, "..", "artifacts", "build-info");
  const files = fs.readdirSync(buildInfoDir).filter((f) => f.endsWith(".json"));
  if (files.length === 0) throw new Error("No build-info found. Run `npx hardhat compile` first.");
  const buildInfoPath = path.join(buildInfoDir, files[0]);
  const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, "utf-8"));
  const compilerVersion: string = buildInfo.solcLongVersion;
  const stdJsonInput = buildInfo.input;
  stdJsonInput.settings.outputSelection = {
    "*": { "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "metadata"], "": ["ast"] },
  };

  for (const t of targets) {
    console.log(`\n=== ${t.contract} @ ${t.address} ===`);
    const body = { stdJsonInput, compilerVersion, contractIdentifier: t.contract };
    const res = await fetch(`${SOURCIFY_URL}/${CHAIN_ID}/${t.address}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    console.log(`http=${res.status}`);
    console.log(text.slice(0, 600));

    try {
      const j = JSON.parse(text);
      if (j.verificationId) {
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 3000));
          const poll = await fetch(`https://sourcify.dev/server/v2/verify/${j.verificationId}`);
          const pj = JSON.parse(await poll.text());
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
