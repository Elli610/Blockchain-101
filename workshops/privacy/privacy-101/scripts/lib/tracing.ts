// Seeds the on-chain scenarios of Part 1 and registers them in
// EvaluatorTracing. Every "user" is a throwaway wallet funded by the operator.
import { ethers } from "ethers";

export interface TracingContracts {
  evaluator: ethers.Contract;
  naiveMixer: ethers.Contract;
  timingMixer: ethers.Contract;
  crowdMixer: ethers.Contract;
}

export interface SeededSet {
  setId: number;
  challenges: string[];
  answers: string[];
}

function shuffle<T>(items: T[]): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/// Seeds one scenario set. `operator` must be the operator of the three
/// mixers and a teacher of the Evaluator. `gasStipend` is what each throwaway
/// wallet receives to pay for its own transactions.
export async function seedScenarioSet(
  operator: ethers.Signer,
  contracts: TracingContracts,
  setId: number,
  gasStipend: bigint,
  log: (message: string) => void = () => {},
): Promise<SeededSet> {
  const provider = operator.provider!;
  const { evaluator, naiveMixer, timingMixer, crowdMixer } = contracts;
  const denomination: bigint = await timingMixer.denomination();

  const send = async (signer: ethers.Signer, to: string, value: bigint) =>
    (await (await signer.sendTransaction({ to, value })).wait())!;
  const wait = async (tx: Promise<ethers.ContractTransactionResponse>) => (await (await tx).wait())!;

  const newUser = async (budget: bigint) => {
    const wallet = ethers.Wallet.createRandom().connect(provider);
    await send(operator, wallet.address, budget + gasStipend);
    return wallet;
  };
  const freshAddress = () => ethers.Wallet.createRandom().address;
  const mixer = (contract: ethers.Contract, signer: ethers.Signer) => contract.connect(signer) as ethers.Contract;

  // --- Exercise 1: follow the gas -----------------------------------------
  log(`set ${setId}: exercise 1`);
  const donation = gasStipend / 10n;
  const owner = await newUser(donation + gasStipend);
  const burner = ethers.Wallet.createRandom().connect(provider);
  await send(owner, burner.address, donation + gasStipend);
  await send(burner, freshAddress(), donation);

  // --- Exercise 2: amount fingerprint -------------------------------------
  log(`set ${setId}: exercise 2`);
  const naiveDeposits: { user: ethers.Wallet | ethers.HDNodeWallet; amount: bigint }[] = [];
  for (let i = 0; i < 4; i++) {
    // Distinct, unusual amounts between 1 and 2 denominations.
    const amount = denomination + BigInt(1 + Math.floor(Math.random() * 999_999)) * 1_000_000_000n;
    const user = await newUser(amount);
    await wait(mixer(naiveMixer, user).deposit({ value: amount }));
    naiveDeposits.push({ user, amount });
  }
  const naiveTarget = naiveDeposits[1 + Math.floor(Math.random() * 3)];
  let naiveChallenge = "";
  for (const deposit of shuffle(naiveDeposits)) {
    const receipt = await wait(mixer(naiveMixer, operator).withdraw(freshAddress(), deposit.amount));
    if (deposit === naiveTarget) naiveChallenge = receipt.hash;
  }

  // --- Exercise 3: timing correlation -------------------------------------
  // The timing mixer is empty between scenarios, so the last deposit before
  // the challenge withdrawal is the only candidate.
  log(`set ${setId}: exercise 3`);
  for (let i = 0; i < 2; i++) {
    const user = await newUser(denomination);
    await wait(mixer(timingMixer, user).deposit({ value: denomination }));
  }
  for (let i = 0; i < 2; i++) await wait(mixer(timingMixer, operator).withdraw(freshAddress()));
  const timingTarget = await newUser(denomination);
  await wait(mixer(timingMixer, timingTarget).deposit({ value: denomination }));
  const timingChallenge = (await wait(mixer(timingMixer, operator).withdraw(freshAddress()))).hash;

  // --- Exercise 4: the recipient pays for its own gas ---------------------
  // Several deposits are pending, but the depositor pre-funds the recipient.
  log(`set ${setId}: exercise 4`);
  const crowd: (ethers.Wallet | ethers.HDNodeWallet)[] = [];
  for (let i = 0; i < 6; i++) {
    const user = await newUser(denomination + gasStipend);
    await wait(mixer(crowdMixer, user).deposit({ value: denomination }));
    crowd.push(user);
  }
  const gasTarget = crowd[1 + Math.floor(Math.random() * 4)];
  const gasRecipient = freshAddress();
  await send(gasTarget, gasRecipient, gasStipend / 2n);
  const gasChallenge = (await wait(mixer(crowdMixer, operator).withdraw(gasRecipient))).hash;

  // --- Exercise 5: clustering ---------------------------------------------
  // Five payouts in one transaction; three recipients forward to the same
  // address. This also empties the crowd mixer.
  log(`set ${setId}: exercise 5`);
  const recipients = Array.from({ length: 5 }, () => ethers.Wallet.createRandom().connect(provider));
  const clusterChallenge = (
    await wait(mixer(crowdMixer, operator).withdrawBatch(recipients.map((r) => r.address)))
  ).hash;
  const consolidation = freshAddress();
  const clustered = new Set(shuffle([0, 1, 2, 3, 4]).slice(0, 3));
  for (let i = 0; i < recipients.length; i++) {
    // Recipients pay their gas out of the payout itself.
    await send(recipients[i], clustered.has(i) ? consolidation : freshAddress(), denomination / 2n);
  }

  // --- Register -----------------------------------------------------------
  const challenges = [
    ethers.zeroPadValue(burner.address, 32),
    naiveChallenge,
    timingChallenge,
    gasChallenge,
    clusterChallenge,
  ];
  const answers = [owner.address, naiveTarget.user.address, timingTarget.address, gasTarget.address, consolidation];
  const answerHashes = await Promise.all(answers.map((answer, i) => evaluator.hashAnswer(setId, i + 1, answer)));
  await wait(mixer(evaluator, operator).setScenarioSet(setId, challenges, answerHashes));
  log(`set ${setId}: registered`);

  return { setId, challenges, answers };
}
