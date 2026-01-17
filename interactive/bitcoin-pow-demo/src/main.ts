/**
 * Bitcoin Proof of Work Visualization
 *
 * This implementation uses Bitcoin Core's actual difficulty system:
 *
 * 1. TARGET ENCODING (nBits / "compact" format):
 *    Bitcoin stores the 256-bit target in a 4-byte compact format called "nBits"
 *    Format: 0xAABBCCDD where:
 *    - AA = exponent (number of bytes in target)
 *    - BBCCDD = coefficient (mantissa), 3 most significant bytes
 *    - Target = coefficient * 256^(exponent - 3)
 *
 *    Example: 0x1d00ffff (genesis block)
 *    - exponent = 0x1d = 29
 *    - coefficient = 0x00ffff
 *    - Target = 0x00ffff * 256^(29-3) = 0x00000000FFFF0000...0000 (26 trailing zero bytes)
 *
 * 2. DIFFICULTY CALCULATION:
 *    difficulty = max_target / current_target
 *    where max_target = target at difficulty 1 = 0x00000000FFFF << 208
 *
 * 3. HASH COMPARISON:
 *    The double-SHA256 hash (as a 256-bit little-endian number) must be < target
 *    In practice: reverse the hash bytes, compare as big integers
 *
 * 4. DIFFICULTY ADJUSTMENT:
 *    Every 2016 blocks (~2 weeks), Bitcoin adjusts difficulty:
 *    new_target = old_target * (actual_time / expected_time)
 *    Clamped to max 4x increase or decrease per adjustment
 */

// ============================================================================
// Types
// ============================================================================

interface BlockHeader {
  version: number;
  previousBlockHash: string;
  merkleRoot: string;
  timestamp: number;
  bits: number;  // Compact target representation (nBits)
  nonce: number;
}

interface MiningStats {
  hashesComputed: number;
  startTime: number;
  hashRate: number;
  elapsedTime: number;
}

interface MiningResult {
  success: boolean;
  nonce: number;
  hash: string;
  stats: MiningStats;
}

interface DifficultyInfo {
  bits: number;
  bitsHex: string;
  target: string;
  difficulty: number;
  expectedHashes: number;
  probability: number;
}

// ============================================================================
// Constants - Bitcoin's actual values
// ============================================================================

// Maximum target (difficulty 1) - from Bitcoin Core
// This is 0x00000000FFFF0000000000000000000000000000000000000000000000000000
const MAX_TARGET_BITS = 0x1d00ffff;

// Proof of work limit for mainnet (minimum difficulty)
const POW_LIMIT_HEX = '00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

// Genesis block bits
const GENESIS_BITS = 0x1d00ffff;

// ============================================================================
// Hash Algorithm Types
// ============================================================================

type HashAlgorithm = 'sha256' | 'double-sha256' | 'sha512' | 'scrypt';

interface HashResult {
  algorithm: HashAlgorithm;
  hash: string;
  timeMs: number;
  outputBits: number;
  description: string;
}

interface HashAlgorithmInfo {
  name: string;
  description: string;
  outputBits: number;
  memoryHard: boolean;
  usedBy: string;
}

const HASH_ALGORITHMS: Record<HashAlgorithm, HashAlgorithmInfo> = {
  'sha256': {
    name: 'SHA-256',
    description: 'Secure Hash Algorithm with 256-bit output. Fast and widely used.',
    outputBits: 256,
    memoryHard: false,
    usedBy: 'General cryptography, TLS, digital signatures'
  },
  'double-sha256': {
    name: 'Double SHA-256',
    description: 'SHA256(SHA256(data)) - Bitcoin\'s proof of work hash function.',
    outputBits: 256,
    memoryHard: false,
    usedBy: 'Bitcoin mining, block headers'
  },
  'sha512': {
    name: 'SHA-512',
    description: 'Secure Hash Algorithm with 512-bit output. Larger output, similar speed on 64-bit systems.',
    outputBits: 512,
    memoryHard: false,
    usedBy: 'Cryptographic applications requiring larger hash'
  },
  'scrypt': {
    name: 'scrypt',
    description: 'Memory-hard key derivation function. Designed to be expensive to compute in hardware.',
    outputBits: 256,
    memoryHard: true,
    usedBy: 'Litecoin mining, password hashing'
  }
};

// ============================================================================
// SHA-256 Implementation using Web Crypto API
// ============================================================================

async function sha256Bytes(data: Uint8Array): Promise<Uint8Array> {
  // Create a new ArrayBuffer copy to satisfy TypeScript's strict typing
  const buffer = new ArrayBuffer(data.length);
  new Uint8Array(buffer).set(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return new Uint8Array(hashBuffer);
}

async function sha256String(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBytes = await sha256Bytes(data);
  return bytesToHex(hashBytes);
}

// Bitcoin uses double SHA-256: SHA256(SHA256(data))
async function doubleSha256Bytes(data: Uint8Array): Promise<Uint8Array> {
  const firstHash = await sha256Bytes(data);
  return sha256Bytes(firstHash);
}

async function doubleSha256String(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBytes = await doubleSha256Bytes(data);
  return bytesToHex(hashBytes);
}

// ============================================================================
// SHA-512 Implementation using Web Crypto API
// ============================================================================

async function sha512Bytes(data: Uint8Array): Promise<Uint8Array> {
  const buffer = new ArrayBuffer(data.length);
  new Uint8Array(buffer).set(data);
  const hashBuffer = await crypto.subtle.digest('SHA-512', buffer);
  return new Uint8Array(hashBuffer);
}

async function sha512String(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBytes = await sha512Bytes(data);
  return bytesToHex(hashBytes);
}

// ============================================================================
// Scrypt Implementation (Simplified educational version)
// Based on RFC 7914 - uses PBKDF2-HMAC-SHA256 and Salsa20/8
// ============================================================================

// PBKDF2-HMAC-SHA256 using Web Crypto API
async function pbkdf2Sha256(password: Uint8Array, salt: Uint8Array, iterations: number, keyLen: number): Promise<Uint8Array> {
  // Create ArrayBuffer copies for Web Crypto API
  const passwordBuffer = new ArrayBuffer(password.length);
  new Uint8Array(passwordBuffer).set(password);

  const saltBuffer = new ArrayBuffer(salt.length);
  new Uint8Array(saltBuffer).set(salt);

  const key = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: iterations,
      hash: 'SHA-256'
    },
    key,
    keyLen * 8
  );

  return new Uint8Array(derivedBits);
}

