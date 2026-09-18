// Sign an ERC-2612 permit. Works for:
//   * MockUnderlying (ex6, ex7)          -> set TOKEN=<MOCK address>
//   * The student's own permit token     -> set TOKEN=<student token address>
//
// Behaviour:
//   1. Reads name and current nonce from the token.
//   2. Signs a `Permit` typed message granting the Evaluator (spender) the
//      right to move `VALUE` tokens until `deadline`.
//   3. Prints v, r, s.
//
// Run:
//   TOKEN=0x... VALUE=1000000000000000000 DEADLINE_MINUTES=30 \
//     npx hardhat run --network sepolia scripts/sign-permit-2612.ts
import { ethers } from "hardhat";

const PERMIT_TYPES = {
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

async function main() {
  const evaluatorAddress = requireEnv("EVALUATOR_ADDRESS");
  const tokenAddress = requireEnv("TOKEN");
  const value = BigInt(requireEnv("VALUE"));
  const deadline = Math.floor(Date.now() / 1000) + 60 * Number(process.env.DEADLINE_MINUTES ?? 30);

  const [signer] = await ethers.getSigners();
  const token = new ethers.Contract(
    tokenAddress,
    [
      "function name() view returns (string)",
      "function nonces(address owner) view returns (uint256)",
    ],
    signer
  );

  const name: string = await token.name();
  const nonce: bigint = await token.nonces(signer.address);
  const chainId = (await ethers.provider.getNetwork()).chainId;

  const domain = {
    name,
    version: "1",
    chainId,
    verifyingContract: tokenAddress,
  };
  const message = {
    owner: signer.address,
    spender: evaluatorAddress,
    value,
    nonce,
    deadline,
  };

  const signature = await signer.signTypedData(domain, PERMIT_TYPES, message);
  const { v, r, s } = ethers.Signature.from(signature);

  console.log(`token    = ${tokenAddress}`);
  console.log(`owner    = ${signer.address}`);
  console.log(`spender  = ${evaluatorAddress}`);
  console.log(`value    = ${value}`);
  console.log(`nonce    = ${nonce}`);
  console.log(`deadline = ${deadline}`);
  console.log(`v = ${v}`);
  console.log(`r = ${r}`);
  console.log(`s = ${s}`);
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
