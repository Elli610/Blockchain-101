// deploy: npx hardhat run scripts/deploy.ts --network sepolia

import { ethers } from "hardhat";
import { randomBytes } from "crypto";

function generateRandomString(length: number): string {
  return randomBytes(length).toString("hex").substring(0, length);
}

async function main(): Promise<void> {
  // Deploying contracts
  const PointsERC20 = await ethers.getContractFactory("ERC20Points");
  const Evaluator = await ethers.getContractFactory("Evaluator");
  const Evaluator2 = await ethers.getContractFactory("Evaluator2");

  const erc20 = await PointsERC20.deploy("ERC721-101", "ERC721-101", 0);
  await erc20.waitForDeployment();

  const evaluator = await Evaluator.deploy(await erc20.getAddress());
  const evaluator2 = await Evaluator2.deploy(await erc20.getAddress());

  await evaluator.waitForDeployment();
  await evaluator2.waitForDeployment();

  console.log(`PointsERC20 deployed at  ${await erc20.getAddress()}`);
  console.log(`Evaluator deployed at ${await evaluator.getAddress()}`);
  console.log(`Evaluator2 deployed at ${await evaluator2.getAddress()}`);

  // Setting the teacher
  await erc20.setTeacher(await evaluator.getAddress(), true);
  await erc20.setTeacher(await evaluator2.getAddress(), true);

  // Setting random values
  const randomNames: string[] = [];
  const randomLegs: number[] = [];
  const randomSex: number[] = [];
  const randomWings: number[] = [];

  for (let i = 0; i < 20; i++) {
    randomNames.push(generateRandomString(15));
    randomLegs.push(Math.floor(Math.random() * 5));
    randomSex.push(Math.floor(Math.random() * 2));
    randomWings.push(Math.floor(Math.random() * 2));
  }

  console.log(randomNames);
  console.log(randomLegs);
  console.log(randomSex);
  console.log(randomWings);

  await evaluator.setRandomValuesStore(
    randomNames,
    randomLegs,
    randomSex,
    randomWings
  );

  await evaluator2.setRandomValuesStore(
    randomNames,
    randomLegs,
    randomSex,
    randomWings
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
