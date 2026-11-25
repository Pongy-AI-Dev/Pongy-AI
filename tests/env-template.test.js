import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const template = fs.readFileSync(new URL('../.env.example', import.meta.url), 'utf8');

test('environment template has unique keys and correct safe defaults', () => {
  const entries = template.split(/\r?\n/).filter(line => /^[A-Z][A-Z0-9_]*=/.test(line));
  const keys = entries.map(line => line.slice(0, line.indexOf('=')));
  const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
  assert.deepEqual(duplicates, []);
  assert(entries.includes('MAX_OUTPUT_TOKENS=16384'));
  assert.equal(entries.some(line => line.startsWith('MAX_OUTPUT_TOKENS=8192')), false);
  assert(entries.includes('FEEDBACK_EMAIL=pongy.support@gmail.com'));
});
