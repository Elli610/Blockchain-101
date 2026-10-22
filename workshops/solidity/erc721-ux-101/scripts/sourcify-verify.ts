// Verifies deployed contracts on Sourcify V2 using the build-info produced by Hardhat.
// Run: npx hardhat run scripts/sourcify-verify.ts --network sepolia

import * as fs from "fs";
import * as path from "path";

const CHAIN_ID = 11155111; // Sepolia
const SOURCIFY_V2 = "https://sourcify.dev/server/v2";

type Target = { address: string; identifier: string };

const TARGETS: Target[] = [
  { address: "0x996BA4faE3a3c2d07aC780401B07E103553eAB92", identifier: "contracts/ERC20Points.sol:ERC20Points" },
  { address: "0xe446502701fA5808DB07D817B00B660fB5EA6bFB", identifier: "contracts/Evaluator.sol:Evaluator" },
  { address: "0x262fc337408995376b35f950e98b7fB60CF691f5", identifier: "contracts/FakeBAYC.sol:FakeBAYC" },
  { address: "0x4F4f92733eEEe8405764EaA6D2B7304B59642469", identifier: "contracts/FakeNefturians.sol:FakeNefturians" },
  { address: "0x589d269675BE36E4cFc3a4e04c9E5dad2ef2C4d6", identifier: "contracts/FakeMeebits.sol:FakeMeebits" },
  { address: "0xA45C08F929dfEf9a2B3E9eB3A5f9728F594f215a", identifier: "contracts/FakeMeebitsClaimer.sol:FakeMeebitsClaimer" },
];

type BuildInfo = {
  solcLongVersion: string;
  input: unknown;
  output: { contracts: Record<string, Record<string, unknown>> };
};

function loadBuildInfoFor(identifier: string): BuildInfo {
  const dir = path.join(__dirname, "..", "artifacts", "build-info");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const [sourcePath, contractName] = identifier.split(":");
  for (const file of files) {
    const bi = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as BuildInfo;
    if (bi.output?.contracts?.[sourcePath]?.[contractName]) {
      return bi;
    }
  }
  throw new Error(`No build-info found for ${identifier}`);
}

async function pollJob(verificationId: string): Promise<void> {
  const maxTries = 30;
  for (let i = 0; i < maxTries; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(`${SOURCIFY_V2}/verify/${verificationId}`, {
      headers: { "User-Agent": "erc721-ux-101/1.0 (nathan@lobster-protocol.com)" },
    });
    const body = (await res.json()) as { isJobCompleted?: boolean; error?: unknown; match?: string };
    if (body.isJobCompleted) {
      if (body.error) {
        throw new Error(`Sourcify job failed: ${JSON.stringify(body.error)}`);
      }
      console.log(`  match: ${body.match ?? "unknown"}`);
      return;
    }
  }
  throw new Error("Sourcify verification timed out");
}

async function verify(target: Target): Promise<void> {
  console.log(`\nVerifying ${target.identifier} @ ${target.address}`);
  const bi = loadBuildInfoFor(target.identifier);
  const body = {
    stdJsonInput: bi.input,
    compilerVersion: bi.solcLongVersion.startsWith("v") ? bi.solcLongVersion : `v${bi.solcLongVersion}`,
    contractIdentifier: target.identifier,
  };
  const res = await fetch(`${SOURCIFY_V2}/verify/${CHAIN_ID}/${target.address}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "erc721-ux-101/1.0 (nathan@lobster-protocol.com)",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (res.status === 409) {
    console.log(`  already verified`);
    return;
  }
  if (!res.ok) {
    throw new Error(`Sourcify ${res.status}: ${text}`);
  }
  const json = JSON.parse(text) as { verificationId?: string };
  if (!json.verificationId) {
    throw new Error(`Sourcify response missing verificationId: ${text}`);
  }
  console.log(`  job ${json.verificationId}, polling...`);
  await pollJob(json.verificationId);
}

async function main(): Promise<void> {
  for (const target of TARGETS) {
    try {
      await verify(target);
    } catch (err) {
      console.error(`  FAILED: ${(err as Error).message}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
