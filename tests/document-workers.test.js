import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

test('PDF and DOCX text extraction works in isolated bounded processes', () => {
  const script = `
    const fs = require('node:fs');
    (async () => {
      const {extractFile} = await import('./lib/files.js');
      const results = [];
      for (const name of ['text.pdf', 'text.docx']) {
        const source = fs.readFileSync('./tests/fixtures/' + name);
        const file = await extractFile({originalname: name, buffer: source});
        results.push({original: file.original, mime: file.mime, text: file.text, base64: file.base64});
      }
      process.stdout.write(JSON.stringify(results));
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `;
  const run = spawnSync(process.execPath, ['-e', script], {
    cwd: process.cwd(), encoding: 'utf8', timeout: 30000, windowsHide: true, maxBuffer: 8 * 1024 * 1024
  });
  assert.equal(run.status, 0, run.stderr || ('Document worker process exited: ' + run.status));
  const results = JSON.parse(run.stdout);
  assert.equal(results.length, 2);
  for (const [index, name] of ['text.pdf', 'text.docx'].entries()) {
    const source = fs.readFileSync(new URL('./fixtures/' + name, import.meta.url));
    const file = results[index];
    assert.equal(file.original, true);
    assert.equal(file.mime, name.endsWith('pdf')
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    assert.match(file.text, name.endsWith('pdf') ? /Readable PDF fixture/ : /Привет из DOCX/);
    assert.deepEqual(Buffer.from(file.base64, 'base64'), source);
  }
});
