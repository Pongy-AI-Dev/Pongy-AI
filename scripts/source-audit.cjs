'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function references(root,files,pkg){
 const errors=[],present=new Set(files);
 const check=(target,owner)=>{if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile())errors.push('Missing local dependency: '+path.relative(root,target)+' (referenced by '+owner+')')};
 for(const [name,command] of Object.entries(pkg.scripts||{})){
  for(const match of command.matchAll(/(?:^|\s|["'])([^\s"';&|]+\.(?:cjs|mjs|js))(?=$|\s|["';&|])/g)){
   if(!/[?*]/.test(match[1]))check(path.resolve(root,match[1]),'npm script '+name);
  }
 }
 for(const file of files.filter(f=>f==='server.js'||/^lib\/.*\.(?:js|mjs|cjs)$/.test(f))){
  const source=fs.readFileSync(path.join(root,file),'utf8');
  const base=file==='lib/server.js'&&pkg.main==='server.js'?'':path.dirname(file);
  for(const m of source.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)['"](\.{1,2}\/[^'"?#]+)['"]/g))check(path.resolve(root,base,m[1]),file);
  for(const m of source.matchAll(/\bnew\s+URL\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*,\s*import\.meta\.url\s*\)/g))check(path.resolve(root,base,m[1]),file);
 }
 return [...new Set(errors)];
}
function releaseIntegrity(root,files){
 const manifest=path.join(root,'MANIFEST.sha256'),errors=[],seen=new Set();
 if(!fs.existsSync(manifest))return ['Missing release manifest: MANIFEST.sha256'];
 for(const line of fs.readFileSync(manifest,'utf8').split(/\r?\n/).filter(Boolean)){
  const m=line.match(/^([a-f0-9]{64})  (.+)$/);
  if(!m){errors.push('Invalid release manifest entry');continue;}
  const name=m[2],target=path.resolve(root,name);
  if(seen.has(name)||name==='MANIFEST.sha256'||!target.startsWith(root+path.sep)){errors.push('Invalid or duplicate release manifest path: '+name);continue;}
  seen.add(name);
  if(!files.includes(name)){errors.push('Release file missing: '+name);continue;}
  if(crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex')!==m[1])errors.push('Release file differs (mixed version or local edit): '+name);
 }
 for(const file of files)if(file!=='MANIFEST.sha256'&&!seen.has(file))errors.push('File is not in release manifest: '+file);
 return errors;
}
module.exports={references,releaseIntegrity};
function secretIssues(file,source){
 const errors=[];
 if(/\bAIza[A-Za-z0-9_-]{35}\b/.test(source)||/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(source)||/\bsk-or-v1-[a-f0-9]{40,}\b/i.test(source)||/\bsk-[a-f0-9]{32,64}\b/i.test(source)||/\bgithub_pat_[A-Za-z0-9_]{60,}\b/.test(source)||/\bgh[pousr]_[A-Za-z0-9]{36,}\b/.test(source))errors.push('Possible credential in '+file+' (value withheld)');
 if(file==='.env.example')for(const line of source.split(/\r?\n/))if(/^\s*[A-Z][A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD)\s*=\s*[^\s#]/.test(line))errors.push('Environment template contains a nonempty credential setting (value withheld)');
 return [...new Set(errors)];
}
module.exports.secretIssues=secretIssues;