// Salsa20/8 core function (quarter-round based)
function salsa20_8(B: Uint32Array): void {
  const x = new Uint32Array(16);
  for (let i = 0; i < 16; i++) {
    x[i] = B[i];
  }

  function R(a: number, b: number): number {
    return ((a << b) | (a >>> (32 - b))) >>> 0;
  }

  for (let i = 0; i < 4; i++) {
    // Column round
    x[4]  ^= R(x[0]  + x[12], 7);  x[8]  ^= R(x[4]  + x[0], 9);
    x[12] ^= R(x[8]  + x[4], 13); x[0]  ^= R(x[12] + x[8], 18);
    x[9]  ^= R(x[5]  + x[1], 7);  x[13] ^= R(x[9]  + x[5], 9);
    x[1]  ^= R(x[13] + x[9], 13); x[5]  ^= R(x[1]  + x[13], 18);
    x[14] ^= R(x[10] + x[6], 7);  x[2]  ^= R(x[14] + x[10], 9);
    x[6]  ^= R(x[2]  + x[14], 13); x[10] ^= R(x[6]  + x[2], 18);
    x[3]  ^= R(x[15] + x[11], 7);  x[7]  ^= R(x[3]  + x[15], 9);
    x[11] ^= R(x[7]  + x[3], 13); x[15] ^= R(x[11] + x[7], 18);
    // Row round
    x[1]  ^= R(x[0]  + x[3], 7);  x[2]  ^= R(x[1]  + x[0], 9);
    x[3]  ^= R(x[2]  + x[1], 13); x[0]  ^= R(x[3]  + x[2], 18);
    x[6]  ^= R(x[5]  + x[4], 7);  x[7]  ^= R(x[6]  + x[5], 9);
    x[4]  ^= R(x[7]  + x[6], 13); x[5]  ^= R(x[4]  + x[7], 18);
    x[11] ^= R(x[10] + x[9], 7);  x[8]  ^= R(x[11] + x[10], 9);
    x[9]  ^= R(x[8]  + x[11], 13); x[10] ^= R(x[9]  + x[8], 18);
    x[12] ^= R(x[15] + x[14], 7); x[13] ^= R(x[12] + x[15], 9);
    x[14] ^= R(x[13] + x[12], 13); x[15] ^= R(x[14] + x[13], 18);
  }

  for (let i = 0; i < 16; i++) {
    B[i] = (B[i] + x[i]) >>> 0;
  }
}

// BlockMix function for scrypt
function scryptBlockMix(B: Uint32Array, r: number): void {
  const X = new Uint32Array(16);
  const Y = new Uint32Array(32 * r);

  // Copy last block to X
  for (let i = 0; i < 16; i++) {
    X[i] = B[(2 * r - 1) * 16 + i];
  }

  for (let i = 0; i < 2 * r; i++) {
    // X = X XOR B[i]
    for (let j = 0; j < 16; j++) {
      X[j] ^= B[i * 16 + j];
    }
    salsa20_8(X);
    // Y[i] = X
    for (let j = 0; j < 16; j++) {
      Y[i * 16 + j] = X[j];
    }
  }

  // B = [Y[0], Y[2], ..., Y[2r-2], Y[1], Y[3], ..., Y[2r-1]]
  for (let i = 0; i < r; i++) {
    for (let j = 0; j < 16; j++) {
      B[i * 16 + j] = Y[i * 2 * 16 + j];
      B[(r + i) * 16 + j] = Y[(i * 2 + 1) * 16 + j];
    }
  }
}

// ROMix function for scrypt
function scryptROMix(B: Uint32Array, N: number, r: number): void {
  const blockSize = 32 * r;
  const V = new Array<Uint32Array>(N);

  // Step 1: V[i] = X; X = BlockMix(X)
  for (let i = 0; i < N; i++) {
    V[i] = new Uint32Array(B);
    scryptBlockMix(B, r);
  }

  // Step 2: X = BlockMix(X XOR V[Integerify(X) mod N])
  for (let i = 0; i < N; i++) {
    const j = B[(2 * r - 1) * 16] & (N - 1);
    for (let k = 0; k < blockSize; k++) {
      B[k] ^= V[j][k];
    }
    scryptBlockMix(B, r);
  }
}

// Main scrypt function (simplified parameters for demo: N=1024, r=1, p=1)
async function scryptHash(message: string, N: number = 1024, r: number = 1, p: number = 1): Promise<string> {
  const encoder = new TextEncoder();
  const password = encoder.encode(message);
  const salt = encoder.encode('bitcoin-demo-salt');

  const dkLen = 32; // Output 256 bits
  const blockSize = 128 * r;

  // Step 1: Initial PBKDF2
  const B = await pbkdf2Sha256(password, salt, 1, p * blockSize);

  // Convert to Uint32Array (little-endian)
  const B32 = new Uint32Array(B.buffer);

  // Step 2: ROMix for each block
  for (let i = 0; i < p; i++) {
    const block = B32.subarray(i * 32 * r, (i + 1) * 32 * r);
    scryptROMix(block, N, r);
  }

  // Step 3: Final PBKDF2
  const result = await pbkdf2Sha256(password, new Uint8Array(B32.buffer), 1, dkLen);

  return bytesToHex(result);
}

