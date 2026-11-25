import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {createApp} from '../server.js';
import {loadConfig} from '../lib/config.js';
test('brand assets have correct dimensions and ICO sizes',async()=>{
 const main=await sharp('public/favicon.png').metadata(),small=await sharp('public/app-logo-192.png').metadata(),apple=await sharp('public/apple-touch-icon.png').metadata();
 assert.equal(main.width,512);assert.equal(main.height,512);assert.equal(small.width,192);assert.equal(small.height,192);assert.equal(apple.width,180);assert.equal(apple.height,180);
 const ico=fs.readFileSync('public/favicon.ico');assert.equal(ico.readUInt16LE(0),0);assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),6);
 assert.deepEqual(Array.from({length:6},(_,i)=>ico[6+i*16]||256),[16,32,48,64,128,256]);
});
test('all brand surfaces reference one asset and head exposes browser/touch icons',()=>{
 const html=fs.readFileSync('public/index.html','utf8'),js=fs.readFileSync('public/app.js','utf8');
 assert.match(html,/href="\/app-logo-192\.png" rel="icon" sizes="192x192"/);assert.match(html,/og:image" content="https:\/\/pongy-ai\.devs\.surf\/favicon\.png"/);assert.match(html,/href="\/favicon\.ico"/);assert.match(html,/rel="apple-touch-icon"/);
 assert.match(js,/function logo\(\).*src="\/app-logo-192\.png"/);assert(!js.includes('pongy-gradient-'));assert(!js.includes('var LOGO='));
});
test('public scripts do not evaluate strings',()=>{
 const files=['public/app.js','public/app-config.js','public/persistence.js','public/vendor/purify.min.js','public/index.html'];
 for(const file of files){const code=fs.readFileSync(file,'utf8');assert(!/\beval\s*\(|\bnew\s+Function\s*\(|\bFunction\s*\(|set(?:Timeout|Interval)\s*\(\s*["'`]/.test(code),file+' contains dynamic evaluation');}
});
test('icons and robots are public; script CSP remains strict',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pongy-brand-'));
 const runtime=createApp({config:loadConfig({DATA_DIR:dir,JWT_SECRET:'test-jwt-secret-'.repeat(3),SESSION_SECRET:'test-session-secret-'.repeat(3)},dir)});
 const server=await new Promise(r=>{const s=runtime.app.listen(0,'127.0.0.1',()=>r(s))}),base='http://127.0.0.1:'+server.address().port;
 try{
  for(const asset of ['/app-logo-192.png','/favicon.png','/favicon.ico','/apple-touch-icon.png','/robots.txt']){const res=await fetch(base+asset);assert.equal(res.status,200,asset);assert((await res.arrayBuffer()).byteLength>0,asset);}
  const home=await fetch(base),csp=home.headers.get('content-security-policy');assert.match(csp,/script-src 'self';/);assert(!csp.includes('unsafe-eval'));assert.match(csp,/script-src-attr 'none'/);
  const robots=await(await fetch(base+'/robots.txt')).text();assert.match(robots,/Allow: \//);assert(!robots.includes('Disallow: /favicon'));
 }finally{await new Promise(r=>server.close(r));runtime.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('welcome icon has true alpha transparency and intro has no comparison',async()=>{
 const icon=await sharp('public/welcome-logo.png').metadata();assert.equal(icon.width,256);assert.equal(icon.height,256);assert.equal(icon.hasAlpha,true);
 const {data,info}=await sharp('public/welcome-logo.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.channels,4);assert.equal(data[3],0);assert.equal(data[data.length-1],0);let visible=0,clear=0;for(let i=3;i<data.length;i+=4){if(data[i]>0)visible++;else clear++}assert(visible>10000);assert(clear>20000);
 const js=fs.readFileSync('public/app.js','utf8');assert(!/Verity/i.test(js));assert(js.includes('Чем могу помочь?'));assert(js.includes('How can I help?'));
});

test('browser and touch PNG icons use the transparent welcome mark; ICO dimensions are validated separately',async()=>{for(const name of ['favicon.png','app-logo-192.png','apple-touch-icon.png']){const {data,info}=await sharp('public/'+name).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.channels,4);assert.equal(data[3],0,name);assert.equal(data[data.length-1],0,name);const expected=await sharp('public/welcome-logo.png').resize(info.width,info.height).ensureAlpha().raw().toBuffer();assert.equal(data.compare(expected),0,name)}});
