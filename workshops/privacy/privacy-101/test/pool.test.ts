// Exercises EvaluatorPool and the reference MiniPool with a mock verifier:
// a "proof" is the hash of its public inputs. This covers everything except
// the zero-knowledge circuit itself, which is tested in pool-zk.test.ts.
import { expect } from "chai";
import { ethers } from "hardhat";
import { POSEIDON_T3 } from "../scripts/lib/deploy";
import { createNote, merklePath, toBytes32, zeroHashes, LEVELS } from "../scripts/lib/pool";
import { deployLocalWorkshop, ONE_POINT } from "./helpers";

const mockProof = (publicInputs: string[]) => ethers.keccak256(ethers.concat(publicInputs));
const field = (value: string | bigint) => ethers.zeroPadValue(ethers.toBeHex(value), 32);

describe("Part 8: EvaluatorPool (mock verifier)", function () {
  async function fixture() {
    const [, student, other] = await ethers.getSigners();
    const workshop = await deployLocalWorkshop();
    const verifier = await (await ethers.getContractFactory("MockVerifier")).deploy();
    const solution = await (
      await ethers.getContractFactory("MiniPoolSolution", { libraries: { [POSEIDON_T3]: workshop.poseidonT3 } })
    )
      .connect(student)
      .deploy(verifier.target, verifier.target, workshop.pool.target);

    const evaluator = workshop.pool.connect(student);
    const denomination = await workshop.pool.DENOMINATION();
    const recipient = await workshop.pool.recipientOf(student.address);
    const leaves: bigint[] = [];

    const deposit = async () => {
      const note = createNote();
      await evaluator.ex3_deposit(toBytes32(note.commitment), { value: denomination });
      leaves.push(note.commitment);
      return { note, index: leaves.length - 1 };
    };
    const prove = (root: bigint, nullifierHash: bigint, relayer = ethers.ZeroAddress, fee = 0n) =>
      mockProof([toBytes32(root), toBytes32(nullifierHash), field(recipient), field(relayer), field(fee)]);

    return { student, other, solution, evaluator, denomination, recipient, leaves, deposit, prove, ...workshop };
  }

  it("the on-chain tree matches the off-chain tree", async function () {
    const { solution, evaluator, deposit, leaves } = await fixture();
    expect(await solution.currentRoot()).to.equal(toBytes32(zeroHashes()[LEVELS]));
    await evaluator.submitPool(solution.target);
    for (let i = 0; i < 3; i++) {
      await deposit();
      expect(await solution.currentRoot()).to.equal(toBytes32(merklePath(leaves, i).root));
    }
  });

  it("full student journey earns 12 points, plus 3 for the bonus", async function () {
    const f = await fixture();
    const { student, td, pool, solution, evaluator, denomination, recipient, leaves, deposit, prove } = f;

    // Step 2
    await evaluator.submitPool(solution.target);
    expect(await td.balanceOf(student.address)).to.equal(1n * ONE_POINT);

    // Step 3
    const first = await deposit();
    expect(await td.balanceOf(student.address)).to.equal(3n * ONE_POINT);

    // Step 4
    let root = merklePath(leaves, first.index).root;
    const recipientBefore = await ethers.provider.getBalance(recipient);
    await evaluator.ex4_withdraw(prove(root, first.note.nullifierHash), toBytes32(root), toBytes32(first.note.nullifierHash));
    expect(await ethers.provider.getBalance(recipient)).to.equal(recipientBefore + denomination);
    expect(await td.balanceOf(student.address)).to.equal(7n * ONE_POINT);

    // Step 5
    const second = await deposit();
    root = merklePath(leaves, second.index).root;
    await evaluator.ex5_unknownRoot(prove(root, second.note.nullifierHash), toBytes32(second.note.nullifierHash));
    expect(await solution.isSpent(toBytes32(second.note.nullifierHash))).to.equal(false);

    // Step 6: the proof is made before another deposit changes the root.
    const staleProof = prove(root, second.note.nullifierHash);
    await expect(
      evaluator.ex6_staleRoot(staleProof, toBytes32(root), toBytes32(second.note.nullifierHash)),
    ).to.be.revertedWith("root must not be the current root");
    const third = await deposit();
    await evaluator.ex6_staleRoot(staleProof, toBytes32(root), toBytes32(second.note.nullifierHash));

    // Step 7
    const fee = await pool.RELAYER_FEE();
    root = merklePath(leaves, third.index).root;
    await evaluator.ex7_relay(
      prove(root, third.note.nullifierHash, pool.target as string, fee),
      toBytes32(root),
      toBytes32(third.note.nullifierHash),
    );
    expect(await ethers.provider.getBalance(pool.target)).to.equal(fee);
    expect(await td.balanceOf(student.address)).to.equal(12n * ONE_POINT);

    // Bonus
    const fourth = await deposit();
    await evaluator.requestApproval(toBytes32(fourth.note.commitment));
    const associationRoot = merklePath([fourth.note.commitment], 0).root;
    expect(await pool.associationRoot()).to.equal(toBytes32(associationRoot));
    root = merklePath(leaves, fourth.index).root;
    const bonusProof = mockProof([
      toBytes32(root),
      toBytes32(associationRoot),
      toBytes32(fourth.note.nullifierHash),
      field(recipient),
      field(0n),
      field(0n),
    ]);
    await evaluator.bonus_association(
      bonusProof,
      toBytes32(root),
      toBytes32(associationRoot),
      toBytes32(fourth.note.nullifierHash),
    );
    expect(await td.balanceOf(student.address)).to.equal(15n * ONE_POINT);
    expect(await ethers.provider.getBalance(solution.target)).to.equal(0n);
  });

  it("a proof made for another student's recipient is rejected", async function () {
    const { other, pool, solution, evaluator, leaves, deposit } = await fixture();
    await evaluator.submitPool(solution.target);
    const { note, index } = await deposit();
    const root = merklePath(leaves, index).root;
    const foreignRecipient = await pool.recipientOf(other.address);
    const proof = mockProof([
      toBytes32(root),
      toBytes32(note.nullifierHash),
      field(foreignRecipient),
      field(0n),
      field(0n),
    ]);
    await expect(evaluator.ex4_withdraw(proof, toBytes32(root), toBytes32(note.nullifierHash))).to.be.reverted;
  });

  it("registration checks the pool parameters and pairs it once", async function () {
    const { other, pool, solution, evaluator } = await fixture();
    await expect(pool.connect(other).ex3_deposit(ethers.ZeroHash)).to.be.revertedWith("no pool submitted");
    await evaluator.submitPool(solution.target);
    await expect(pool.connect(other).submitPool(solution.target)).to.be.revertedWith("pool already paired");
    await expect(evaluator.ex3_deposit(ethers.ZeroHash, { value: 1n })).to.be.revertedWith(
      "send exactly the denomination",
    );
  });

  it("teachers can collect the relayer fees", async function () {
    const { student, pool } = await fixture();
    await expect(pool.connect(student).withdrawFees(student.address)).to.be.revertedWith("Not a teacher");
    await pool.withdrawFees(student.address);
  });
});