// ============================================================================
// Unified Hash Function
// ============================================================================

async function computeHash(message: string, algorithm: HashAlgorithm): Promise<HashResult> {
  const startTime = performance.now();
  let hash: string;

  switch (algorithm) {
    case 'sha256':
      hash = await sha256String(message);
      break;
    case 'double-sha256':
      hash = await doubleSha256String(message);
      break;
    case 'sha512':
      hash = await sha512String(message);
      break;
    case 'scrypt':
      hash = await scryptHash(message);
      break;
    default:
      throw new Error(`Unknown algorithm: ${algorithm}`);
  }

  const endTime = performance.now();
  const info = HASH_ALGORITHMS[algorithm];

  return {
    algorithm,
    hash,
    timeMs: endTime - startTime,
    outputBits: info.outputBits,
    description: info.description
  };
}

async function compareHashes(message: string, algorithms: HashAlgorithm[]): Promise<HashResult[]> {
  const results: HashResult[] = [];
  for (const algo of algorithms) {
    results.push(await computeHash(message, algo));
  }
  return results;
}

// ============================================================================
// Byte/Hex Utilities
// ============================================================================

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// Reverse byte order (for endianness conversion)
function reverseBytes(bytes: Uint8Array): Uint8Array {
  const reversed = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    reversed[i] = bytes[bytes.length - 1 - i];
  }
  return reversed;
}

function reverseHex(hex: string): string {
  return bytesToHex(reverseBytes(hexToBytes(hex)));
}

// ============================================================================
// Compact Target (nBits) Encoding/Decoding
// Bitcoin Core: src/arith_uint256.cpp - SetCompact/GetCompact
// ============================================================================

/**
 * Decode compact "bits" format to full 256-bit target (as 64-char hex string)
 *
 * Format: bits = 0xAABBCCDD
 * - AA = exponent (size in bytes)
 * - BBCCDD = coefficient (mantissa)
 * - If coefficient's high bit is set, it's negative (we ignore this for PoW)
 *
 * Target = coefficient * 256^(exponent - 3)
 */
function bitsToTarget(bits: number): string {
  const exponent = (bits >> 24) & 0xff;
  let coefficient = bits & 0x007fffff;

  // Handle negative (high bit set) - shouldn't happen in valid PoW
  if (bits & 0x00800000) {
    coefficient = 0;
  }

  let target: string;

  if (exponent <= 3) {
    // Coefficient needs to be right-shifted
    coefficient >>= 8 * (3 - exponent);
    target = coefficient.toString(16).padStart(64, '0');
  } else {
    // Coefficient is placed at (exponent - 3) bytes from the right
    const coeffHex = coefficient.toString(16).padStart(6, '0');
    const shiftBytes = exponent - 3;
    const totalHexChars = 64;
    const coeffPosition = totalHexChars - (shiftBytes * 2) - 6;

    if (coeffPosition < 0) {
      // Target would overflow 256 bits - cap at max
      target = 'f'.repeat(64);
    } else {
      target = '0'.repeat(coeffPosition) + coeffHex + '0'.repeat(shiftBytes * 2);
    }
  }

  return target.slice(0, 64); // Ensure exactly 64 chars
}

/**
 * Encode a 256-bit target (hex string) to compact "bits" format
 *
 * This finds the most significant non-zero bytes and encodes them
 */
function targetToBits(targetHex: string): number {
  // Remove leading zeros to find the significant part
  let stripped = targetHex.replace(/^0+/, '') || '0';

  // Pad to even length
  if (stripped.length % 2 !== 0) {
    stripped = '0' + stripped;
  }

  const numBytes = stripped.length / 2;

  // Get the top 3 bytes as coefficient
  let coeffHex = stripped.slice(0, 6).padEnd(6, '0');
  let coefficient = parseInt(coeffHex, 16);
  let exponent = numBytes;

  // If high bit of coefficient is set, we need to add a zero byte
  // to avoid it being interpreted as negative
  if (coefficient & 0x800000) {
    coefficient >>= 8;
    exponent += 1;
  }

  return (exponent << 24) | coefficient;
}

/**
 * Calculate difficulty from bits
 *
 * difficulty = max_target / current_target
 *
 * For precision with large numbers, we use the formula:
 * difficulty = (0xffff * 2^208) / target
 */
function bitsToDifficulty(bits: number): number {
  const targetHex = bitsToTarget(bits);
  const maxTargetHex = bitsToTarget(MAX_TARGET_BITS);

  // For JavaScript, we'll use BigInt for precision
  const target = BigInt('0x' + targetHex);
  const maxTarget = BigInt('0x' + maxTargetHex);

  if (target === 0n) return Infinity;

  // Calculate difficulty as a number (will lose precision for very high difficulties)
  // difficulty = maxTarget / target
  const difficultyBig = (maxTarget * 1000000n) / target;
  return Number(difficultyBig) / 1000000;
}

/**
 * Calculate bits from desired difficulty
 *
 * target = max_target / difficulty
 */
function difficultyToBits(difficulty: number): number {
  const maxTargetHex = bitsToTarget(MAX_TARGET_BITS);
  const maxTarget = BigInt('0x' + maxTargetHex);

  // target = maxTarget / difficulty
  const difficultyBig = BigInt(Math.floor(difficulty * 1000000));
  const target = (maxTarget * 1000000n) / difficultyBig;

  // Convert back to hex and then to bits
  let targetHex = target.toString(16).padStart(64, '0');

  // Ensure we don't exceed max target
  if (BigInt('0x' + targetHex) > maxTarget) {
    targetHex = maxTargetHex;
  }

  return targetToBits(targetHex);
}

// ============================================================================
// Hash Comparison
// ============================================================================

