// Part 5 grader bot.
//   * Registers the instructor's stealth meta-address if needed.
//   * Exercise 2: pays a stealth address to every student who asked for it.
//   * Exercise 3: scans announcements with the instructor's keys and credits
//     the students who paid the instructor.
//
// Usage:
//   npx hardhat run scripts/stealth-keys.ts        (once, to create the keys)
//   npx hardhat run --network sepolia scripts/grader-stealth.ts
//
// Run it as often as needed: it only handles what is still pending.
import { ethers } from "hardhat";
import { CANONICAL_ERC5564_ANNOUNCER, CANONICAL_ERC6538_REGISTRY } from "./lib/deploy";
import { fromBlock, requireEnv } from "./lib/env";
import { SCHEME_ID, buildMetaAddress } from "./lib/stealth";
import { gradeStealthPayments, payRequestedStealthAddresses } from "./lib/stealth-grader";

const REGISTRY_ABI = [
  "function registerKeys(uint256 schemeId, bytes stealthMetaAddress)",
  "function stealthMetaAddressOf(address registrant, uint256 schemeId) view returns (bytes)",
];
const ANNOUNCER_ABI = [
  "function announce(uint256 schemeId, address stealthAddress, bytes ephemeralPubKey, bytes metadata)",
  "event Announcement(uint256 indexed schemeId, address indexed stealthAddress, address indexed caller, bytes ephemeralPubKey, bytes metadata)",
];

async function main() {
  const [grader] = await ethers.getSigners();
  const keys = {
    spendingPrivateKey: requireEnv("INSTRUCTOR_SPENDING_KEY"),
    viewingPrivateKey: requireEnv("INSTRUCTOR_VIEWING_KEY"),
  };
  const contracts = {
    evaluator: (await ethers.getContractAt("EvaluatorStealth", requireEnv("EVALUATOR_STEALTH_ADDRESS"))) as any,
    registry: new ethers.Contract(process.env.ERC6538_REGISTRY_ADDRESS || CANONICAL_ERC6538_REGISTRY, REGISTRY_ABI, grader),
    announcer: new ethers.Contract(
      process.env.ERC5564_ANNOUNCER_ADDRESS || CANONICAL_ERC5564_ANNOUNCER,
      ANNOUNCER_ABI,
      grader,
    ),
  };

  const metaAddress = buildMetaAddress(
    new ethers.SigningKey(keys.spendingPrivateKey).publicKey,
    new ethers.SigningKey(keys.viewingPrivateKey).publicKey,
  );
  if ((await contracts.registry.stealthMetaAddressOf(grader.address, SCHEME_ID)) !== metaAddress) {
    await (await contracts.registry.registerKeys(SCHEME_ID, metaAddress)).wait();
    console.log(`Registered the instructor meta-address for ${grader.address}`);
  }

  const payment = ethers.parseEther(process.env.STEALTH_PAYMENT || "0.0002");
  const paid = await payRequestedStealthAddresses(grader, contracts, payment, fromBlock());
  console.log(`Exercise 2: paid ${paid.length} stealth address(es)`, paid);

  const minimum = ethers.parseEther(process.env.STEALTH_MIN_AMOUNT || "0.0001");
  const credited = await gradeStealthPayments(grader, contracts, keys, minimum, fromBlock());
  console.log(`Exercise 3: credited ${credited.length} student(s)`, credited);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
