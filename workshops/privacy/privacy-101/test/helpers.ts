import { ethers } from "hardhat";
import { deployPoseidonT3, deployWorkshop, POSEIDON_T3 } from "../scripts/lib/deploy";

export const ONE_POINT = 10n ** 18n;

/// Deploys local copies of the third-party contracts (Semaphore, ERC-6538
/// registry, ERC-5564 announcer) and then the whole workshop.
export async function deployLocalWorkshop() {
  const poseidon = await deployPoseidonT3();

  const verifier = await (await ethers.getContractFactory("SemaphoreVerifier")).deploy();
  const semaphore = await (
    await ethers.getContractFactory("Semaphore", { libraries: { [POSEIDON_T3]: poseidon.target } })
  ).deploy(verifier.target);
  const registry = await (await ethers.getContractFactory("ERC6538RegistryMock")).deploy();
  const announcer = await (await ethers.getContractFactory("ERC5564AnnouncerMock")).deploy();

  const workshop = await deployWorkshop(
    { registry: registry.target as string, semaphore: semaphore.target as string },
    poseidon.target as string,
  );
  return { ...workshop, semaphore, registry, announcer };
}