/**
 * Compare a hash against the target
 *
 * In Bitcoin, the hash is treated as a 256-bit little-endian number
 * and must be less than the target (big-endian comparison after reversal)
 *
 * Actually, for the comparison, Bitcoin compares the hash bytes directly
 * as a little-endian uint256. The hash output is already in the right format.
 *
 * For our visualization, we'll compare as big integers after reversing
 * (since our hash is displayed in big-endian/natural reading order)
 */
function hashMeetsTarget(hashHex: string, targetHex: string): boolean {
  // The hash from SHA256 is in the order we display it
  // Bitcoin internally reverses for uint256 comparison
  // For simplicity, we compare the displayed hash (big-endian) with target

  const hashBig = BigInt('0x' + hashHex);
  const targetBig = BigInt('0x' + targetHex);

  return hashBig <= targetBig;
}

/**
 * Count leading zero bits in a hash (for display purposes)
 */
function countLeadingZeroBits(hashHex: string): number {
  let bits = 0;
  for (const char of hashHex) {
    const nibble = parseInt(char, 16);
    if (nibble === 0) {
      bits += 4;
    } else {
      // Count leading zeros in this nibble
      if (nibble < 8) bits += 1;
      if (nibble < 4) bits += 1;
      if (nibble < 2) bits += 1;
      break;
    }
  }
  return bits;
}

// ============================================================================
// Block Header Serialization
// ============================================================================

/**
 * Serialize block header to bytes (80 bytes total, like real Bitcoin)
 *
 * All fields are little-endian as per Bitcoin protocol
 */
function serializeBlockHeader(header: BlockHeader): Uint8Array {
  const buffer = new ArrayBuffer(80);
  const view = new DataView(buffer);

  // Version (4 bytes, little-endian)
  view.setUint32(0, header.version, true);

  // Previous block hash (32 bytes, already in internal byte order)
  const prevHashBytes = hexToBytes(header.previousBlockHash);
  for (let i = 0; i < 32; i++) {
    view.setUint8(4 + i, prevHashBytes[i] || 0);
  }

  // Merkle root (32 bytes)
  const merkleBytes = hexToBytes(header.merkleRoot);
  for (let i = 0; i < 32; i++) {
    view.setUint8(36 + i, merkleBytes[i] || 0);
  }

  // Timestamp (4 bytes, little-endian)
  view.setUint32(68, header.timestamp, true);

  // Bits (4 bytes, little-endian)
  view.setUint32(72, header.bits, true);

  // Nonce (4 bytes, little-endian)
  view.setUint32(76, header.nonce, true);

  return new Uint8Array(buffer);
}

// ============================================================================
// Difficulty Information
// ============================================================================

function calculateDifficultyInfo(bits: number): DifficultyInfo {
  const target = bitsToTarget(bits);
  const difficulty = bitsToDifficulty(bits);

  // Expected hashes = 2^256 / (target + 1) ≈ difficulty * 2^32
  // Simplified: expectedHashes ≈ difficulty * 4294967296
  const expectedHashes = difficulty * 4294967296;

  // Probability = 1 / expectedHashes
  const probability = 1 / expectedHashes;

  return {
    bits,
    bitsHex: '0x' + bits.toString(16).padStart(8, '0'),
    target,
    difficulty,
    expectedHashes,
    probability
  };
}

// ============================================================================
// Mining State
// ============================================================================

let isMining = false;
let shouldStopMining = false;
let currentMiningStats: MiningStats = {
  hashesComputed: 0,
  startTime: 0,
  hashRate: 0,
  elapsedTime: 0
};

// ============================================================================
// Mining Functions
// ============================================================================

function createBlockHeader(blockData: string, previousHash: string, bits: number): BlockHeader {
  // Create a merkle root from the block data (simplified - real Bitcoin uses merkle tree)
  const merkleRoot = blockData.padEnd(64, '0').slice(0, 64);

  return {
    version: 0x20000000, // BIP9 version bits
    previousBlockHash: previousHash || '0'.repeat(64),
    merkleRoot,
    timestamp: Math.floor(Date.now() / 1000),
    bits,
    nonce: 0
  };
}

