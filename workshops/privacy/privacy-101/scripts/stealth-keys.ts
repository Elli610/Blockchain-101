// Generates a fresh pair of stealth keys and the matching meta-address.
//
// Usage:
//   npx hardhat run scripts/stealth-keys.ts
//
// Students: use it to compare with your own implementation.
// Teacher: put the two private keys in .env for scripts/grader-stealth.ts.
import { generateStealthKeys } from "./lib/stealth";

const keys = generateStealthKeys();
console.log(`Spending private key: ${keys.spendingPrivateKey}`);
console.log(`Viewing private key:  ${keys.viewingPrivateKey}`);
console.log(`Stealth meta-address: ${keys.metaAddress}`);
console.log(`\nWorkshop test keys only. Never use them on a mainnet.`);
