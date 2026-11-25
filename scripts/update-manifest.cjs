'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const excluded=new Set(['.git','node_modules','data','.ci-logs','.quality-logs','artifacts','playwright-report','test-results']);
function walk(dir){
 return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  if(excluded.has(entry.name))return[];
  const absolute=path.join(dir,entry.name);
  const relative=path.relative(root,absolute).split(path.sep).join('/');
  if(entry.isSymbolicLink()||entry.isDirectory()&&/^native\/[^/]+\/build$/.test(relative))return[];
  if(entry.isDirectory())return walk(absolute);
  return entry.isFile()&&!entry.name.endsWith('.encoding-backup')&&relative!=='MANIFEST.sha256'?[relative]:[];
 });
}
const files=walk(root).sort();
const lines=files.map(file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')+'  '+file);
fs.writeFileSync(path.join(root,'MANIFEST.sha256'),lines.join('\n')+'\n','utf8');
console.log('Updated MANIFEST.sha256 with '+lines.length+' files.');