async function mineBlock(
  header: BlockHeader,
  onProgress: (nonce: number, hash: string, stats: MiningStats) => void,
  maxAttempts: number = 100000000
): Promise<MiningResult> {
  currentMiningStats = {
    hashesComputed: 0,
    startTime: performance.now(),
    hashRate: 0,
    elapsedTime: 0
  };

  const target = bitsToTarget(header.bits);
  let nonce = 0;
  let hash = '';
  const batchSize = 100;
  let lastUpdateTime = performance.now();

  while (nonce < maxAttempts && !shouldStopMining) {
    for (let i = 0; i < batchSize && nonce < maxAttempts && !shouldStopMining; i++) {
      header.nonce = nonce;
      const serialized = serializeBlockHeader(header);
      const hashBytes = await doubleSha256Bytes(serialized);

      // Bitcoin displays block hashes with bytes reversed (big-endian display)
      hash = bytesToHex(reverseBytes(hashBytes));

      currentMiningStats.hashesComputed++;
      const now = performance.now();
      currentMiningStats.elapsedTime = (now - currentMiningStats.startTime) / 1000;

      if (currentMiningStats.elapsedTime > 0) {
        currentMiningStats.hashRate = currentMiningStats.hashesComputed / currentMiningStats.elapsedTime;
      }

      if (hashMeetsTarget(hash, target)) {
        onProgress(nonce, hash, { ...currentMiningStats });
        return {
          success: true,
          nonce,
          hash,
          stats: { ...currentMiningStats }
        };
      }

      nonce++;
    }

    // Update UI periodically (every 50ms)
    const now = performance.now();
    if (now - lastUpdateTime > 50) {
      onProgress(nonce - 1, hash, { ...currentMiningStats });
      lastUpdateTime = now;
      // Yield to allow UI updates
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return {
    success: false,
    nonce,
    hash,
    stats: { ...currentMiningStats }
  };
}

// ============================================================================
// UI Formatting Functions
// ============================================================================

function formatNumber(num: number): string {
  if (num >= 1e18) return (num / 1e18).toFixed(2) + ' E';
  if (num >= 1e15) return (num / 1e15).toFixed(2) + ' P';
  if (num >= 1e12) return (num / 1e12).toFixed(2) + ' T';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + ' G';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + ' M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + ' K';
  return num.toFixed(num < 10 ? 2 : 0);
}

function formatDifficulty(diff: number): string {
  if (diff >= 1e12) return (diff / 1e12).toFixed(2) + ' T';
  if (diff >= 1e9) return (diff / 1e9).toFixed(2) + ' G';
  if (diff >= 1e6) return (diff / 1e6).toFixed(2) + ' M';
  if (diff >= 1e3) return (diff / 1e3).toFixed(2) + ' K';
  return diff.toFixed(2);
}

function formatTime(seconds: number): string {
  if (seconds < 0.001) return (seconds * 1000000).toFixed(0) + ' μs';
  if (seconds < 1) return (seconds * 1000).toFixed(0) + ' ms';
  if (seconds < 60) return seconds.toFixed(2) + ' s';
  if (seconds < 3600) return (seconds / 60).toFixed(2) + ' min';
  if (seconds < 86400) return (seconds / 3600).toFixed(2) + ' hours';
  return (seconds / 86400).toFixed(2) + ' days';
}

function formatProbability(prob: number): string {
  if (prob >= 0.01) return (prob * 100).toFixed(2) + '%';
  return prob.toExponential(2);
}

/**
 * Highlight the hash based on target comparison
 * Shows which part of the hash is being compared
 */
function highlightHash(hash: string, target: string): string {
  let html = '';
  let matchedSoFar = true;

  for (let i = 0; i < hash.length; i++) {
    const hashChar = hash[i];
    const targetChar = target[i];
    const hashVal = parseInt(hashChar, 16);
    const targetVal = parseInt(targetChar, 16);

    if (matchedSoFar) {
      if (hashVal < targetVal) {
        // This character makes the hash valid
        html += `<span class="char valid">${hashChar}</span>`;
        matchedSoFar = false; // Rest doesn't matter
      } else if (hashVal === targetVal) {
        // Equal so far, need to check next
        html += `<span class="char equal">${hashChar}</span>`;
      } else {
        // Hash is greater, invalid
        html += `<span class="char invalid">${hashChar}</span>`;
        matchedSoFar = false;
      }
    } else {
      html += `<span class="char neutral">${hashChar}</span>`;
    }
  }

  return html;
}

function highlightTarget(target: string): string {
  let html = '';
  let inLeadingZeros = true;

  for (const char of target) {
    if (inLeadingZeros && char === '0') {
      html += `<span class="char zero">${char}</span>`;
    } else {
      inLeadingZeros = false;
      html += `<span class="char significant">${char}</span>`;
    }
  }

  return html;
}

// ============================================================================
// UI Update Functions
// ============================================================================

function updateDifficultyInfo(bits: number): void {
  const info = calculateDifficultyInfo(bits);
  const leadingZeroBits = countLeadingZeroBits(info.target);

  const infoEl = document.getElementById('difficulty-info');
  if (infoEl) {
    infoEl.innerHTML = `
      <div class="info-section">
        <h4>Compact Target (nBits)</h4>
        <div class="info-row">
          <span class="label">nBits value:</span>
          <span class="value mono">${info.bitsHex}</span>
        </div>
        <div class="info-row">
          <span class="label">Breakdown:</span>
          <span class="value">
            exponent = 0x${((bits >> 24) & 0xff).toString(16)} (${(bits >> 24) & 0xff}),
            coefficient = 0x${(bits & 0x007fffff).toString(16).padStart(6, '0')}
          </span>
        </div>
      </div>

      <div class="info-section">
        <h4>256-bit Target</h4>
        <div class="info-row">
          <span class="label">Target (hex):</span>
          <span class="value hash">${highlightTarget(info.target)}</span>
        </div>
        <div class="info-row">
          <span class="label">Leading zero bits:</span>
          <span class="value">${leadingZeroBits} bits (${Math.floor(leadingZeroBits/4)} hex zeros)</span>
        </div>
      </div>

      <div class="info-section">
        <h4>Mining Statistics</h4>
        <div class="info-row">
          <span class="label">Difficulty:</span>
          <span class="value highlight">${formatDifficulty(info.difficulty)}</span>
        </div>
        <div class="info-row">
          <span class="label">Expected hashes:</span>
          <span class="value">~${formatNumber(info.expectedHashes)} hashes</span>
        </div>
        <div class="info-row">
          <span class="label">Success probability:</span>
          <span class="value">${formatProbability(info.probability)} per hash</span>
        </div>
      </div>
    `;
  }
}

function updateMiningProgress(nonce: number, hash: string, stats: MiningStats, bits: number): void {
  const target = bitsToTarget(bits);
  const meetsTarget = hashMeetsTarget(hash, target);

  const progressEl = document.getElementById('mining-progress');
  if (progressEl) {
    progressEl.innerHTML = `
      <div class="info-row">
        <span class="label">Current Nonce:</span>
        <span class="value mono">${nonce.toLocaleString()} (0x${nonce.toString(16).padStart(8, '0')})</span>
      </div>
      <div class="info-row">
        <span class="label">Current Hash:</span>
        <span class="value hash ${meetsTarget ? 'valid-hash' : ''}">${highlightHash(hash, target)}</span>
      </div>
      <div class="info-row">
        <span class="label">Target:</span>
        <span class="value hash">${highlightTarget(target)}</span>
      </div>
      <div class="info-row">
        <span class="label">Hash < Target:</span>
        <span class="value ${meetsTarget ? 'success-text' : 'failure-text'}">${meetsTarget ? 'YES - Valid!' : 'NO - Keep mining...'}</span>
      </div>
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-label">Hashes</span>
          <span class="stat-value">${stats.hashesComputed.toLocaleString()}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Hash Rate</span>
          <span class="stat-value">${formatNumber(stats.hashRate)} H/s</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Elapsed</span>
          <span class="stat-value">${formatTime(stats.elapsedTime)}</span>
        </div>
      </div>
    `;
  }
}

function showResult(result: MiningResult, bits: number): void {
  const target = bitsToTarget(bits);
  const info = calculateDifficultyInfo(bits);

  const resultEl = document.getElementById('mining-result');
  if (resultEl) {
    if (result.success) {
      const efficiency = (info.expectedHashes / result.stats.hashesComputed * 100).toFixed(1);
      resultEl.innerHTML = `
        <div class="result success">
          <h3>Block Mined Successfully!</h3>
          <div class="result-details">
            <div class="info-row">
              <span class="label">Winning Nonce:</span>
              <span class="value mono">${result.nonce.toLocaleString()} (0x${result.nonce.toString(16).padStart(8, '0')})</span>
            </div>
            <div class="info-row">
              <span class="label">Block Hash:</span>
              <span class="value hash">${highlightHash(result.hash, target)}</span>
            </div>
            <div class="info-row">
              <span class="label">Target:</span>
              <span class="value hash">${highlightTarget(target)}</span>
            </div>
            <div class="info-row">
              <span class="label">nBits:</span>
              <span class="value mono">${info.bitsHex}</span>
            </div>
            <div class="info-row">
              <span class="label">Difficulty:</span>
              <span class="value">${formatDifficulty(info.difficulty)}</span>
            </div>
            <div class="info-row">
              <span class="label">Total Hashes:</span>
              <span class="value">${result.stats.hashesComputed.toLocaleString()}</span>
            </div>
            <div class="info-row">
              <span class="label">Time Taken:</span>
              <span class="value">${formatTime(result.stats.elapsedTime)}</span>
            </div>
            <div class="info-row">
              <span class="label">Average Hash Rate:</span>
              <span class="value">${formatNumber(result.stats.hashRate)} H/s</span>
            </div>
            <div class="info-row">
              <span class="label">Luck:</span>
              <span class="value">${efficiency}% (expected ~${formatNumber(info.expectedHashes)} hashes)</span>
            </div>
          </div>
        </div>
      `;
    } else {
      resultEl.innerHTML = `
        <div class="result failure">
          <h3>Mining Stopped</h3>
          <p>No valid hash found after ${result.stats.hashesComputed.toLocaleString()} attempts.</p>
        </div>
      `;
    }
  }
}

function addToHistory(result: MiningResult, bits: number, blockData: string): void {
  const historyEl = document.getElementById('mining-history');
  const info = calculateDifficultyInfo(bits);
  const target = bitsToTarget(bits);

  if (historyEl && result.success) {
    const entry = document.createElement('div');
    entry.className = 'history-entry';
    entry.innerHTML = `
      <div class="history-header">
        <span class="difficulty">Difficulty: ${formatDifficulty(info.difficulty)}</span>
        <span class="bits">${info.bitsHex}</span>
        <span class="time">${formatTime(result.stats.elapsedTime)}</span>
      </div>
      <div class="history-details">
        <div>Data: "${blockData.slice(0, 30)}${blockData.length > 30 ? '...' : ''}"</div>
        <div>Nonce: ${result.nonce.toLocaleString()}</div>
        <div>Hashes: ${result.stats.hashesComputed.toLocaleString()}</div>
        <div class="hash">${highlightHash(result.hash, target)}</div>
      </div>
    `;
    historyEl.insertBefore(entry, historyEl.firstChild);
  }
}

// ============================================================================
// Preset Difficulties
// ============================================================================

interface DifficultyPreset {
  name: string;
  bits: number;
  description: string;
}

const DIFFICULTY_PRESETS: DifficultyPreset[] = [
  {
    name: 'Very Easy',
    bits: 0x207fffff,
    description: 'Difficulty ~1 - For quick demos'
  },
  {
    name: 'Easy',
    bits: 0x1f00ffff,
    description: 'Difficulty ~256 - Usually finds in seconds'
  },
  {
    name: 'Medium',
    bits: 0x1e00ffff,
    description: 'Difficulty ~65K - May take a minute'
  },
  {
    name: 'Hard',
    bits: 0x1d00ffff,
    description: 'Genesis block difficulty - Takes several minutes'
  },
  {
    name: 'Very Hard',
    bits: 0x1c00ffff,
    description: 'Difficulty ~16M - May take 10+ minutes'
  }
];

// ============================================================================
// Event Handlers
// ============================================================================

let currentBits = DIFFICULTY_PRESETS[1].bits; // Start with "Easy"

async function startMining(): Promise<void> {
  if (isMining) return;

  const blockDataInput = document.getElementById('block-data') as HTMLInputElement;
  const startButton = document.getElementById('start-mining') as HTMLButtonElement;
  const stopButton = document.getElementById('stop-mining') as HTMLButtonElement;

  const blockData = blockDataInput.value || 'Alice pays Bob 1 BTC';

  // Generate random previous block hash
  const prevHashBytes = crypto.getRandomValues(new Uint8Array(32));
  const prevHash = bytesToHex(prevHashBytes);

  const header = createBlockHeader(blockData, prevHash, currentBits);

  isMining = true;
  shouldStopMining = false;
  startButton.disabled = true;
  stopButton.disabled = false;

  // Clear previous result
  const resultEl = document.getElementById('mining-result');
  if (resultEl) resultEl.innerHTML = '';

  const result = await mineBlock(
    header,
    (nonce, hash, stats) => updateMiningProgress(nonce, hash, stats, currentBits)
  );

  showResult(result, currentBits);
  addToHistory(result, currentBits, blockData);

  isMining = false;
  startButton.disabled = false;
  stopButton.disabled = true;
}

function stopMining(): void {
  shouldStopMining = true;
}

function selectPreset(bits: number): void {
  currentBits = bits;
  updateDifficultyInfo(bits);

  // Update preset button states
  document.querySelectorAll('.preset-btn').forEach(btn => {
    const btnBits = parseInt(btn.getAttribute('data-bits') || '0', 16);
    btn.classList.toggle('active', btnBits === bits);
  });

  // Update custom input
  const customInput = document.getElementById('custom-bits') as HTMLInputElement;
  if (customInput) {
    customInput.value = '0x' + bits.toString(16).padStart(8, '0');
  }
}

function applyCustomBits(): void {
  const customInput = document.getElementById('custom-bits') as HTMLInputElement;
  const value = customInput.value.trim();

  let bits: number;
  if (value.startsWith('0x')) {
    bits = parseInt(value, 16);
  } else {
    bits = parseInt(value);
  }

  if (isNaN(bits) || bits <= 0) {
    alert('Invalid bits value. Please enter a valid hexadecimal (0x...) or decimal number.');
    return;
  }

  currentBits = bits;
  updateDifficultyInfo(bits);

  // Deselect all presets
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.classList.remove('active');
  });
}

