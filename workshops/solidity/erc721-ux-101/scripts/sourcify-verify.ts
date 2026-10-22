// Verifies deployed contracts on Sourcify V2 using the build-info produced by Hardhat.
// Run: npx hardhat run scripts/sourcify-verify.ts --network sepolia

import * as fs from "fs";
import * as path from "path";

const CHAIN_ID = 11155111; // Sepolia
const SOURCIFY_V2 = "https://sourcify.dev/server/v2";

type Target = { address: string; identifier: string };

const TARGETS: Target[] = [
  { address: "0x96eA03b5ecfF6EeeD96EE8EcEf1153Aa79a03997", identifier: "contracts/ERC20Points.sol:ERC20Points" },
  { address: "0x2822168E32E642a93DC677384d8f3F13E5b0EfC2", identifier: "contracts/Evaluator.sol:Evaluator" },
  { address: "0xF865E7DF924c46556d01997B35ed7A3f85069B62", identifier: "contracts/FakeBAYC.sol:FakeBAYC" },
  { address: "0x9a5E2c5B08cA4031d3F7fA1D7AAb8FFE79a988E2", identifier: "contracts/FakeNefturians.sol:FakeNefturians" },
  { address: "0x71A66d19c6ABFc629e0c71D6606105af991713F0", identifier: "contracts/FakeMeebits.sol:FakeMeebits" },
  { address: "0x86FB988958dB5A703B3A458284c36976638A67e3", identifier: "contracts/FakeMeebitsClaimer.sol:FakeMeebitsClaimer" },
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
