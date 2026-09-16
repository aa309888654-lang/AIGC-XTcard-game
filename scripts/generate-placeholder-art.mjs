import { deflateSync } from "node:zlib";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const cardSource = readFileSync(join(root, "src", "data", "cards.ts"), "utf8");
const matches = [...cardSource.matchAll(/unit\(\{ id: "([^"]+)",[^\r\n]*?color: "#([0-9A-Fa-f]{6})"/g)].map((m) => ({ id: m[1], color: m[2] }));
const spellMatches = [...cardSource.matchAll(/spell\(\{ id: "([^"]+)",[^\r\n]*?color: "#([0-9A-Fa-f]{6})"/g)].map((m) => ({ id: m[1], color: m[2] }));
const weaponMatches = [...cardSource.matchAll(/weapon\(\{ id: "([^"]+)",[^\r\n]*?color: "#([0-9A-Fa-f]{6})"/g)].map((m) => ({ id: m[1], color: m[2] }));
const cards = [...matches, ...spellMatches, ...weaponMatches];

const SIZE = 512;
const outDir = join(root, "public", "assets", "cards");
mkdirSync(outDir, { recursive: true });

function rgbaChunk(width, height, data) {
  const length = 4 * width * height + height;
  const chunk = Buffer.alloc(length);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * width * 4;
    chunk[y * (width * 4 + 1)] = 0;
    data.copy(chunk, y * (width * 4 + 1) + 1, rowStart, rowStart + width * 4);
  }
  return chunk;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let k = 0; k < 8; k += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function makePng(hex) {
  const base = [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  const pixels = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y += 1) {
    const t = y / (SIZE - 1);
    const shade = Math.round(1 - 0.55 * t);
    for (let x = 0; x < SIZE; x += 1) {
      const offset = (y * SIZE + x) * 4;
      const vignette = 1 - 0.35 * Math.min(1, Math.sqrt((x - SIZE / 2) ** 2 + (y - SIZE / 2) ** 2) / (SIZE / 2));
      pixels[offset] = Math.max(0, Math.min(255, Math.round(base[0] * shade * vignette)));
      pixels[offset + 1] = Math.max(0, Math.min(255, Math.round(base[1] * shade * vignette)));
      pixels[offset + 2] = Math.max(0, Math.min(255, Math.round(base[2] * shade * vignette)));
      pixels[offset + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const scanlines = rgbaChunk(SIZE, SIZE, pixels);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(scanlines)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

let created = 0;
let skipped = 0;
for (const card of cards) {
  const target = join(outDir, `${card.id}.png`);
  if (existsSync(target)) {
    skipped += 1;
    continue;
  }
  writeFileSync(target, makePng(card.color));
  created += 1;
}
console.log(`已生成 ${created} 张占位卡面（跳过已有 ${skipped} 张）：${cards.filter((card) => !existsSync(join(outDir, `${card.id}.png`))).map((card) => card.id).join(", ")}`);
