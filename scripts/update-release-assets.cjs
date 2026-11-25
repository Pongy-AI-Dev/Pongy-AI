'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const version = require(path.join(root, 'package.json')).version;
const manifestPath = path.join(root, 'public', 'downloads', 'releases.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function asset(name, versionValue) {
  const filePath = path.join(root, 'public', 'downloads', name);
  const bytes = fs.readFileSync(filePath);
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  fs.writeFileSync(filePath + '.sha256', sha256 + '  ' + name + '\n', 'utf8');
  return {name, version: versionValue, sha256, bytes: bytes.length};
}

manifest.version = version;
manifest.files.windows = asset('Pongy-AI-' + version + '-windows-x64.msi', version);
manifest.files.android = asset('Pongy-AI-' + version + '-android.apk', version);
const pongxVersion = require(path.join(root, 'pongx', 'package.json')).version;
manifest.files.pongx = asset('PongX-' + pongxVersion + '-windows-x64.zip', pongxVersion);

if (!manifest.androidCertificate) throw new Error('Published Android signing certificate is missing');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log('Updated release metadata for ' + version);
for (const [platform, file] of Object.entries(manifest.files)) {
  console.log(platform + ': ' + file.name + ' (' + file.bytes + ' bytes, SHA-256 ' + file.sha256 + ')');
}
