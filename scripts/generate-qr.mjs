/**
 * generate-qr.mjs
 *
 * Generates a QR code PNG for https://www.sachylysice.cz
 * Pure Node.js — zero external dependencies.
 *
 * Usage: node scripts/generate-qr.mjs
 * Output: src/assets/images/qr-sachylysice.png
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(__dirname, "..", "src", "assets", "images", "qr-sachylysice.png");

const URL_DATA = "https://www.sachylysice.cz";
const MODULE_SIZE = 10; // pixels per QR module
const QUIET_ZONE = 2; // modules of white border
const FG = [26, 26, 26]; // #1a1a1a
const BG = [255, 255, 255]; // #ffffff

// ─── QR Code generation (Version 2, Error Correction L, Byte mode) ───

// GF(256) arithmetic for Reed-Solomon
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 256) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
}

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(nsym) {
  let g = [1];
  for (let i = 0; i < nsym; i++) {
    const ng = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      ng[j] ^= g[j];
      ng[j + 1] ^= gfMul(g[j], GF_EXP[i]);
    }
    g = ng;
  }
  return g;
}

function rsEncode(data, nsym) {
  const gen = rsGeneratorPoly(nsym);
  const out = new Array(data.length + nsym).fill(0);
  for (let i = 0; i < data.length; i++) out[i] = data[i];
  for (let i = 0; i < data.length; i++) {
    const coef = out[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        out[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return out.slice(data.length);
}

// Encode data as QR byte-mode codewords
function encodeData(text) {
  const bytes = Buffer.from(text, "utf-8");
  const bits = [];

  // Mode indicator: Byte (0100)
  bits.push(0, 1, 0, 0);
  // Character count (8 bits for version 1-9 byte mode)
  for (let i = 7; i >= 0; i--) bits.push((bytes.length >> i) & 1);
  // Data
  for (const b of bytes) {
    for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  }
  // Terminator
  for (let i = 0; i < 4 && bits.length < 272; i++) bits.push(0);
  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);

  // Convert to codewords
  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let val = 0;
    for (let j = 0; j < 8; j++) val = (val << 1) | (bits[i + j] || 0);
    codewords.push(val);
  }

  // Pad to total data codewords (Version 2-L: 34 data codewords)
  const totalData = 34;
  const padBytes = [0xec, 0x11];
  let pi = 0;
  while (codewords.length < totalData) {
    codewords.push(padBytes[pi % 2]);
    pi++;
  }

  return codewords;
}

function buildQR(text) {
  // Version 2: 25x25, EC level L -> 10 EC codewords
  const size = 25;
  const ecCodewords = 10;
  const data = encodeData(text);
  const ec = rsEncode(data, ecCodewords);
  const allCodewords = [...data, ...ec];

  // Convert to bit stream
  const bitstream = [];
  for (const cw of allCodewords) {
    for (let i = 7; i >= 0; i--) bitstream.push((cw >> i) & 1);
  }

  // Create module grid (-1 = unset, 0 = white, 1 = black)
  const grid = Array.from({ length: size }, () => new Int8Array(size).fill(-1));
  const reserved = Array.from({ length: size }, () => new Uint8Array(size));

  // Place finder patterns
  function placeFinder(row, col) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row + r, cc = col + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const isBlack =
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        grid[rr][cc] = isBlack ? 1 : 0;
        reserved[rr][cc] = 1;
      }
    }
  }
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Place alignment pattern (Version 2: center at 6,18 / 18,6 / 18,18)
  function placeAlignment(row, col) {
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const isBlack = Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
        grid[row + r][col + c] = isBlack ? 1 : 0;
        reserved[row + r][col + c] = 1;
      }
    }
  }
  // Version 2 alignment pattern positions: [6, 18]
  const alignPos = [6, 18];
  for (const r of alignPos) {
    for (const c of alignPos) {
      // Skip if overlapping finder
      if (reserved[r][c]) continue;
      placeAlignment(r, c);
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    grid[6][i] = i % 2 === 0 ? 1 : 0;
    reserved[6][i] = 1;
    grid[i][6] = i % 2 === 0 ? 1 : 0;
    reserved[i][6] = 1;
  }

  // Dark module
  grid[size - 8][8] = 1;
  reserved[size - 8][8] = 1;

  // Reserve format info areas
  for (let i = 0; i < 15; i++) {
    // Around top-left finder
    if (i < 6) { reserved[8][i] = 1; reserved[i][8] = 1; }
    else if (i === 6) { reserved[8][7] = 1; reserved[7][8] = 1; }
    else if (i === 7) { reserved[8][8] = 1; reserved[8][8] = 1; }
    else if (i === 8) { reserved[8][8] = 1; reserved[size - 7][8] = 1; }
    // Right of top-left and below top-left
    if (i < 8) {
      reserved[8][size - 1 - (7 - i)] = 1; // though some overlap
    }
    if (i >= 7) {
      reserved[size - 1 - (14 - i)][8] = 1;
    }
  }

  // Place data bits
  let bitIdx = 0;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // skip timing column
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);
    for (const row of rows) {
      for (const col of [right, right - 1]) {
        if (reserved[row][col]) continue;
        grid[row][col] = bitIdx < bitstream.length ? bitstream[bitIdx] : 0;
        bitIdx++;
      }
    }
    upward = !upward;
  }

  // Apply mask pattern 0: (row + col) % 2 === 0
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!reserved[r][c] && grid[r][c] !== -1) {
        if ((r + c) % 2 === 0) grid[r][c] ^= 1;
      }
    }
  }

  // Place format info (L level, mask 0)
  // Pre-computed: EC level L (01) + mask 0 (000) = 01000
  // After BCH: 011010101011111 (reversed for QR spec, with XOR mask 101010000010010)
  // Format string for L-0: 111011111000100
  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];

  // Place around top-left
  for (let i = 0; i < 6; i++) grid[8][i] = formatBits[i];
  grid[8][7] = formatBits[6];
  grid[8][8] = formatBits[7];
  grid[7][8] = formatBits[8];
  for (let i = 9; i < 15; i++) grid[14 - i][8] = formatBits[i];

  // Place along edges
  for (let i = 0; i < 8; i++) grid[size - 1 - i][8] = formatBits[i];
  for (let i = 8; i < 15; i++) grid[8][size - 15 + i] = formatBits[i];

  return { grid, size };
}

// ─── PNG encoder (minimal, uncompressed) ───

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}

function adler32(buf) {
  let a = 1, b = 0;
  for (let i = 0; i < buf.length; i++) {
    a = (a + buf[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function deflateStore(data) {
  // Wrap raw data in zlib format with store-only (no compression)
  // Split into 65535-byte blocks
  const blocks = [];
  const maxBlock = 65535;
  for (let i = 0; i < data.length; i += maxBlock) {
    const chunk = data.subarray(i, Math.min(i + maxBlock, data.length));
    const isLast = i + maxBlock >= data.length ? 1 : 0;
    const len = chunk.length;
    const nlen = len ^ 0xffff;
    const header = Buffer.alloc(5);
    header[0] = isLast;
    header.writeUInt16LE(len, 1);
    header.writeUInt16LE(nlen, 3);
    blocks.push(header, chunk);
  }

  const deflated = Buffer.concat(blocks);
  const adler = adler32(data);

  // Zlib wrapper: CMF + FLG + deflated + adler32
  const cmf = 0x78; // deflate, window 32k
  const flg = 0x01; // check bits so (cmf*256 + flg) % 31 === 0
  const out = Buffer.alloc(2 + deflated.length + 4);
  out[0] = cmf;
  out[1] = flg;
  deflated.copy(out, 2);
  out.writeUInt32BE(adler, 2 + deflated.length);
  return out;
}

function createPNG(width, height, rgbData) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeAndData = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData));
    return Buffer.concat([len, typeAndData, crc]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw image data with filter byte (0 = None) per row
  const rowSize = 1 + width * 3;
  const raw = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    raw[y * rowSize] = 0; // filter: None
    rgbData.copy(raw, y * rowSize + 1, y * width * 3, (y + 1) * width * 3);
  }

  const compressed = deflateStore(raw);
  const idatChunk = chunk("IDAT", compressed);
  const ihdrChunk = chunk("IHDR", ihdr);
  const iendChunk = chunk("IEND", Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// ─── Main ───

const { grid, size } = buildQR(URL_DATA);
const totalSize = (size + QUIET_ZONE * 2) * MODULE_SIZE;
const pixels = Buffer.alloc(totalSize * totalSize * 3);

for (let py = 0; py < totalSize; py++) {
  for (let px = 0; px < totalSize; px++) {
    const mx = Math.floor(px / MODULE_SIZE) - QUIET_ZONE;
    const my = Math.floor(py / MODULE_SIZE) - QUIET_ZONE;
    const isBlack = mx >= 0 && mx < size && my >= 0 && my < size && grid[my][mx] === 1;
    const color = isBlack ? FG : BG;
    const idx = (py * totalSize + px) * 3;
    pixels[idx] = color[0];
    pixels[idx + 1] = color[1];
    pixels[idx + 2] = color[2];
  }
}

const png = createPNG(totalSize, totalSize, pixels);

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, png);
console.log(`QR code generated: ${OUTPUT} (${totalSize}x${totalSize}px)`);
