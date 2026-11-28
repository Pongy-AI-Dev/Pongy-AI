import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import crypto from 'node:crypto';
import yauzl from 'yauzl';

const cli = path.resolve('pongx/bin/pongx.js');
const source = fs.readFileSync(cli, 'utf8');
const pongxVersion = JSON.parse(fs.readFileSync('pongx/package.json', 'utf8')).version;

test('PongX launches and reports its version without requiring credentials', () => {
  const result = spawnSync(process.execPath, [cli, '--version'], {encoding: 'utf8'});
  assert.equal(result.status, 0);
  assert.match(result.stdout, new RegExp('PongX '+pongxVersion.replaceAll('.', '\\.' )));
});

test('PongX help documents workspace, file context, undo and test workflows', () => {
  const result = spawnSync(process.execPath, [cli, '--help'], {encoding: 'utf8'});
  assert.equal(result.status, 0);
  for (const command of ['/open', '/new', '/files', '/read', '/undo', '/test']) {
    assert(result.stdout.includes(command));
  }
});

test('PongX protects credentials, skips sensitive folders and blocks workspace traversal', () => {
  assert(source.includes('Create a Pongy API key for PongX? [y/N]'));
  assert(source.includes('ConvertFrom-SecureString'));
  assert(source.includes('ConvertTo-SecureString'));
  assert(source.includes("'.git'"));
  assert(source.includes("'.env'"));
  assert(source.includes("'.ssh'"));
  assert(source.includes('if(!inside(root,full))'));
  assert(source.includes('isSymbolicLink()'));
});

test('PongX requires approval before writing and keeps rollback backups outside the workspace', () => {
  assert(source.includes('Apply these changes to the selected project? [y/N]'));
  assert(source.includes('const backup=backupRoot()'));
  assert(source.includes('function backupRoot()'));
  assert(source.includes('async function undo()'));
});

test('PongX test runner only executes fixed npm test/check scripts without a shell', () => {
  assert(source.includes("tasks=['test','check'].filter"));
  assert(source.includes('function resolveNpmCli()'));
  assert(source.includes("spawnSync(process.execPath,[npmCli,'run',task]"));
  assert(source.includes('shell:false'));
  assert(!source.includes("shell:process.platform==='win32'"));
  assert(!source.includes('execSync('));
  assert(!source.includes('exec('));
});

test('the resolved npm CLI is executable directly by Node without a shell', () => {
  const candidates = [
    process.env.npm_execpath,
    path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.resolve(path.dirname(process.execPath), '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ];
  const npmCli = candidates.find(value => typeof value === 'string' && value.trim() && path.basename(value).toLowerCase() === 'npm-cli.js' && fs.existsSync(value));
  assert(npmCli, 'npm-cli.js could not be resolved from the active Node/npm installation');
  const result = spawnSync(process.execPath, [npmCli, '--version'], {encoding: 'utf8', shell: false});
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout.trim(), /^\d+\.\d+\.\d+/);
});

test('PongX release ZIP contains the exact current sources and matches its SHA-256 manifest', async () => {
  const manifest = JSON.parse(fs.readFileSync('public/downloads/releases.json', 'utf8'));
  const release = manifest.files.pongx;
  const archive = fs.readFileSync(path.join('public/downloads', release.name));

  assert.equal(archive.subarray(0, 4).toString('hex'), '504b0304');
  assert.equal(archive.length, release.bytes);
  assert.equal(crypto.createHash('sha256').update(archive).digest('hex'), release.sha256);

  const entries = await new Promise((resolve, reject) => {
    yauzl.fromBuffer(archive, {lazyEntries: true, validateEntrySizes: true}, (error, zip) => {
      if (error) return reject(error);
      const result = new Map();
      zip.on('error', reject);
      zip.on('entry', entry => {
        if (entry.fileName.startsWith('/') || entry.fileName.includes('..') || entry.fileName.includes('\\')) {
          zip.close();
          return reject(new Error('Unsafe PongX ZIP path'));
        }
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError) {
            zip.close();
            return reject(streamError);
          }
          const chunks = [];
          stream.on('data', chunk => chunks.push(chunk));
          stream.on('error', reject);
          stream.on('end', () => {
            result.set(entry.fileName, Buffer.concat(chunks));
            zip.readEntry();
          });
        });
      });
      zip.on('end', () => resolve(result));
      zip.readEntry();
    });
  });

  const expected = ['bin/pongx.js', 'Install-PongX.ps1', 'package.json', 'PongX.cmd', 'README.md'];
  assert.deepEqual([...entries.keys()].sort(), [...expected].sort());
  for (const name of expected) {
    assert.deepEqual(entries.get(name), fs.readFileSync(path.join('pongx', ...name.split('/'))), name + ' is stale in the release ZIP');
  }
});
