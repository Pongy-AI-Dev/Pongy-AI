import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import crypto from 'node:crypto';
import yauzl from 'yauzl';
const cli=path.resolve('pongx/bin/pongx.js');
const source=fs.readFileSync(cli,'utf8');
test('PongX launches and reports its version without requiring credentials',()=>{const r=spawnSync(process.execPath,[cli,'--version'],{encoding:'utf8'});assert.equal(r.status,0);assert.match(r.stdout,/PongX 0\.1\.0/);});
test('PongX help documents workspace, file context, undo and test workflows',()=>{const r=spawnSync(process.execPath,[cli,'--help'],{encoding:'utf8'});assert.equal(r.status,0);for(const command of ['/open','/new','/files','/read','/undo','/test'])assert(r.stdout.includes(command));});
test('PongX protects credentials, skips sensitive folders and blocks workspace traversal',()=>{assert(source.includes('Create a Pongy API key for PongX? [y/N]'));assert(source.includes('ConvertFrom-SecureString'));assert(source.includes('ConvertTo-SecureString'));assert(source.includes("'.git'"));assert(source.includes("'.env'"));assert(source.includes("'.ssh'"));assert(source.includes("if(!inside(root,full))"));assert(source.includes('isSymbolicLink()'));});
test('PongX requires approval before writing and keeps rollback backups outside the workspace',()=>{assert(source.includes("Apply these changes to the selected project? [y/N]"));assert(source.includes('const backup=backupRoot()'));assert(source.includes('function backupRoot()'));assert(source.includes('async function undo()'));});
test('PongX test runner only executes the fixed npm test/check scripts',()=>{assert(source.includes("tasks=['test','check'].filter"));assert(!source.includes('execSync('));assert(!source.includes('exec('));});

test('PongX release ZIP contains the exact current sources and matches its SHA-256 manifest',async()=>{
 const manifest=JSON.parse(fs.readFileSync('public/downloads/releases.json','utf8')),release=manifest.files.pongx,archive=fs.readFileSync(path.join('public/downloads',release.name));
 assert.equal(archive.subarray(0,4).toString('hex'),'504b0304');
 assert.equal(archive.length,release.bytes);
 assert.equal(crypto.createHash('sha256').update(archive).digest('hex'),release.sha256);
 const entries=await new Promise((resolve,reject)=>{
  yauzl.fromBuffer(archive,{lazyEntries:true,validateEntrySizes:true},(error,zip)=>{
   if(error)return reject(error);const result=new Map();zip.on('error',reject);zip.on('entry',entry=>{
    if(entry.fileName.startsWith('/')||entry.fileName.includes('..')||entry.fileName.includes('\\')){zip.close();return reject(new Error('Unsafe PongX ZIP path'));}
    zip.openReadStream(entry,(err,stream)=>{if(err){zip.close();return reject(err)}const chunks=[];stream.on('data',chunk=>chunks.push(chunk));stream.on('error',reject);stream.on('end',()=>{result.set(entry.fileName,Buffer.concat(chunks));zip.readEntry()})});
   });zip.on('end',()=>resolve(result));zip.readEntry();
  });
 });
 const expected=['bin/pongx.js','Install-PongX.ps1','package.json','PongX.cmd','README.md'];
 assert.deepEqual([...entries.keys()].sort(),[...expected].sort());
 for(const name of expected)assert.deepEqual(entries.get(name),fs.readFileSync(path.join('pongx',...name.split('/'))),name+' is stale in the release ZIP');
});
