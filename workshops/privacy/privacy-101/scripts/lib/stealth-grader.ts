// Logic of the Part 5 grader bot, shared by scripts/grader-stealth.ts and
// the test-suite.
import { ethers } from "ethers";
import { SCHEME_ID, generateStealthAddress, recoverStealthPrivateKey } from "./stealth";

export interface StealthContracts {
  evaluator: ethers.Contract;
  registry: ethers.Contract;
  announcer: ethers.Contract;
}

/// Exercise 2: pays a stealth address for every student who requested it and
/// records its hash in the Evaluator. Returns the students that were paid.
export async function payRequestedStealthAddresses(
  grader: ethers.Signer,
  { evaluator, registry, announcer }: StealthContracts,
  amount: bigint,
  fromBlock = 0,
): Promise<string[]> {
  const paid: string[] = [];
  const requests = await evaluator.queryFilter(evaluator.filters.PaymentRequested(), fromBlock);
  for (const request of requests) {
    const student: string = (request as ethers.EventLog).args.student;
    if (paid.includes(student)) continue;
    if ((await evaluator.stealthAddressHash(student)) !== ethers.ZeroHash) continue;

    const metaAddress: string = await registry.stealthMetaAddressOf(student, SCHEME_ID);
    const payment = generateStealthAddress(metaAddress);

    await (await grader.sendTransaction({ to: payment.stealthAddress, value: amount })).wait();
    await (
      await (announcer.connect(grader) as ethers.Contract).announce(
        SCHEME_ID,
        payment.stealthAddress,
        payment.ephemeralPublicKey,
        payment.viewTag,
      )
    ).wait();
    const hash = ethers.keccak256(ethers.solidityPacked(["address"], [payment.stealthAddress]));
    await (await (evaluator.connect(grader) as ethers.Contract).setStealthAddressHash(student, hash)).wait();
    paid.push(student);
  }
  return paid;
}

/// Exercise 3: scans announcements with the instructor's keys and credits the
/// student named in the metadata of each payment that derives correctly and
/// holds at least `minAmount`. Returns the students that were credited.
export async function gradeStealthPayments(
  grader: ethers.Signer,
  { evaluator, announcer }: StealthContracts,
  keys: { spendingPrivateKey: string; viewingPrivateKey: string },
  minAmount: bigint,
  fromBlock = 0,
): Promise<string[]> {
  const credited: string[] = [];
  // A stealth address counts once, for whoever announced it first.
  const seen = new Set<string>();
  const announcements = await announcer.queryFilter(announcer.filters.Announcement(SCHEME_ID), fromBlock);
  for (const announcement of announcements) {
    const { stealthAddress, ephemeralPubKey, metadata } = (announcement as ethers.EventLog).args;
    // Expected metadata: 1 byte view tag followed by the 20-byte student address.
    if (ethers.dataLength(metadata) < 21 || seen.has(stealthAddress)) continue;

    const stealthKey = recoverStealthPrivateKey(
      keys.spendingPrivateKey,
      keys.viewingPrivateKey,
      ephemeralPubKey,
      ethers.dataSlice(metadata, 0, 1),
      stealthAddress,
    );
    if (stealthKey === null) continue;
    seen.add(stealthAddress);

    if ((await grader.provider!.getBalance(stealthAddress)) < minAmount) continue;
    const student = ethers.getAddress(ethers.dataSlice(metadata, 1, 21));
    if (await evaluator.exerciseProgression(student, 3)) continue;

    await (await (evaluator.connect(grader) as ethers.Contract).gradeSend(student)).wait();
    credited.push(student);
  }
  return credited;
}
