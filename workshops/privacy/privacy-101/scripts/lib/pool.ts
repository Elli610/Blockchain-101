// Off-chain helpers for Part 8: notes, the Poseidon Merkle tree and the
// circuit inputs. The hash is the circomlib-compatible Poseidon over BN254,
// identical to poseidon-solidity on-chain and to the Noir poseidon library.
import { ethers } from "ethers";
import { poseidon1, poseidon2 } from "poseidon-lite";

export const LEVELS = 20;
export const FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

export interface Note {
  nullifier: bigint;
  secret: bigint;
  commitment: bigint;
  nullifierHash: bigint;
}

export interface MerklePath {
  root: bigint;
  siblings: bigint[];
  index: number;
}

export function randomFieldElement(): bigint {
  // 31 random bytes are always below the field modulus.
  return BigInt(ethers.hexlify(ethers.randomBytes(31)));
}

export function createNote(nullifier = randomFieldElement(), secret = randomFieldElement()): Note {
  return {
    nullifier,
    secret,
    commitment: poseidon2([nullifier, secret]),
    nullifierHash: poseidon1([nullifier]),
  };
}

export function toBytes32(value: bigint): string {
  return ethers.toBeHex(value, 32);
}

/// Roots of empty subtrees: zeros[i] is the root of an empty subtree of height i.
export function zeroHashes(levels = LEVELS): bigint[] {
  const zeros = [0n];
  for (let i = 0; i < levels; i++) zeros.push(poseidon2([zeros[i], zeros[i]]));
  return zeros;
}

/// Merkle path of leaf `index` in the tree made of `leaves` (in insertion order).
export function merklePath(leaves: bigint[], index: number, levels = LEVELS): MerklePath {
  if (index < 0 || index >= leaves.length) throw new Error("leaf index out of range");
  const zeros = zeroHashes(levels);
  const siblings: bigint[] = [];
  let layer = leaves.slice();
  let position = index;
  for (let level = 0; level < levels; level++) {
    const siblingIndex = position ^ 1;
    siblings.push(siblingIndex < layer.length ? layer[siblingIndex] : zeros[level]);
    const next: bigint[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      next.push(poseidon2([layer[i], i + 1 < layer.length ? layer[i + 1] : zeros[level]]));
    }
    layer = next;
    position >>= 1;
  }
  return { root: layer[0], siblings, index };
}

/// Commitments of a pool, in insertion order, rebuilt from its Deposit events.
export async function fetchCommitments(pool: ethers.Contract, fromBlock = 0): Promise<bigint[]> {
  const events = await pool.queryFilter(pool.filters.Deposit(), fromBlock);
  const leaves: bigint[] = [];
  for (const event of events) {
    const { commitment, leafIndex } = (event as ethers.EventLog).args;
    leaves[Number(leafIndex)] = BigInt(commitment);
  }
  return leaves;
}

export function addressToField(address: string): bigint {
  return BigInt(address);
}

/// Inputs of circuits/minipool, in the format expected by noir_js.
export function withdrawalInputs(
  note: Note,
  path: MerklePath,
  recipient: string,
  relayer: string,
  fee: bigint,
): Record<string, string | string[]> {
  return {
    nullifier: note.nullifier.toString(),
    secret: note.secret.toString(),
    path_siblings: path.siblings.map((s) => s.toString()),
    path_index: path.index.toString(),
    root: path.root.toString(),
    nullifier_hash: note.nullifierHash.toString(),
    recipient: addressToField(recipient).toString(),
    relayer: addressToField(relayer).toString(),
    fee: fee.toString(),
  };
}
