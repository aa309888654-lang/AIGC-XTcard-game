import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "vite";

const server = await createServer({ appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
try {
  const { CARD_POOL } = await server.ssrLoadModule("/src/data/cards.ts");
  const dir = join(process.cwd(), "public", "assets", "cards");
  mkdirSync(dir, { recursive: true });

  // 最小合法 PNG（1x1 纯色，占位用，非美术图）
  function crc32(buf) {
    let c, table = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    let crc = 0xffffffff;
    for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeBuf = Buffer.from(type, "ascii");
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }
  function placeholderPng(hexColor) {
    const rgb = [parseInt(hexColor.slice(1, 3), 16), parseInt(hexColor.slice(3, 5), 16), parseInt(hexColor.slice(5, 7), 16)];
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(1, 0);
    ihdr.writeUInt32BE(1, 4);
    ihdr[8] = 8; ihdr[9] = 2; // 8-bit, RGB
    const idat = Buffer.concat([Buffer.from([0]), Buffer.from(rgb)]);
    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr),
      chunk("IDAT", idat),
      chunk("IEND", Buffer.alloc(0)),
    ]);
  }

  let created = 0;
  for (const card of CARD_POOL) {
    const file = join(dir, `${card.id}.png`);
    if (!existsSync(file)) {
      writeFileSync(file, placeholderPng(card.color ?? "#888888"));
      created += 1;
    }
  }
  console.log(`占位卡图：新增 ${created} 张，现有 ${CARD_POOL.length} 张全部就位`);
} finally {
  await server.close();
}
