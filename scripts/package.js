// PACKAGE: builds dist/git-autopsy-extension.zip, ready to share ("Load unpacked" after unzipping,
// or upload to the Chrome Web Store).
//
// Usage:
//   npm run package -- --backend https://your-app.vercel.app     (recommended: your deployed backend)
//   npm run package                                              (keeps http://localhost:3000, for local use)
//
// The zip contains only the extension folder. No secrets: the AI key and GitHub token stay on the server.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const EXT = path.join(ROOT, 'extension');
const DIST = path.join(ROOT, 'dist');

// ---------- tiny zip writer (deflate, no dependencies) ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(d = new Date()) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

/** files: [{ name: 'manifest.json', data: Buffer }] -> zip Buffer */
function makeZip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  const { time, date } = dosDateTime();
  for (const f of files) {
    const name = Buffer.from(f.name.replace(/\\/g, '/'), 'utf8');
    const compressed = zlib.deflateRawSync(f.data, { level: 9 });
    const useDeflate = compressed.length < f.data.length;
    const body = useDeflate ? compressed : f.data;
    const crc = crc32(f.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(useDeflate ? 8 : 0, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(f.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(useDeflate ? 8 : 0, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(f.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += local.length + name.length + body.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}

/** Reads a zip made by makeZip (used by tests and the fresh-install check). -> { name: Buffer } */
function readZip(buf) {
  const files = {};
  const endAt = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = buf.readUInt16LE(endAt + 10);
  let p = buf.readUInt32LE(endAt + 16);
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localAt = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const dataAt = localAt + 30 + buf.readUInt16LE(localAt + 26) + buf.readUInt16LE(localAt + 28);
    const raw = buf.subarray(dataAt, dataAt + size);
    files[name] = method === 8 ? zlib.inflateRawSync(raw) : Buffer.from(raw);
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

function listFiles(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, base));
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out.sort();
}

/** Builds the zip. Returns { file, backend, files }. */
function buildPackage({ backend = 'http://localhost:3000', outDir = DIST } = {}) {
  const url = new URL(backend); // throws on a bad URL
  const backendUrl = url.origin + url.pathname.replace(/\/$/, '');
  const files = listFiles(EXT).map((name) => {
    let data = fs.readFileSync(path.join(EXT, name));
    if (name === 'background.js') {
      const src = data.toString('utf8');
      const replaced = src.replace(/const DEFAULT_BACKEND = '[^']*';/, `const DEFAULT_BACKEND = '${backendUrl}';`);
      if (replaced === src && !src.includes(`'${backendUrl}'`)) throw new Error('Could not set the backend URL in background.js');
      data = Buffer.from(replaced, 'utf8');
    }
    if (name === 'manifest.json') {
      const manifest = JSON.parse(data.toString('utf8'));
      const pattern = `${url.origin}/*`;
      const covered = manifest.host_permissions.some((h) => {
        const re = new RegExp('^' + h.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
        return re.test(`${url.origin}/`);
      });
      if (!covered) manifest.host_permissions.push(pattern);
      data = Buffer.from(JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    }
    return { name, data };
  });
  fs.mkdirSync(outDir, { recursive: true });
  const version = JSON.parse(fs.readFileSync(path.join(EXT, 'manifest.json'), 'utf8')).version;
  const zip = makeZip(files);
  const file = path.join(outDir, 'git-autopsy-extension.zip');
  fs.writeFileSync(file, zip);
  fs.writeFileSync(path.join(outDir, `git-autopsy-extension-v${version}.zip`), zip);
  return { file, backend: backendUrl, files: files.map((f) => f.name), bytes: zip.length };
}

if (require.main === module) {
  const i = process.argv.indexOf('--backend');
  const backend = i !== -1 ? process.argv[i + 1] : process.env.EXTENSION_BACKEND_URL || 'http://localhost:3000';
  const r = buildPackage({ backend });
  console.log(`Built ${r.file} (${(r.bytes / 1024).toFixed(0)} KB, ${r.files.length} files)`);
  console.log(`Backend URL inside the extension: ${r.backend}`);
  if (/localhost|127\.0\.0\.1/.test(r.backend)) {
    console.log('NOTE: this zip talks to a backend on YOUR computer. To share it with friends, deploy the backend and run:');
    console.log('      npm run package -- --backend https://<your-app>.vercel.app');
  }
}

module.exports = { buildPackage, makeZip, readZip, crc32 };
