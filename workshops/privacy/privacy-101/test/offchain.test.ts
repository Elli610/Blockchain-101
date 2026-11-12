import { expect } from "chai";
import { ethers } from "hardhat";
import { deployLocalWorkshop, ONE_POINT } from "./helpers";

describe("Parts 2 and 3: EvaluatorOffchain", function () {
  const TXID = "ab".repeat(32);

  async function fixture() {
    const [grader, student, other] = await ethers.getSigners();
    const { td, offchain } = await deployLocalWorkshop();
    return { grader, student, other, td, offchain };
  }

  it("records a Monero proof and credits 5 points once the grader approves", async function () {
    const { student, td, offchain } = await fixture();
    await expect(offchain.connect(student).ex_moneroProof(TXID, "OutProofV2abc"))
      .to.emit(offchain, "MoneroProofSubmitted")
      .withArgs(student.address, TXID, "OutProofV2abc");

    await offchain.gradeMonero(student.address);
    expect(await td.balanceOf(student.address)).to.equal(5n * ONE_POINT);
  });

  it("rejects malformed submissions, missing submissions and reused transactions", async function () {
    const { student, other, td, offchain } = await fixture();
    await expect(offchain.connect(student).ex_moneroProof("abc", "proof")).to.be.revertedWith(
      "txid must be 64 hex characters",
    );
    await expect(offchain.gradeMonero(student.address)).to.be.revertedWith("no submission");

    await offchain.connect(student).ex_moneroProof(TXID, "proof");
    await offchain.connect(other).ex_moneroProof(TXID, "proof");
    await offchain.gradeMonero(student.address);
    await expect(offchain.gradeMonero(other.address)).to.be.revertedWith("transaction already credited");
    expect(await td.balanceOf(other.address)).to.equal(0n);
  });

  it("credits 4 points per Zcash memo, once per transaction", async function () {
    const { student, other, td, offchain } = await fixture();
    await offchain.gradeZcash(student.address, TXID);
    expect(await td.balanceOf(student.address)).to.equal(4n * ONE_POINT);
    await expect(offchain.gradeZcash(other.address, TXID)).to.be.revertedWith("transaction already credited");
  });

  it("only teachers can grade", async function () {
    const { student, offchain } = await fixture();
    await expect(offchain.connect(student).gradeZcash(student.address, TXID)).to.be.revertedWith("Not a teacher");
    await expect(offchain.connect(student).gradeMonero(student.address)).to.be.revertedWith("Not a teacher");
  });
});