// ============================================================================
// Hash Demo
// ============================================================================

async function demonstrateSingleHash(): Promise<void> {
  const input = (document.getElementById('demo-input') as HTMLInputElement).value;
  const outputEl = document.getElementById('demo-output');

  if (outputEl && input) {
    const singleHash = await sha256String(input);
    const doubleHash = await doubleSha256String(input);
    const zeroBits = countLeadingZeroBits(doubleHash);

    outputEl.innerHTML = `
      <div class="demo-result">
        <div class="info-row">
          <span class="label">Input:</span>
          <span class="value">"${input}"</span>
        </div>
        <div class="info-row">
          <span class="label">SHA-256:</span>
          <span class="value hash mono">${singleHash}</span>
        </div>
        <div class="info-row">
          <span class="label">Double SHA-256:</span>
          <span class="value hash mono">${doubleHash}</span>
        </div>
        <div class="info-row">
          <span class="label">Leading zero bits:</span>
          <span class="value">${zeroBits}</span>
        </div>
      </div>
      <p class="demo-note">
        <strong>Avalanche effect:</strong> Change even one character and the entire hash changes unpredictably.
        Bitcoin uses double SHA-256 for all block hashing.
      </p>
    `;
  }
}

// ============================================================================
// Hash Comparison Demo
// ============================================================================

