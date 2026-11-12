import { expect } from "chai";
import { ethers } from "hardhat";
import {
  SCHEME_ID,
  generateStealthAddress,
  generateStealthKeys,
  recoverStealthPrivateKey,
} from "../scripts/lib/stealth";
import { gradeStealthPayments, payRequestedStealthAddresses } from "../scripts/lib/stealth-grader";
import { deployLocalWorkshop, ONE_POINT } from "./helpers";

describe("Part 5: stealth addresses", function () {
  describe("derivation library", function () {
    it("the recipient recovers the key of the address derived by the sender", function () {
      const keys = generateStealthKeys();
      expect(ethers.dataLength(keys.metaAddress)).to.equal(66);

      const payment = generateStealthAddress(keys.metaAddress);
      const stealthKey = recoverStealthPrivateKey(
        keys.spendingPrivateKey,
        keys.viewingPrivateKey,
        payment.ephemeralPublicKey,
        payment.viewTag,
        payment.stealthAddress,
      );
      expect(stealthKey).to.not.equal(null);
      expect(ethers.computeAddress(stealthKey!)).to.equal(payment.stealthAddress);
    });

    it("two payments to the same meta-address are unlinkable addresses", function () {
      const keys = generateStealthKeys();
      const first = generateStealthAddress(keys.metaAddress);
      const second = generateStealthAddress(keys.metaAddress);
      expect(first.stealthAddress).to.not.equal(second.stealthAddress);
    });

    it("another recipient, a wrong view tag or a garbage ephemeral key are ignored", function () {
      const keys = generateStealthKeys();
      const stranger = generateStealthKeys();
      const payment = generateStealthAddress(keys.metaAddress);
      const recover = (k: typeof keys, ephemeral: string, tag: string) =>
        recoverStealthPrivateKey(k.spendingPrivateKey, k.viewingPrivateKey, ephemeral, tag, payment.stealthAddress);

      expect(recover(stranger, payment.ephemeralPublicKey, payment.viewTag)).to.equal(null);
      const wrongTag = ethers.toBeHex((BigInt(payment.viewTag) + 1n) % 256n, 1);
      expect(recover(keys, payment.ephemeralPublicKey, wrongTag)).to.equal(null);
      expect(recover(keys, "0x1234", payment.viewTag)).to.equal(null);
    });
  });

  describe("EvaluatorStealth", function () {
    const PAYMENT = ethers.parseEther("0.0005");

    async function fixture() {
      const [grader, student, other] = await ethers.getSigners();
      const workshop = await deployLocalWorkshop();
      const contracts = {
        evaluator: workshop.stealth as any,
        registry: workshop.registry as any,
        announcer: workshop.announcer as any,
      };
      const instructorKeys = generateStealthKeys();
      await workshop.registry.connect(grader).registerKeys(SCHEME_ID, instructorKeys.metaAddress);
      return { grader, student, other, contracts, instructorKeys, ...workshop };
    }

    it("full student journey earns 8 points", async function () {
      const { grader, student, td, stealth, registry, announcer, contracts, instructorKeys } = await fixture();
      const evaluator = stealth.connect(student);

      // Exercise 1
      const keys = generateStealthKeys();
      await registry.connect(student).registerKeys(SCHEME_ID, keys.metaAddress);
      await evaluator.ex1_registered();
      expect(await td.balanceOf(student.address)).to.equal(2n * ONE_POINT);

      // Exercise 2: request, let the bot pay, scan, claim.
      await evaluator.ex2_requestPayment();
      expect(await payRequestedStealthAddresses(grader, contracts, PAYMENT)).to.deep.equal([student.address]);
      // The bot is idempotent.
      expect(await payRequestedStealthAddresses(grader, contracts, PAYMENT)).to.deep.equal([]);

      let stealthKey: string | null = null;
      for (const event of await announcer.queryFilter(announcer.filters.Announcement(SCHEME_ID))) {
        stealthKey ??= recoverStealthPrivateKey(
          keys.spendingPrivateKey,
          keys.viewingPrivateKey,
          event.args.ephemeralPubKey,
          ethers.dataSlice(event.args.metadata, 0, 1),
          event.args.stealthAddress,
        );
      }
      expect(stealthKey).to.not.equal(null);
      const stealthWallet = new ethers.Wallet(stealthKey!, ethers.provider);
      expect(await ethers.provider.getBalance(stealthWallet.address)).to.equal(PAYMENT);

      const message = `I control this stealth address for: ${student.address.toLowerCase()}`;
      expect(await stealth.claimMessage(student.address)).to.equal(message);
      await evaluator.ex2_claim(await stealthWallet.signMessage(message));
      expect(await td.balanceOf(student.address)).to.equal(5n * ONE_POINT);

      // Exercise 3: pay the instructor's meta-address and announce.
      const instructorMeta = await registry.stealthMetaAddressOf(grader.address, SCHEME_ID);
      const payment = generateStealthAddress(instructorMeta);
      await student.sendTransaction({ to: payment.stealthAddress, value: ethers.parseEther("0.0001") });
      await announcer
        .connect(student)
        .announce(
          SCHEME_ID,
          payment.stealthAddress,
          payment.ephemeralPublicKey,
          ethers.concat([payment.viewTag, student.address]),
        );
      const credited = await gradeStealthPayments(grader, contracts, instructorKeys, ethers.parseEther("0.0001"));
      expect(credited).to.deep.equal([student.address]);
      expect(await td.balanceOf(student.address)).to.equal(8n * ONE_POINT);
    });

    it("exercise 1 rejects a missing or malformed meta-address", async function () {
      const { student, stealth, registry } = await fixture();
      await expect(stealth.connect(student).ex1_registered()).to.be.revertedWith("meta-address must be 66 bytes");
      await registry.connect(student).registerKeys(SCHEME_ID, "0x" + "04".repeat(66));
      await expect(stealth.connect(student).ex1_registered()).to.be.revertedWith("bad spending key prefix");
    });

    it("exercise 2 rejects a signature that does not come from the stealth address", async function () {
      const { grader, student, stealth, registry, contracts } = await fixture();
      const evaluator = stealth.connect(student);
      await expect(evaluator.ex2_requestPayment()).to.be.revertedWith("do exercise 1 first");

      await registry.connect(student).registerKeys(SCHEME_ID, generateStealthKeys().metaAddress);
      await evaluator.ex1_registered();
      await evaluator.ex2_requestPayment();

      const message = await stealth.claimMessage(student.address);
      await expect(evaluator.ex2_claim(await student.signMessage(message))).to.be.revertedWith(
        "no stealth payment recorded yet",
      );
      await payRequestedStealthAddresses(grader, contracts, PAYMENT);
      await expect(evaluator.ex2_claim(await student.signMessage(message))).to.be.revertedWith(
        "not signed by the stealth address",
      );
    });

    it("exercise 3 ignores unfunded, foreign and replayed announcements", async function () {
      const { grader, student, other, td, announcer, contracts, instructorKeys } = await fixture();
      const minimum = ethers.parseEther("0.0001");
      const announce = (signer: typeof student, p: ReturnType<typeof generateStealthAddress>) =>
        announcer
          .connect(signer)
          .announce(SCHEME_ID, p.stealthAddress, p.ephemeralPublicKey, ethers.concat([p.viewTag, signer.address]));

      // Announced but not funded.
      const unfunded = generateStealthAddress(instructorKeys.metaAddress);
      await announce(student, unfunded);
      // Funded, but for somebody else's meta-address.
      const foreign = generateStealthAddress(generateStealthKeys().metaAddress);
      await student.sendTransaction({ to: foreign.stealthAddress, value: minimum });
      await announce(student, foreign);
      expect(await gradeStealthPayments(grader, contracts, instructorKeys, minimum)).to.deep.equal([]);

      // A valid payment by `other`, re-announced by `student` under their own name.
      const valid = generateStealthAddress(instructorKeys.metaAddress);
      await other.sendTransaction({ to: valid.stealthAddress, value: minimum });
      await announce(other, valid);
      await announce(student, valid);
      expect(await gradeStealthPayments(grader, contracts, instructorKeys, minimum)).to.deep.equal([other.address]);
      expect(await td.balanceOf(student.address)).to.equal(0n);
    });

    it("grader functions are teacher-only", async function () {
      const { student, stealth } = await fixture();
      await expect(stealth.connect(student).gradeSend(student.address)).to.be.revertedWith("Not a teacher");
      await expect(
        stealth.connect(student).setStealthAddressHash(student.address, ethers.ZeroHash),
      ).to.be.revertedWith("Not a teacher");
    });
  });
});
