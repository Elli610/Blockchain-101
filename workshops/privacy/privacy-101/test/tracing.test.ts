// Seeds the Part 1 scenarios on the local network, then solves them the way
// a student would (from public chain data only) and submits the answers.
import { expect } from "chai";
import { ethers } from "hardhat";
import type { TransactionResponse } from "ethers";
import { seedScenarioSet } from "../scripts/lib/tracing";
import { deployLocalWorkshop, ONE_POINT } from "./helpers";

async function allTransactions(): Promise<TransactionResponse[]> {
  const transactions: TransactionResponse[] = [];
  const latest = await ethers.provider.getBlockNumber();
  for (let number = 0; number <= latest; number++) {
    const block = await ethers.provider.getBlock(number, true);
    transactions.push(...block!.prefetchedTransactions);
  }
  return transactions;
}

describe("Part 1: EvaluatorTracing", function () {
  async function fixture() {
    const [operator, student] = await ethers.getSigners();
    const workshop = await deployLocalWorkshop();
    const contracts = {
      evaluator: workshop.tracing as any,
      naiveMixer: workshop.naiveMixer as any,
      timingMixer: workshop.timingMixer as any,
      crowdMixer: workshop.crowdMixer as any,
    };
    const seeded = [];
    for (let setId = 0; setId < 2; setId++) {
      seeded.push(await seedScenarioSet(operator, contracts, setId, ethers.parseEther("0.01")));
    }
    return { operator, student, seeded, ...workshop };
  }

  it("scenarios are solvable from chain data and earn 8 points", async function () {
    const { student, seeded, td, tracing, naiveMixer, timingMixer, crowdMixer } = await fixture();
    const evaluator = tracing.connect(student);
    const set = seeded[Number(await tracing.setOf(student.address))];
    const transactions = await allTransactions();

    // Exercise 1: who funded the burner?
    const burner = ethers.getAddress(ethers.dataSlice(await tracing.getChallenge(1, student.address), 12));
    const owner = transactions.find((tx) => tx.to === burner)!.from;
    expect(owner).to.equal(set.answers[0]);
    await evaluator.ex1_fundingLink(owner);

    // Exercise 2: which deposit has the amount of this withdrawal?
    const receipt2 = await ethers.provider.getTransactionReceipt(await tracing.getChallenge(2, student.address));
    const amount = naiveMixer.interface.parseLog(receipt2!.logs[0])!.args.amount;
    const deposits2 = await naiveMixer.queryFilter(naiveMixer.filters.Deposit());
    const depositor2 = deposits2.filter((d) => d.args.amount === amount).map((d) => d.args.from);
    expect(depositor2).to.deep.equal([set.answers[1]]);
    await evaluator.ex2_amountFingerprint(depositor2[0]);

    // Exercise 3: the only deposit still unspent before this withdrawal.
    const receipt3 = await ethers.provider.getTransactionReceipt(await tracing.getChallenge(3, student.address));
    const deposits3 = await timingMixer.queryFilter(timingMixer.filters.Deposit(), 0, receipt3!.blockNumber);
    const withdrawals3 = await timingMixer.queryFilter(timingMixer.filters.Withdrawal(), 0, receipt3!.blockNumber - 1);
    expect(deposits3.length - withdrawals3.length).to.equal(1);
    const depositor3 = deposits3[deposits3.length - 1].args.from;
    expect(depositor3).to.equal(set.answers[2]);
    await evaluator.ex3_timing(depositor3);

    // Exercise 4: who sent gas money to the recipient?
    const receipt4 = await ethers.provider.getTransactionReceipt(await tracing.getChallenge(4, student.address));
    const recipient4 = crowdMixer.interface.parseLog(receipt4!.logs[0])!.args.to;
    const funder = transactions.find((tx) => tx.to === recipient4 && tx.blockNumber! < receipt4!.blockNumber)!.from;
    expect(funder).to.equal(set.answers[3]);
    await evaluator.ex4_gasFunder(funder);

    // Exercise 5: where do several recipients send their funds?
    const receipt5 = await ethers.provider.getTransactionReceipt(await tracing.getChallenge(5, student.address));
    const recipients5 = receipt5!.logs.map((log) => crowdMixer.interface.parseLog(log)!.args.to);
    expect(recipients5).to.have.length(5);
    const destinations = new Map<string, number>();
    for (const tx of transactions.filter((tx) => recipients5.includes(tx.from))) {
      destinations.set(tx.to!, (destinations.get(tx.to!) ?? 0) + 1);
    }
    const [consolidation, count] = [...destinations.entries()].sort((a, b) => b[1] - a[1])[0];
    expect(count).to.equal(3);
    expect(consolidation).to.equal(set.answers[4]);
    await evaluator.ex5_cluster(consolidation);

    expect(await td.balanceOf(student.address)).to.equal(8n * ONE_POINT);
  });

  it("the crowd and timing mixers are empty after seeding", async function () {
    const { timingMixer, crowdMixer } = await fixture();
    expect(await ethers.provider.getBalance(timingMixer.target)).to.equal(0n);
    expect(await ethers.provider.getBalance(crowdMixer.target)).to.equal(0n);
  });

  it("wrong answers consume attempts and never revert", async function () {
    const { student, td, tracing } = await fixture();
    const evaluator = tracing.connect(student);
    for (let attempt = 1; attempt <= 3; attempt++) {
      await expect(evaluator.ex1_fundingLink(student.address))
        .to.emit(tracing, "WrongAnswer")
        .withArgs(student.address, 1, 3 - attempt);
    }
    await expect(evaluator.ex1_fundingLink(student.address)).to.be.revertedWith("no attempts left");
    expect(await td.balanceOf(student.address)).to.equal(0n);
  });

  it("an exercise cannot be validated twice and scenarios are teacher-only", async function () {
    const { student, seeded, tracing } = await fixture();
    const set = seeded[Number(await tracing.setOf(student.address))];
    await tracing.connect(student).ex1_fundingLink(set.answers[0]);
    await expect(tracing.connect(student).ex1_fundingLink(set.answers[0])).to.be.revertedWith("already validated");

    const empty = Array(5).fill(ethers.ZeroHash) as [string, string, string, string, string];
    await expect(tracing.connect(student).setScenarioSet(0, empty, empty)).to.be.revertedWith("Not a teacher");
    await expect(tracing.setScenarioSet(5, empty, empty)).to.be.revertedWith("sets must be contiguous");
  });
});
