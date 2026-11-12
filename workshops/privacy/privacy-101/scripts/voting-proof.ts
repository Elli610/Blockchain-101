// Part 6 helper: builds a Semaphore proof for your Voting contract.
//
// Usage:
//   VOTING_ADDRESS=0x... SEMAPHORE_IDENTITY=<exported identity> VOTE_OPTION=1 \
//     npx hardhat run --network sepolia scripts/voting-proof.ts
//
// Leave SEMAPHORE_IDENTITY empty to create a new identity. Set VOTE_SCOPE to
// use a scope other than the ballot id (exercise 5).
import { ethers } from "hardhat";
import { Group, Identity, generateProof } from "@semaphore-protocol/core";
import { SEMAPHORE_SEPOLIA } from "./lib/deploy";
import { fromBlock, requireEnv } from "./lib/env";

async function main() {
  const identity = process.env.SEMAPHORE_IDENTITY ? Identity.import(process.env.SEMAPHORE_IDENTITY) : new Identity();
  if (!process.env.SEMAPHORE_IDENTITY) {
    console.log(`New identity. Keep this secret: ${identity.export()}`);
    console.log(`Commitment to pass to join(): ${identity.commitment}`);
    return;
  }

  const voting = await ethers.getContractAt("IVotingSolution", requireEnv("VOTING_ADDRESS"));
  const semaphore = await ethers.getContractAt("Semaphore", process.env.SEMAPHORE_ADDRESS || SEMAPHORE_SEPOLIA);
  const groupId = await voting.groupId();
  const scope = process.env.VOTE_SCOPE ? BigInt(process.env.VOTE_SCOPE) : await voting.ballotId();

  // The off-chain group must hold the same members in the same order.
  const members: bigint[] = [];
  for (const event of await semaphore.queryFilter(semaphore.filters.MemberAdded(groupId), fromBlock())) {
    members[Number(event.args.index)] = event.args.identityCommitment;
  }
  const group = new Group(members);
  if (group.indexOf(identity.commitment) === -1) throw new Error("this identity is not a member of the group");

  const proof = await generateProof(identity, group, BigInt(process.env.VOTE_OPTION || 1), scope);
  console.log(JSON.stringify(proof, null, 2));
  // Ready to paste as the argument of ex3_vote, ex4_doubleVote, ex5_wrongScope
  // or vote, for instance with `cast send <address> "ex3_vote((uint256,uint256,uint256,uint256,uint256,uint256[8]))" "<tuple>"`.
  console.log(`\nAs a Solidity tuple:`);
  console.log(
    `(${proof.merkleTreeDepth},${proof.merkleTreeRoot},${proof.nullifier},${proof.message},${proof.scope},[${proof.points.join(",")}])`,
  );
}

// The prover keeps worker threads alive: exit explicitly once done.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
