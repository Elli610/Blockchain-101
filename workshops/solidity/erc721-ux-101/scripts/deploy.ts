// Deploys the full TD contract set and wires permissions.
// Run: npx hardhat run scripts/deploy.ts --network sepolia

import { ethers } from "hardhat";

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${await deployer.getAddress()}`);

  const PointsERC20 = await ethers.getContractFactory("ERC20Points");
  const points = await PointsERC20.deploy("ERC721-UX-101", "ERC721-UX-101", 0);
  await points.waitForDeployment();
  const pointsAddress = await points.getAddress();

  const Evaluator = await ethers.getContractFactory("Evaluator");
  const evaluator = await Evaluator.deploy(pointsAddress);
  await evaluator.waitForDeployment();
  const evaluatorAddress = await evaluator.getAddress();

  const FakeBAYC = await ethers.getContractFactory("FakeBAYC");
  const fakeBAYC = await FakeBAYC.deploy();
  await fakeBAYC.waitForDeployment();
  const fakeBAYCAddress = await fakeBAYC.getAddress();

  const FakeNefturians = await ethers.getContractFactory("FakeNefturians");
  const fakeNefturians = await FakeNefturians.deploy();
  await fakeNefturians.waitForDeployment();
  const fakeNefturiansAddress = await fakeNefturians.getAddress();

  const FakeMeebits = await ethers.getContractFactory("FakeMeebits");
  const fakeMeebits = await FakeMeebits.deploy();
  await fakeMeebits.waitForDeployment();
  const fakeMeebitsAddress = await fakeMeebits.getAddress();

  const FakeMeebitsClaimer = await ethers.getContractFactory("FakeMeebitsClaimer");
  const claimer = await FakeMeebitsClaimer.deploy(10_000n, fakeMeebitsAddress);
  await claimer.waitForDeployment();
  const claimerAddress = await claimer.getAddress();

  // Wire permissions
  await (await points.setTeacher(evaluatorAddress, true)).wait();
  await (
    await evaluator.setTokenAddresses(fakeBAYCAddress, fakeNefturiansAddress, fakeMeebitsAddress)
  ).wait();
  await (await fakeMeebits.manageMinter(claimerAddress, true)).wait();

  console.log("");
  console.log("Deployment summary:");
  console.log(`  ERC20Points:        ${pointsAddress}`);
  console.log(`  Evaluator:          ${evaluatorAddress}`);
  console.log(`  FakeBAYC:           ${fakeBAYCAddress}`);
  console.log(`  FakeNefturians:     ${fakeNefturiansAddress}`);
  console.log(`  FakeMeebits:        ${fakeMeebitsAddress}`);
  console.log(`  FakeMeebitsClaimer: ${claimerAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