let selectedAlgorithms: HashAlgorithm[] = ['sha256', 'double-sha256', 'scrypt'];

function getSelectedAlgorithms(): HashAlgorithm[] {
  const checkboxes = document.querySelectorAll('#algorithm-checkboxes input[type="checkbox"]:checked');
  return Array.from(checkboxes).map(cb => (cb as HTMLInputElement).value as HashAlgorithm);
}

async function runHashComparison(): Promise<void> {
  const input = (document.getElementById('compare-input') as HTMLInputElement).value;
  const outputEl = document.getElementById('compare-output');
  const algorithms = getSelectedAlgorithms();

  if (!outputEl || !input || algorithms.length === 0) {
    if (outputEl) {
      outputEl.innerHTML = '<p class="error-text">Please enter text and select at least one algorithm.</p>';
    }
    return;
  }

  outputEl.innerHTML = '<p class="loading-text">Computing hashes...</p>';

  try {
    const results = await compareHashes(input, algorithms);

    // Sort by time for comparison
    const sortedByTime = [...results].sort((a, b) => a.timeMs - b.timeMs);
    const fastestTime = sortedByTime[0].timeMs;

    let html = `
      <div class="compare-results">
        <div class="compare-input-display">
          <span class="label">Input:</span>
          <span class="value">"${escapeHtml(input)}"</span>
        </div>
        <div class="compare-table-container">
          <table class="compare-table">
            <thead>
              <tr>
                <th>Algorithm</th>
                <th>Hash Output</th>
                <th>Time</th>
                <th>Bits</th>
                <th>Memory-Hard</th>
              </tr>
            </thead>
            <tbody>
    `;

    for (const result of results) {
      const info = HASH_ALGORITHMS[result.algorithm];
      const relativeSpeed = result.timeMs / fastestTime;
      const speedClass = relativeSpeed <= 1.5 ? 'fast' : relativeSpeed <= 10 ? 'medium' : 'slow';

      html += `
        <tr class="algo-row ${result.algorithm}">
          <td class="algo-name">
            <strong>${info.name}</strong>
            <span class="algo-usage">${info.usedBy}</span>
          </td>
          <td class="hash-output">
            <code class="hash-value">${result.hash}</code>
          </td>
          <td class="time-cell ${speedClass}">
            ${result.timeMs.toFixed(2)} ms
            ${relativeSpeed > 1 ? `<span class="relative-speed">(${relativeSpeed.toFixed(1)}x)</span>` : '<span class="relative-speed">(fastest)</span>'}
          </td>
          <td class="bits-cell">${result.outputBits}</td>
          <td class="memory-cell ${info.memoryHard ? 'yes' : 'no'}">
            ${info.memoryHard ? 'Yes' : 'No'}
          </td>
        </tr>
      `;
    }

    html += `
            </tbody>
          </table>
        </div>
        <div class="compare-summary">
          <h4>Key Differences</h4>
          <ul>
            <li><strong>SHA-256 vs Double SHA-256:</strong> Bitcoin uses double hashing to prevent length-extension attacks.</li>
            <li><strong>SHA-256 vs scrypt:</strong> scrypt is intentionally slow and memory-intensive, making it resistant to ASIC mining.</li>
            <li><strong>Memory-hard functions:</strong> Require significant RAM, making specialized hardware (ASICs) less effective.</li>
          </ul>
        </div>
      </div>
    `;

    outputEl.innerHTML = html;
  } catch (error) {
    outputEl.innerHTML = `<p class="error-text">Error computing hashes: ${error}</p>`;
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function runSpeedBenchmark(): Promise<void> {
  const outputEl = document.getElementById('benchmark-output');
  if (!outputEl) return;

  outputEl.innerHTML = '<p class="loading-text">Running benchmark (1000 iterations each)...</p>';

  const testData = 'Benchmark test data for hash comparison';
  const iterations = 1000;
  const results: { algorithm: HashAlgorithm; totalMs: number; avgMs: number; hashesPerSec: number }[] = [];

  // Only benchmark non-memory-hard algorithms with many iterations
  // scrypt would be too slow for 1000 iterations
  const fastAlgorithms: HashAlgorithm[] = ['sha256', 'double-sha256', 'sha512'];

  for (const algo of fastAlgorithms) {
    const startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
      await computeHash(testData + i, algo);
    }
    const endTime = performance.now();
    const totalMs = endTime - startTime;
    results.push({
      algorithm: algo,
      totalMs,
      avgMs: totalMs / iterations,
      hashesPerSec: (iterations / totalMs) * 1000
    });
  }

  // Run scrypt with fewer iterations
  const scryptIterations = 10;
  const scryptStart = performance.now();
  for (let i = 0; i < scryptIterations; i++) {
    await computeHash(testData + i, 'scrypt');
  }
  const scryptEnd = performance.now();
  const scryptTotalMs = scryptEnd - scryptStart;
  results.push({
    algorithm: 'scrypt',
    totalMs: scryptTotalMs,
    avgMs: scryptTotalMs / scryptIterations,
    hashesPerSec: (scryptIterations / scryptTotalMs) * 1000
  });

  // Sort by speed
  results.sort((a, b) => b.hashesPerSec - a.hashesPerSec);

  let html = `
    <div class="benchmark-results">
      <h4>Benchmark Results</h4>
      <table class="benchmark-table">
        <thead>
          <tr>
            <th>Algorithm</th>
            <th>Avg Time/Hash</th>
            <th>Hashes/Second</th>
            <th>Relative Speed</th>
          </tr>
        </thead>
        <tbody>
  `;

  const fastestRate = results[0].hashesPerSec;

  for (const r of results) {
    const info = HASH_ALGORITHMS[r.algorithm];
    const relativeSpeed = r.hashesPerSec / fastestRate;
    const speedBar = Math.max(5, Math.min(100, relativeSpeed * 100));

    html += `
      <tr>
        <td><strong>${info.name}</strong></td>
        <td>${r.avgMs.toFixed(3)} ms</td>
        <td>${formatNumber(r.hashesPerSec)} H/s</td>
        <td>
          <div class="speed-bar-container">
            <div class="speed-bar" style="width: ${speedBar}%"></div>
            <span class="speed-label">${(relativeSpeed * 100).toFixed(1)}%</span>
          </div>
        </td>
      </tr>
    `;
  }

  html += `
        </tbody>
      </table>
      <p class="benchmark-note">
        <strong>Note:</strong> scrypt is intentionally ~${(results[0].hashesPerSec / results.find(r => r.algorithm === 'scrypt')!.hashesPerSec).toFixed(0)}x slower than SHA-256.
        This is by design to resist hardware acceleration attacks (ASICs).
      </p>
    </div>
  `;

  outputEl.innerHTML = html;
}

// ============================================================================
// Initialization
// ============================================================================

function createPresetButtons(): void {
  const container = document.getElementById('preset-buttons');
  if (!container) return;

  DIFFICULTY_PRESETS.forEach((preset, index) => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn' + (index === 1 ? ' active' : '');
    btn.setAttribute('data-bits', '0x' + preset.bits.toString(16));
    btn.innerHTML = `
      <span class="preset-name">${preset.name}</span>
      <span class="preset-bits">0x${preset.bits.toString(16).padStart(8, '0')}</span>
    `;
    btn.title = preset.description;
    btn.addEventListener('click', () => selectPreset(preset.bits));
    container.appendChild(btn);
  });
}

