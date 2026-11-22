import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {loadConfig} from '../lib/config.js';

test('cloud history encryption key is generated once and survives JWT secret rotation',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pongy-history-key-'));
 try{
  const first=loadConfig({DATA_DIR:dir},dir),stored=JSON.parse(fs.readFileSync(path.join(dir,'secrets.json'),'utf8'));
  assert.equal(first.historyEncryptionKey,stored.HISTORY_ENCRYPTION_KEY);
  assert(first.historyEncryptionKey.length>=32);
  const rotated=loadConfig({DATA_DIR:dir,JWT_SECRET:'replacement-jwt-secret-'.repeat(3),SESSION_SECRET:'replacement-session-secret-'.repeat(3)},dir);
  assert.equal(rotated.jwtSecret,'replacement-jwt-secret-'.repeat(3));
  assert.equal(rotated.historyEncryptionKey,first.historyEncryptionKey);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('explicit history encryption key is accepted only at the required strength',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pongy-history-key-env-'));
 try{
  const key='explicit-history-encryption-key-'.repeat(2);
  assert.equal(loadConfig({DATA_DIR:dir,HISTORY_ENCRYPTION_KEY:key},dir).historyEncryptionKey,key);
  assert.throws(()=>loadConfig({DATA_DIR:dir,HISTORY_ENCRYPTION_KEY:'too-short'},dir),/HISTORY_ENCRYPTION_KEY/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
