// End-to-end test of Part 8 with real zero-knowledge proofs: the reference
// circuits are compiled, their Solidity verifiers are generated and deployed,
// and the whole EvaluatorPool journey is replayed with Barretenberg proofs.
//
// Compiling fetches the Noir poseidon library from GitHub on first use.
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import hre, { ethers } from "hardhat";
import { POSEIDON_T3, deployHonkVerifier } from "../scripts/lib/deploy";
import { compileCircuit, Prover } from "../scripts/lib/noir";
import { Note, createNote, fetchCommitments, merklePath, toBytes32, withdrawalInputs } from "../scripts/lib/pool";
import { deployLocalWorkshop, ONE_POINT } from "./helpers";

const GENERATED = path.join(__dirname, "..", "reference", "contracts", "generated");
const CIRCUITS = path.join(__dirname, "..", "reference", "circuits");

describe("Part 8: EvaluatorPool (real proofs)", function () {
  let prover: Prover;
  let associationProver: Prover;

  before(async function () {
    prover = await Prover.create(await compileCircuit(path.join(CIRCUITS, "minipool")));
    associationProver = await Prover.create(await compileCircuit(path.join(CIRCUITS, "minipool_association")));

    fs.mkdirSync(GENERATED, { recursive: true });
    fs.writeFileSync(path.join(GENERATED, "MiniPoolVerifier.sol"), await prover.solidityVerifier());
    fs.writeFileSync(path.join(GENERATED, "AssociationVerifier.sol"), await associationProver.solidityVerifier());
    await hre.run("compile", { quiet: true });
  });

  after(async function () {
    await prover?.destroy();
    await associationProver?.destroy();
  });

  async function fixture() {
    const [, student] = await ethers.getSigners();
    const workshop = await deployLocalWorkshop();
    const verifier = await deployHonkVerifier("reference/contracts/generated/MiniPoolVerifier.sol");
    const associationVerifier = await deployHonkVerifier("reference/contracts/generated/AssociationVerifier.sol");
    const solution = await (
      await ethers.getContractFactory("MiniPoolSolution", { libraries: { [POSEIDON_T3]: workshop.poseidonT3 } })
    )
      .connect(student)
      .deploy(verifier.target, associationVerifier.target, workshop.pool.target);
    return { student, verifier, solution, ...workshop };
  }

  it("the generated verifiers fit in a deployable contract", async function () {
    const { verifier } = await fixture();
    const size = ethers.dataLength(await ethers.provider.getCode(verifier.target));
    expect(size).to.be.lessThanOrEqual(24576);
  });

  it("full student journey with zero-knowledge proofs earns 15 points", async function () {
    const { student, td, pool, solution } = await fixture();
    const evaluator = pool.connect(student);
    const denomination = await pool.DENOMINATION();
    const fee = await pool.RELAYER_FEE();
    const recipient = await pool.recipientOf(student.address);
    const leaves: bigint[] = [];

    const deposit = async () => {
      const note = createNote();
      await evaluator.ex3_deposit(toBytes32(note.commitment), { value: denomination });
      leaves.push(note.commitment);
      return { note, index: leaves.length - 1 };
    };
    const prove = async (note: Note, index: number, relayer = ethers.ZeroAddress, relayerFee = 0n) => {
      const merkle = merklePath(leaves, index);
      const { proof } = await prover.prove(withdrawalInputs(note, merkle, recipient, relayer, relayerFee));
      return { proof, root: toBytes32(merkle.root), nullifierHash: toBytes32(note.nullifierHash) };
    };

    await evaluator.submitPool(solution.target);

    // Steps 3 and 4
    const first = await deposit();
    expect(await solution.currentRoot()).to.equal(toBytes32(merklePath(leaves, 0).root));
    const w1 = await prove(first.note, first.index);
    const recipientBefore = await ethers.provider.getBalance(recipient);
    await evaluator.ex4_withdraw(w1.proof, w1.root, w1.nullifierHash);
    expect(await ethers.provider.getBalance(recipient)).to.equal(recipientBefore + denomination);

    // Steps 5 and 6
    const second = await deposit();
    const w2 = await prove(second.note, second.index);
    await evaluator.ex5_unknownRoot(w2.proof, w2.nullifierHash);
    const third = await deposit();
    await evaluator.ex6_staleRoot(w2.proof, w2.root, w2.nullifierHash);

    // Step 7
    const w3 = await prove(third.note, third.index, pool.target as string, fee);
    await evaluator.ex7_relay(w3.proof, w3.root, w3.nullifierHash);
    expect(await td.balanceOf(student.address)).to.equal(12n * ONE_POINT);

    // Bonus
    const fourth = await deposit();
    await evaluator.requestApproval(toBytes32(fourth.note.commitment));
    const merkle = merklePath(leaves, fourth.index);
    const association = merklePath([fourth.note.commitment], 0);
    const bonus = await associationProver.prove({
      ...withdrawalInputs(fourth.note, merkle, recipient, ethers.ZeroAddress, 0n),
      association_siblings: association.siblings.map((s) => s.toString()),
      association_index: association.index.toString(),
      association_root: association.root.toString(),
    });
    await evaluator.bonus_association(
      bonus.proof,
      toBytes32(merkle.root),
      toBytes32(association.root),
      toBytes32(fourth.note.nullifierHash),
    );
    expect(await td.balanceOf(student.address)).to.equal(15n * ONE_POINT);

    // The tree can be rebuilt from the Deposit events alone.
    expect(await fetchCommitments(solution as any)).to.deep.equal(leaves);
  });

  it("a proof cannot be produced for a note that is not in the tree", async function () {
    const note = createNote();
    const merkle = merklePath([createNote().commitment], 0);
    let failed = false;
    try {
      await prover.prove(withdrawalInputs(note, merkle, ethers.ZeroAddress, ethers.ZeroAddress, 0n));
    } catch {
      failed = true;
    }
    expect(failed).to.equal(true);
  });
});
