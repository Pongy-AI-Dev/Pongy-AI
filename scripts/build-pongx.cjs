'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const yazl=require('yazl');
const {pipeline}=require('node:stream/promises');

const root=path.resolve(__dirname,'..');
const project=path.join(root,'pongx');
const version=JSON.parse(fs.readFileSync(path.join(project,'package.json'),'utf8')).version;
if(!/^\d+\.\d+\.\d+$/.test(version))throw new Error('Invalid PongX version');
const name=`PongX-${version}-windows-x64.zip`;
const output=path.join(root,'public','downloads',name);
const temporary=output+'.'+process.pid+'.tmp';
const entries=['bin/pongx.js','Install-PongX.ps1','package.json','PongX.cmd','README.md'];
const zip=new yazl.ZipFile();
for(const relative of entries){
 const file=path.join(project,...relative.split('/'));
 if(!fs.existsSync(file)||!fs.statSync(file).isFile())throw new Error('Missing PongX package file: '+relative);
 zip.addFile(file,relative,{mtime:new Date('2026-01-01T00:00:00.000Z'),mode:0o100644});
}
zip.end();
(async()=>{
 try{
  await pipeline(zip.outputStream,fs.createWriteStream(temporary,{flags:'wx'}));
  const bytes=fs.readFileSync(temporary);
  if(!bytes.subarray(0,4).equals(Buffer.from('504b0304','hex')))throw new Error('Invalid ZIP signature');
  fs.renameSync(temporary,output);
  const manifestPath=path.join(root,'public','downloads','releases.json');
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  manifest.files.pongx={name,version,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};
  fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,1)+String.fromCharCode(10));
  console.log('Built PongX archive from '+entries.length+' current source files: '+name);
  console.log('SHA-256: '+manifest.files.pongx.sha256);
 }catch(error){try{fs.rmSync(temporary,{force:true})}catch{};throw error;}
})().catch(error=>{console.error(error);process.exitCode=1});
