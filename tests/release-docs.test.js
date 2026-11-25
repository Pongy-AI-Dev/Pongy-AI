import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const version = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
const pongxVersion = JSON.parse(fs.readFileSync('pongx/package.json', 'utf8')).version;

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

test('web, native installers and download metadata all use the current release', () => {
  const readme = fs.readFileSync('README.md', 'utf8');
  const releases = fs.readFileSync('RELEASES.md', 'utf8');
  const changes = fs.readFileSync('CHANGELOG.md', 'utf8');
  const downloads = JSON.parse(fs.readFileSync('public/downloads/releases.json', 'utf8'));

  assert.equal(version, '0.29.4');
  assert(readme.includes('Windows MSI 0.29.4 (unsigned)'));
  assert(readme.includes('Android APK 0.29.4'));
  assert(releases.includes('Windows MSI: 0.29.4 (unsigned)'));
  assert(releases.includes('Android APK: 0.29.4'));
  assert(changes.includes(version));
  assert(changes.split('\n').find(line => line.startsWith('## ')).startsWith('## ' + version + ' '));
  assert.equal(downloads.version, version);
  assert.deepEqual(Object.keys(downloads.files).sort(), ['android', 'pongx', 'windows']);

  for (const platform of ['windows', 'android', 'pongx']) {
    const file = downloads.files[platform];
    const bytes = fs.readFileSync(path.join('public/downloads', file.name));
    assert.equal(file.version, platform === 'pongx' ? pongxVersion : version);
    if (platform === 'pongx') assert.equal(file.name, 'PongX-' + pongxVersion + '-windows-x64.zip');
    assert.equal(file.bytes, bytes.length, platform + ' byte count');
    assert.equal(file.sha256, sha256(bytes), platform + ' SHA-256');
  }

  assert.equal(downloads.files.windows.name, 'Pongy-AI-0.29.4-windows-x64.msi');
  assert.equal(downloads.files.android.name, 'Pongy-AI-0.29.4-android.apk');
  const legacyPongx = fs.readFileSync('public/downloads/PongX-0.1.0-windows-x64.zip');
  assert.equal(legacyPongx.length, 9099);
  assert.equal(sha256(legacyPongx), '635e80503bd556777097ce59d0b401db4c87886962c5d13dc693efc2f890bdf4');
  assert.equal(JSON.parse(fs.readFileSync('public/release-notes.json', 'utf8')).version, version);
});

test('older release history and patch documents remain available', () => {
  for (const name of ['CHANGELOG.md', 'RELEASES.md']) {
    const source = fs.readFileSync(name, 'utf8');
    for (const oldVersion of ['0.23.0', '0.23.1', '0.24.0', '0.24.1', '0.24.2', '0.24.3', '0.25.0', '0.26.0', '0.26.1', '0.22.2']) {
      assert(source.includes('## ' + oldVersion), name + ' ' + oldVersion);
    }
  }
  assert(fs.existsSync('docs/releases/PATCH-0.23.0.md'));
  assert(fs.existsSync('docs/releases/PATCH-0.26.0-voice-mode.md'));
  assert(fs.readFileSync('docs/releases/PATCH-0.26.0-voice-mode.md', 'utf8').includes('0.26.0'));
});

test('voice activation offers the current extension ZIP matching every source file', async () => {
  const extensionVersion = '0.29.4';
  const file = 'public/extensions/Pongy-Wake-Focus-' + extensionVersion + '.zip';
  const html = fs.readFileSync('public/index.html', 'utf8');

  assert(html.includes('href="/extensions/Pongy-Wake-Focus-' + extensionVersion + '.zip"'));
  assert(html.includes('download="Pongy-Wake-Focus-' + extensionVersion + '.zip"'));

  const entries = await new Promise((resolve, reject) => {
    require('yauzl').open(file, {lazyEntries: true}, (error, zip) => {
      if (error) return reject(error);
      const output = {};
      zip.on('error', reject);
      zip.on('end', () => resolve(output));
      zip.on('entry', entry => {
        assert(!entry.fileName.includes('/') && !entry.fileName.includes('..'));
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError) return reject(streamError);
          const chunks = [];
          stream.on('error', reject);
          stream.on('data', chunk => chunks.push(chunk));
          stream.on('end', () => {
            output[entry.fileName] = Buffer.concat(chunks);
            zip.readEntry();
          });
        });
      });
      zip.readEntry();
    });
  });

  const sourceDir = 'native/browser-focus';
  assert.deepEqual(Object.keys(entries).sort(), fs.readdirSync(sourceDir).sort());
  for (const [name, bytes] of Object.entries(entries)) {
    assert.deepEqual(bytes, fs.readFileSync(path.join(sourceDir, name)));
  }

  const manifest = JSON.parse(entries['manifest.json']);
  assert.equal(manifest.version, extensionVersion);
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.deepEqual(manifest.host_permissions, ['https://pongy-ai.devs.surf/*']);

  const id = [...crypto.createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest().subarray(0, 16)]
    .flatMap(byte => [byte >> 4, byte & 15])
    .map(nibble => String.fromCharCode(97 + nibble))
    .join('');
  assert(fs.readFileSync('public/focus-bridge.js', 'utf8').includes(id));
});

test('browser UI uses the compact 192px logo while preserving the full-size social and native icon',()=>{const html=fs.readFileSync('public/index.html','utf8'),app=fs.readFileSync('public/app.js','utf8'),logo=fs.readFileSync('public/app-logo-192.png');assert(html.includes('src="/app-logo-192.png"'));assert(html.includes('href="/app-logo-192.png" rel="icon" sizes="192x192"'));assert(app.includes('src="/app-logo-192.png"'));assert.equal(logo.readUInt32BE(16),192);assert.equal(logo.readUInt32BE(20),192);assert(logo.length<50000);assert(fs.statSync('public/favicon.png').size>logo.length*4);});
