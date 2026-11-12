// Exercises EvaluatorVoting against a local Semaphore deployment and the
// reference Voting contract, with real Semaphore proofs. Generating a proof
// downloads the Semaphore circuit artifacts on first use.
import { expect } from "chai";
import { ethers } from "hardhat";
import { Group, Identity, generateProof } from "@semaphore-protocol/core";
import { deployLocalWorkshop, ONE_POINT } from "./helpers";

describe("Part 6: EvaluatorVoting", function () {
  const BALLOT_ID = 42n;

  async function fixture() {
    const [, student, other] = await ethers.getSigners();
    const workshop = await deployLocalWorkshop();
    const solution = await (await ethers.getContractFactory("VotingSolution"))
      .connect(student)
      .deploy(workshop.semaphore.target, BALLOT_ID);
    const identities = [new Identity(), new Identity(), new Identity()];
    return { student, other, solution, identities, ...workshop };
  }

  it("full student journey earns 6 points", async function () {
    const { student, td, voting, solution, identities } = await fixture();
    const evaluator = voting.connect(student);

    // Exercise 1
    await evaluator.submitVoting(solution.target);
    expect(await td.balanceOf(student.address)).to.equal(1n * ONE_POINT);

    // Exercise 2
    await expect(evaluator.ex2_members()).to.be.revertedWith("not enough members");
    const group = new Group();
    for (const identity of identities) {
      await solution.join(identity.commitment);
      group.addMember(identity.commitment);
    }
    await evaluator.ex2_members();

    // Exercise 3
    const vote = await generateProof(identities[0], group, 1, BALLOT_ID);
    await evaluator.ex3_vote(vote);
    expect(await solution.tally(1)).to.equal(1n);

    // Exercise 4: same identity, other option.
    const otherIdentityVote = await generateProof(identities[1], group, 0, BALLOT_ID);
    await expect(evaluator.ex4_doubleVote(otherIdentityVote)).to.be.revertedWith(
      "use the identity that voted in ex3",
    );
    const doubleVote = await generateProof(identities[0], group, 0, BALLOT_ID);
    await evaluator.ex4_doubleVote(doubleVote);
    expect(await solution.tally(0)).to.equal(0n);

    // Exercise 5: valid proof for another ballot.
    const wrongBallot = await generateProof(identities[2], group, 1, BALLOT_ID + 1n);
    await evaluator.ex5_wrongScope(wrongBallot);
    expect(await solution.tally(1)).to.equal(1n);

    expect(await td.balanceOf(student.address)).to.equal(6n * ONE_POINT);
  });

  it("a Voting contract can be paired with one student only", async function () {
    const { student, other, voting, solution } = await fixture();
    await voting.connect(student).submitVoting(solution.target);
    await expect(voting.connect(other).submitVoting(solution.target)).to.be.revertedWith("contract already paired");
    await expect(voting.connect(other).ex2_members()).to.be.revertedWith("no Voting contract submitted");
  });

  it("exercise 3 rejects a proof made for another ballot", async function () {
    const { student, voting, solution, identities } = await fixture();
    const evaluator = voting.connect(student);
    await evaluator.submitVoting(solution.target);
    const group = new Group();
    for (const identity of identities) {
      await solution.join(identity.commitment);
      group.addMember(identity.commitment);
    }
    await evaluator.ex2_members();
    const proof = await generateProof(identities[0], group, 1, BALLOT_ID + 1n);
    await expect(evaluator.ex3_vote(proof)).to.be.revertedWith("scope must be the ballot id");
  });
});
