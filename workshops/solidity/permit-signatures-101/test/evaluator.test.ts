// Local sanity tests for the Evaluator. These exercise the pieces of the
// Evaluator that do not require a student solution contract (ex1, ex2, ex6,
// ex7). The Permit2 and student-solution paths are validated on Sepolia
// during the workshop.
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Evaluator (Parts 1, 4)", function () {
  async function fixture() {
    const [deployer, student] = await ethers.getSigners();

    const TD = await ethers.getContractFactory("TDERC20_PERMIT");
    const td = await TD.deploy("TD-Permit-101", "TD-PERMIT-101", 0);
    await td.waitForDeployment();

    const Mock = await ethers.getContractFactory("MockUnderlying");
    const mock = await Mock.deploy();
    await mock.waitForDeployment();

    // Deploy a placeholder for Permit2 (any address; not exercised here).
    const dummyPermit2 = ethers.ZeroAddress;

    const Evaluator = await ethers.getContractFactory("Evaluator");
    const evaluator = await Evaluator.deploy(td.target, mock.target, dummyPermit2);
    await evaluator.waitForDeployment();

    await td.setTeacher(evaluator.target, true);

    return { deployer, student, td, mock, evaluator };
  }

  it("ex1_personalSign: canonical personal_sign is accepted", async function () {
    const { td, evaluator, student } = await fixture();
    const message = `I want Permit101 points at address: ${student.address.toLowerCase()}`;
    const signature = await student.signMessage(message);

    await expect(evaluator.connect(student).ex1_personalSign(signature))
      .to.not.be.reverted;

    expect(await td.balanceOf(student.address)).to.equal(2n * 10n ** 18n);
  });

  it("ex1_personalSign: signature from another address is rejected", async function () {
    const { evaluator, student, deployer } = await fixture();
    const message = `I want Permit101 points at address: ${student.address.toLowerCase()}`;
    const signature = await deployer.signMessage(message);

    await expect(evaluator.connect(student).ex1_personalSign(signature))
      .to.be.reverted;
  });

  it("ex2_signTypedGreeting: canonical EIP-712 Greeting is accepted", async function () {
    const { td, evaluator, student } = await fixture();
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const content: string = await evaluator.getContentFor(student.address);
    const nonce: bigint = await evaluator.evaluatorNonce(student.address);
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    const domain = {
      name: "Permit101Evaluator",
      version: "1",
      chainId,
      verifyingContract: await evaluator.getAddress(),
    };
    const types = {
      Greeting: [
        { name: "who", type: "address" },
        { name: "content", type: "string" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };
    const value = { who: student.address, content, nonce, deadline };

    const sig = await student.signTypedData(domain, types, value);
    const { v, r, s } = ethers.Signature.from(sig);

    await expect(evaluator.connect(student).ex2_signTypedGreeting(content, nonce, deadline, v, r, s))
      .to.not.be.reverted;

    expect(await td.balanceOf(student.address)).to.equal(2n * 10n ** 18n);
    expect(await evaluator.evaluatorNonce(student.address)).to.equal(1n);
  });

  it("ex2_signTypedGreeting: wrong content is rejected", async function () {
    const { evaluator, student } = await fixture();
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const nonce: bigint = await evaluator.evaluatorNonce(student.address);
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    const domain = {
      name: "Permit101Evaluator",
      version: "1",
      chainId,
      verifyingContract: await evaluator.getAddress(),
    };
    const types = {
      Greeting: [
        { name: "who", type: "address" },
        { name: "content", type: "string" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };
    const value = { who: student.address, content: "wrong", nonce, deadline };
    const sig = await student.signTypedData(domain, types, value);
    const { v, r, s } = ethers.Signature.from(sig);

    await expect(
      evaluator.connect(student).ex2_signTypedGreeting("wrong", nonce, deadline, v, r, s)
    ).to.be.revertedWith("wrong content");
  });

  it("ex6_permitMock + ex7_permitAndPull: full permit + transfer", async function () {
    const { td, mock, evaluator, student } = await fixture();

    // Student gets some MOCK
    const value = ethers.parseEther("100");
    await mock.connect(student).getTokens(value);

    const chainId = (await ethers.provider.getNetwork()).chainId;
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    async function signPermit(nonce: bigint) {
      const domain = {
        name: "Mock Underlying",
        version: "1",
        chainId,
        verifyingContract: await mock.getAddress(),
      };
      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };
      const message = {
        owner: student.address,
        spender: await evaluator.getAddress(),
        value,
        nonce,
        deadline,
      };
      const sig = await student.signTypedData(domain, types, message);
      return ethers.Signature.from(sig);
    }

    // ex6: permit only
    let nonce = await mock.nonces(student.address);
    let { v, r, s } = await signPermit(nonce);
    await expect(evaluator.connect(student).ex6_permitMock(value, deadline, v, r, s))
      .to.not.be.reverted;
    expect(await mock.allowance(student.address, await evaluator.getAddress())).to.equal(value);

    // ex7: permit + pull
    nonce = await mock.nonces(student.address);
    ({ v, r, s } = await signPermit(nonce));
    const evalBalBefore = await mock.balanceOf(await evaluator.getAddress());
    await expect(evaluator.connect(student).ex7_permitAndPull(value, deadline, v, r, s))
      .to.not.be.reverted;
    expect(await mock.balanceOf(await evaluator.getAddress())).to.equal(evalBalBefore + value);

    // 4 points for ex6 + ex7
    expect(await td.balanceOf(student.address)).to.equal(4n * 10n ** 18n);
  });
});
