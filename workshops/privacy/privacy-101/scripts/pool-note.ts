// Part 8 helper: creates a note and saves it under notes/.
//
// Usage:
//   npx hardhat run scripts/pool-note.ts
//
// The file holds the secrets of the note: whoever reads it can withdraw.
import * as fs from "fs";
import * as path from "path";
import { createNote, toBytes32 } from "./lib/pool";

const note = createNote();
const commitment = toBytes32(note.commitment);
const file = path.join("notes", `${commitment}.json`);

fs.mkdirSync("notes", { recursive: true });
fs.writeFileSync(
  file,
  JSON.stringify(
    {
      nullifier: note.nullifier.toString(),
      secret: note.secret.toString(),
      commitment,
      nullifierHash: toBytes32(note.nullifierHash),
    },
    null,
    2,
  ),
);
console.log(`Commitment:     ${commitment}`);
console.log(`Nullifier hash: ${toBytes32(note.nullifierHash)}`);
console.log(`Saved to ${file}`);
