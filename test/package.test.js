// Tests for the extension packaging (the zip a friend installs).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { buildPackage, readZip, makeZip, crc32 } = require('../scripts/package');

test('crc32 matches the standard check value', () => {
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
});

test('zip round-trips (stored and deflated entries)', () => {
  const files = [
    { name: 'a.txt', data: Buffer.from('hello hello hello hello hello') },
    { name: 'dir/b.bin', data: zlib.deflateRawSync(Buffer.from('already compressed')) },
  ];
  const back = readZip(makeZip(files));
  assert.deepEqual(Object.keys(back), ['a.txt', 'dir/b.bin']);
  assert.ok(back['a.txt'].equals(files[0].data));
  assert.ok(back['dir/b.bin'].equals(files[1].data));
});

test('package: zip has the whole extension, the deployed backend URL, and no secrets', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'pkg-'));
  try {
    const r = buildPackage({ backend: 'https://gitdragon.vercel.app/', outDir: out });
    const files = readZip(fs.readFileSync(r.file));
    for (const f of ['manifest.json', 'background.js', 'content.js', 'dragon.js', 'pageDetect.js', 'mascot/dragon-idle.mp4', 'mascot/dragon-fire.mp4', 'icons/icon128.png']) {
      assert.ok(files[f], `${f} is in the zip`);
    }
    const bg = files['background.js'].toString('utf8');
    assert.match(bg, /const DEFAULT_BACKEND = 'https:\/\/gitdragon\.vercel\.app';/);
    const manifest = JSON.parse(files['manifest.json'].toString('utf8'));
    assert.ok(manifest.host_permissions.includes('https://*.vercel.app/*'), 'vercel.app already allowed: nothing added');
    assert.ok(files['mascot/dragon-idle.mp4'].equals(fs.readFileSync(path.join(__dirname, '..', 'extension', 'mascot', 'dragon-idle.mp4'))), 'videos are byte-identical');
    for (const [name, data] of Object.entries(files)) {
      if (/\.(js|json)$/.test(name)) assert.doesNotMatch(data.toString('utf8'), /github_pat_|ghp_[A-Za-z0-9]{20}|AIza[0-9A-Za-z_-]{20}|gsk_|sk-or-v1/, `${name} has no secrets`);
    }
    // the source extension folder is left unchanged
    assert.match(fs.readFileSync(path.join(__dirname, '..', 'extension', 'background.js'), 'utf8'), /const DEFAULT_BACKEND = 'http:\/\/localhost:3000';/);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('package: a custom domain is added to host_permissions automatically', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'pkg-'));
  try {
    const r = buildPackage({ backend: 'https://api.gitdragon.dev', outDir: out });
    const manifest = JSON.parse(readZip(fs.readFileSync(r.file))['manifest.json'].toString('utf8'));
    assert.ok(manifest.host_permissions.includes('https://api.gitdragon.dev/*'));
    assert.throws(() => buildPackage({ backend: 'not a url', outDir: out }));
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});
