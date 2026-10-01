// Lightweight sanity tests. The full flow requires a student solution
// (custom proxies), which is graded on Sepolia. Here we only verify that
// the marks token, Evaluator constructor, and submitExercise wiring behave
// correctly.
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Evaluator wiring", function () {
  async function fixture() {
    const [deployer, student] = await ethers.getSigners();
    const TD = await ethers.getContractFactory("TDERC20_PROXY");
    const td = await TD.deploy("TD-Proxy-101", "TD-PROXY-101", 0);
    await td.waitForDeployment();

    const Evaluator = await ethers.getContractFactory("Evaluator");
    const evaluator = await Evaluator.deploy(td.target);
    await evaluator.waitForDeployment();
    await td.setTeacher(evaluator.target, true);

    return { deployer, student, td, evaluator };
  }

  it("mark token is non-transferable", async function () {
    const { td, deployer, student } = await fixture();
    await td.distributeTokens(deployer.address, 5);
    expect(await td.balanceOf(deployer.address)).to.equal(5n * 10n ** 18n);
    // transfer must silently fail (returns false, emits DenyTransfer)
    await td.transfer(student.address, 1n);
    expect(await td.balanceOf(student.address)).to.equal(0n);
  });

  it("submitExercise grants 2 setup points and rejects re-pairing", async function () {
    const { td, evaluator, student } = await fixture();

    // The Evaluator only checks the facade address has been paired; it does
    // not inspect the facade's interface until later exercises. Any deployed
    // contract works as a stand-in for this wiring test.
    const Any = await ethers.getContractFactory("TDERC20_PROXY");
    const dummy = await Any.deploy("x", "x", 0);
    await dummy.waitForDeployment();

    await evaluator.connect(student).submitExercise(dummy.target);
    expect(await td.balanceOf(student.address)).to.equal(2n * 10n ** 18n);

    const [, , third] = await ethers.getSigners();
    await expect(
      evaluator.connect(third).submitExercise(dummy.target)
    ).to.be.revertedWith("Solution already paired");
  });

  it("exercises revert cleanly when no solution submitted", async function () {
    const { evaluator, student } = await fixture();
    await expect(evaluator.connect(student).ex1_deployLogicMinimal())
      .to.be.revertedWith("No solution submitted");
  });
});
