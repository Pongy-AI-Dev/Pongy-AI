import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../server.js';
import {loadConfig} from '../lib/config.js';

test('local developer test login exposes a one-time code only when explicitly enabled on loopback',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pongy-local-dev-auth-'));
 const runtime=createApp({config:loadConfig({DATA_DIR:dir,JWT_SECRET:'local-dev-auth-secret-'.repeat(3),SESSION_SECRET:'local-dev-auth-session-'.repeat(3),FRONTEND_URL:'http://127.0.0.1:3187',PONGY_LOCAL_DEV_AUTH:'true',NODE_ENV:'development'},dir)});
 const server=runtime.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+server.address().port;
 async function req(url,body){return fetch(base+url,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify(body)});}
 try{
  const config=await fetch(base+'/api/config');const configData=await config.json();assert.equal(Object.hasOwn(configData,'developerLoginEmails'),false);assert.equal(configData.localDeveloperAuth,true);
  const local=await req('/api/local-developer/session',{});assert.equal(local.status,200);const localData=await local.json();assert.equal(localData.authenticated,true);assert.equal(localData.user.developer,true);assert.equal(localData.user.adminGuest,true);
  const start=await req('/api/admin-guest/start',{email:'notion.app.login@gmail.com'});assert.equal(start.status,200);const sent=await start.json();assert.equal(sent.localOnly,true);assert.match(sent.localCode,/^[0-9]{6}$/);
  const verify=await req('/api/admin-guest/verify',{email:'notion.app.login@gmail.com',code:sent.localCode});assert.equal(verify.status,200);const data=await verify.json();assert.equal(data.user.developer,true);assert.equal(data.user.adminGuest,true);
  const replay=await req('/api/admin-guest/verify',{email:'notion.app.login@gmail.com',code:sent.localCode});assert.equal(replay.status,400,'one-time code cannot be replayed');
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));runtime.close();fs.rmSync(dir,{recursive:true,force:true});}
});

test('production never returns a local developer code even when the flag is set',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pongy-local-dev-auth-prod-'));
 const runtime=createApp({config:loadConfig({DATA_DIR:dir,JWT_SECRET:'local-dev-prod-secret-'.repeat(3),SESSION_SECRET:'local-dev-prod-session-'.repeat(3),FRONTEND_URL:'https://127.0.0.1',PONGY_LOCAL_DEV_AUTH:'true',NODE_ENV:'production'},dir)});
 const server=runtime.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 try{const local=await fetch(base+'/api/local-developer/session',{method:'POST',headers:{Origin:'https://127.0.0.1','Content-Type':'application/json'},body:'{}'});assert.equal(local.status,404);const response=await fetch(base+'/api/admin-guest/start',{method:'POST',headers:{Origin:'https://127.0.0.1','Content-Type':'application/json'},body:JSON.stringify({email:'notion.app.login@gmail.com'})});assert.equal(response.status,503);assert.equal((await response.json()).localCode,undefined);}
 finally{server.closeAllConnections();await new Promise(r=>server.close(r));runtime.close();fs.rmSync(dir,{recursive:true,force:true});}
});
