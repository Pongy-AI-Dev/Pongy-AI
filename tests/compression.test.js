import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {gunzipSync} from 'node:zlib';
import bcrypt from 'bcryptjs';
import {createApp} from '../server.js';
import {loadConfig} from '../lib/config.js';

async function startFixture(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pongy-compression-'));
  const config=loadConfig({DATA_DIR:dir,JWT_SECRET:'compression-jwt-'.repeat(4),SESSION_SECRET:'compression-session-'.repeat(4)},dir);
  const runtime=createApp({config});
  runtime.db.prepare('INSERT INTO users(email,password,email_verified) VALUES(?,?,1)').run('pongy.support@gmail.com',bcrypt.hashSync('fixture-password',4));
  const server=await new Promise(resolve=>{const value=runtime.app.listen(0,'127.0.0.1',()=>resolve(value));});
  const base='http://127.0.0.1:'+server.address().port;
  const request=(route,{method='GET',headers={},body}={})=>new Promise((resolve,reject)=>{
    const req=http.request(base+route,{method,headers},res=>{
      const chunks=[];
      res.on('data',chunk=>chunks.push(chunk));
      res.on('error',reject);
      res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));
    });
    req.on('error',reject);
    if(body)req.write(body);
    req.end();
  });
  return {runtime,server,request,base,close(){server.closeAllConnections();server.close();runtime.close();fs.rmSync(dir,{recursive:true,force:true});}};
}

test('large static HTML is gzip-compressed and decompresses byte-for-byte to the source',async()=>{
  const fixture=await startFixture();
  try{
    const response=await fixture.request('/',{headers:{'Accept-Encoding':'gzip'}});
    assert.equal(response.status,200);
    assert.equal(response.headers['content-encoding'],'gzip');
    const original=fs.readFileSync('public/index.html');
    const decoded=gunzipSync(response.body);
    assert.deepEqual(decoded,original);
    assert(response.body.length<original.length*.6,'gzip should materially reduce the HTML transfer size');
  }finally{fixture.close();}
});

test('server-sent AI events stay uncompressed when Cache-Control says no-transform',async()=>{
  const fixture=await startFixture();
  try{
    const login=await fixture.request('/api/login',{method:'POST',headers:{Origin:fixture.base,'Content-Type':'application/json'},body:JSON.stringify({email:'pongy.support@gmail.com',password:'fixture-password'})});
    assert.equal(login.status,200);
    const cookie=String(login.headers['set-cookie']?.[0]||'').split(';')[0];
    assert(cookie);
    const response=await fixture.request('/api/chat',{method:'POST',headers:{Origin:fixture.base,Cookie:cookie,'Content-Type':'application/json','Accept-Encoding':'gzip'},body:JSON.stringify({locale:'en',messages:[{role:'user',content:'Open Developer settings'}]})});
    assert.equal(response.status,200);
    assert.equal(response.headers['content-encoding'],undefined);
    assert.match(response.headers['cache-control']||'/',/no-transform/);
    const text=response.body.toString('utf8');
    assert.match(text,/event: site_action/);
    assert.match(text,/\[DONE\]/);
  }finally{fixture.close();}
});

test('API, auth, MCP and OpenAI-compatible routes are excluded from response compression',async()=>{const fixture=await startFixture();try{const response=await fixture.request('/api/config',{headers:{'Accept-Encoding':'gzip'}});assert.equal(response.status,200);assert.equal(response.headers['content-encoding'],undefined);assert.doesNotThrow(()=>JSON.parse(response.body.toString('utf8')));}finally{fixture.close();}});
