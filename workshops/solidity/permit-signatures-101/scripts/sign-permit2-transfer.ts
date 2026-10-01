// Sign a Permit2 SignatureTransfer (PermitTransferFrom) for ex13.
// The spender is the Evaluator, and the token transferred is MockUnderlying.
//
// The Permit2 nonce is a 256-bit bitmap-based value. Any unused nonce works.
// A common pattern: use `Date.now()`. Two signatures with the same nonce
// cannot both be consumed.
//
// Run:
//   AMOUNT=1000000000000000000 NONCE=1 DEADLINE_MINUTES=30 \
//     npx hardhat run --network sepolia scripts/sign-permit2-transfer.ts
import { ethers } from "hardhat";

const PERMIT2_ADDRESS = process.env.PERMIT2_ADDRESS || "0x000000000022D473030F116dDEE9F6B43aC78BA3";

const TYPES = {
  PermitTransferFrom: [
    { name: "permitted", type: "TokenPermissions" },
    { name: "spender", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
  TokenPermissions: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
  ],
};

async function main() {
  const evaluatorAddress = requireEnv("EVALUATOR_ADDRESS");
  const tokenAddress = requireEnv("MOCK_UNDERLYING_ADDRESS");
  const amount = BigInt(requireEnv("AMOUNT"));
  const nonce = BigInt(process.env.NONCE ?? Date.now());
  const deadline = Math.floor(Date.now() / 1000) + 60 * Number(process.env.DEADLINE_MINUTES ?? 30);

  const [signer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;

  const domain = {
    name: "Permit2",
    chainId,
    verifyingContract: PERMIT2_ADDRESS,
  };
  const message = {
    permitted: { token: tokenAddress, amount },
    spender: evaluatorAddress,
    nonce,
    deadline,
  };

  const signature = await signer.signTypedData(domain, TYPES, message);

  console.log(`token    = ${tokenAddress}`);
  console.log(`amount   = ${amount}`);
  console.log(`nonce    = ${nonce}`);
  console.log(`deadline = ${deadline}`);
  console.log(`signature (pass to ex13_permit2SignatureTransfer):`);
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
