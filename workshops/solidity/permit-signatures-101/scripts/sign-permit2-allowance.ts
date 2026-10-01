// Sign a Permit2 AllowanceTransfer (PermitSingle) for ex14.
// The spender is the Evaluator, and the token is MockUnderlying.
//
// Unlike SignatureTransfer, this nonce is sequential per (owner, token,
// spender) triplet. Fetch it from Permit2 before signing.
//
// Run:
//   AMOUNT=1000000000000000000 EXPIRATION_MINUTES=60 SIG_DEADLINE_MINUTES=30 \
//     npx hardhat run --network sepolia scripts/sign-permit2-allowance.ts
import { ethers } from "hardhat";

const PERMIT2_ADDRESS = process.env.PERMIT2_ADDRESS || "0x000000000022D473030F116dDEE9F6B43aC78BA3";

const TYPES = {
  PermitSingle: [
    { name: "details", type: "PermitDetails" },
    { name: "spender", type: "address" },
    { name: "sigDeadline", type: "uint256" },
  ],
  PermitDetails: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint160" },
    { name: "expiration", type: "uint48" },
    { name: "nonce", type: "uint48" },
  ],
};

async function main() {
  const evaluatorAddress = requireEnv("EVALUATOR_ADDRESS");
  const tokenAddress = requireEnv("MOCK_UNDERLYING_ADDRESS");
  const amount = BigInt(requireEnv("AMOUNT"));
  const expiration = Math.floor(Date.now() / 1000) + 60 * Number(process.env.EXPIRATION_MINUTES ?? 60);
  const sigDeadline = Math.floor(Date.now() / 1000) + 60 * Number(process.env.SIG_DEADLINE_MINUTES ?? 30);

  const [signer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;

  const permit2 = new ethers.Contract(
    PERMIT2_ADDRESS,
    [
      "function allowance(address user, address token, address spender) view returns (uint160,uint48,uint48)",
    ],
    signer
  );
  const [, , currentNonce] = await permit2.allowance(signer.address, tokenAddress, evaluatorAddress);
  const nonce = BigInt(currentNonce);

  const domain = {
    name: "Permit2",
    chainId,
    verifyingContract: PERMIT2_ADDRESS,
  };
  const message = {
    details: {
      token: tokenAddress,
      amount,
      expiration,
      nonce,
    },
    spender: evaluatorAddress,
    sigDeadline,
  };

  const signature = await signer.signTypedData(domain, TYPES, message);

  console.log(`token       = ${tokenAddress}`);
  console.log(`amount      = ${amount}`);
  console.log(`expiration  = ${expiration}`);
  console.log(`nonce       = ${nonce}`);
  console.log(`sigDeadline = ${sigDeadline}`);
  console.log(`signature (pass to ex14_permit2AllowanceTransfer):`);
  console.log(signature);
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