function init(): void {
  // Create preset buttons
  createPresetButtons();

  // Initial difficulty info
  updateDifficultyInfo(currentBits);

  // Mining buttons
  const startButton = document.getElementById('start-mining');
  const stopButton = document.getElementById('stop-mining');

  if (startButton) {
    startButton.addEventListener('click', startMining);
  }

  if (stopButton) {
    stopButton.addEventListener('click', stopMining);
    (stopButton as HTMLButtonElement).disabled = true;
  }

  // Custom bits
  const applyBitsBtn = document.getElementById('apply-bits');
  if (applyBitsBtn) {
    applyBitsBtn.addEventListener('click', applyCustomBits);
  }

  const customInput = document.getElementById('custom-bits') as HTMLInputElement;
  if (customInput) {
    customInput.value = '0x' + currentBits.toString(16).padStart(8, '0');
    customInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') applyCustomBits();
    });
  }

  // Demo hash
  const demoButton = document.getElementById('demo-hash');
  if (demoButton) {
    demoButton.addEventListener('click', demonstrateSingleHash);
  }

  const demoInput = document.getElementById('demo-input');
  if (demoInput) {
    demoInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') demonstrateSingleHash();
    });
  }

  // Hash comparison
  const compareButton = document.getElementById('compare-hashes');
  if (compareButton) {
    compareButton.addEventListener('click', runHashComparison);
  }

  const compareInput = document.getElementById('compare-input');
  if (compareInput) {
    compareInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') runHashComparison();
    });
  }

  // Benchmark button
  const benchmarkButton = document.getElementById('run-benchmark');
  if (benchmarkButton) {
    benchmarkButton.addEventListener('click', runSpeedBenchmark);
  }
}

document.addEventListener('DOMContentLoaded', init);
