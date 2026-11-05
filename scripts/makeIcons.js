// Generates the extension icons (simple PNGs) without any image library.
// Usage: node scripts/makeIcons.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const c = (size - 1) / 2, r = size / 2;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const i = y * (size * 4 + 1) + 1 + x * 4;
      const d = Math.hypot(x - c, y - c);
      const bar = size * 0.12;
      const inCross = (Math.abs(x - c) < bar && Math.abs(y - c) < r * 0.55) || (Math.abs(y - c) < bar && Math.abs(x - c) < r * 0.55);
      let col = [0, 0, 0, 0];
      if (d <= r) col = inCross ? [255, 255, 255, 255] : [207, 34, 46, 255];
      raw.set(col, i);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
for (const s of [16, 48, 128]) fs.writeFileSync(path.join(__dirname, '..', 'extension', 'icons', `icon${s}.png`), png(s));
console.log('icons written');
