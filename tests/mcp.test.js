import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import {createApp} from '../server.js';
import {loadConfig} from '../lib/config.js';
import Database from 'better-sqlite3';
import {createUserApi} from '../lib/user-api.js';
import {userCompletion} from '../lib/user-api-request.js';
test('MCP uses a rotatable secret token and exposes Pongy ask_pongy over stateless HTTP',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pongy-mcp-')),aiCalls=[],runtime=createApp({
  config:loadConfig({DATA_DIR:dir,PUBLIC_API_ORIGIN:'https://api.example.test',GEMINI_ENABLED:'true',GEMINI_API_KEY:'fixture-google-private',JWT_SECRET:'fixture-mcp-jwt-'.repeat(3),SESSION_SECRET:'fixture-mcp-session-'.repeat(3)},dir),
  fetchImpl:async(url,options)=>{
   aiCalls.push({url,options});
   return new Response('data: '+JSON.stringify({choices:[{delta:{content:'Pongy MCP response.'},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n');
  }
 });
 test('Inception is listed in provider-name order and its returned models sort by ID',async()=>{
  const db=new Database(':memory:'),calls=[],api=createUserApi({db,config:{jwtSecret:'catalog-test-secret'},fetchImpl:async(url,options)=>{calls.push({url,options});return Response.json({data:[{id:'mercury-3'},{id:'mercury-1'}]});}});
  try{
   const providers=api.providers();assert.equal(providers.length,20);assert(providers.some(provider=>provider.id==='inception'));assert.deepEqual(providers.map(provider=>provider.name),providers.map(provider=>provider.name).slice().sort((a,b)=>a.localeCompare(b,undefined,{sensitivity:'base'})));
   const models=await api.models('inception','fixture-inception-key-123456');assert.deepEqual(models.map(model=>model.id),['mercury-1','mercury-3']);assert.equal(calls[0].url,'https://api.inceptionlabs.ai/v1/models');assert(calls[0].options.headers.Authorization.startsWith('Bearer '));
   const request=userCompletion({userApi:{provider:'inception',key:'inception-private-key',model:'mercury-3'},maxOutputTokens:500},[],[],'chat');assert.equal(request.url,'https://api.inceptionlabs.ai/v1/chat/completions');assert.equal(request.options.headers.Authorization,'Bearer inception-private-key');
  }finally{db.close();}
 });
 test('Pongy API keys authenticate OpenAI-compatible completions and revoke immediately',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pongy-api-key-')),calls=[],runtime=createApp({
   config:loadConfig({DATA_DIR:dir,GEMINI_ENABLED:'true',GEMINI_API_KEY:'fixture-google-private',JWT_SECRET:'fixture-api-key-jwt-'.repeat(3),SESSION_SECRET:'fixture-api-key-session-'.repeat(3)},dir),
   fetchImpl:async(url,options)=>{calls.push({url,options});return new Response('data: '+JSON.stringify({choices:[{delta:{content:'Answer from the Pongy API.'},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n');}
  });
  runtime.db.prepare('INSERT INTO users(email,password,email_verified) VALUES(?,?,1)').run('api-key-user@example.test',bcrypt.hashSync('fixture-password',4));
  const server=runtime.app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const base='http://127.0.0.1:'+server.address().port;
  const req=(url,body,options={})=>fetch(base+url,{method:options.method|| (body?'POST':'GET'),headers:{Origin:base,'Content-Type':'application/json',...(options.headers||{})},body:body?JSON.stringify(body):undefined});
  try{
   const login=await req('/api/login',{email:'api-key-user@example.test',password:'fixture-password'});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0],auth={headers:{Cookie:cookie}};
   assert.equal((await req('/api/api-key',undefined,auth)).status,200);
   const created=await req('/api/api-key',{},auth),first=await created.json();assert.equal(created.status,200);assert.match(first.token,/^pongy_api_[A-Za-z0-9_-]{43}$/);assert.equal(first.endpoint,'http://localhost:3000/v1/chat/completions');
   const saved=runtime.db.prepare('SELECT token_hash FROM api_keys WHERE user_id=(SELECT id FROM users WHERE email=?)').get('api-key-user@example.test');assert.notEqual(saved.token_hash,first.token);assert.equal(saved.token_hash.length,64);
   const body={model:'pongy-ai',messages:[{role:'user',content:'Give one benefit of a short walk.'}]};
   assert.equal((await req('/v1/chat/completions',body,{headers:{Authorization:'Bearer invalid'}})).status,401);
   const completed=await req('/v1/chat/completions',body,{headers:{Authorization:'Bearer '+first.token}});assert.equal(completed.status,200);const response=await completed.json();assert.equal(response.object,'chat.completion');assert.equal(response.choices[0].message.content,'Answer from the Pongy API.');assert.equal(calls[0].url,'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
   const rotated=await req('/api/api-key',{},auth),second=await rotated.json();assert.notEqual(first.token,second.token);assert.equal((await req('/v1/chat/completions',body,{headers:{Authorization:'Bearer '+first.token}})).status,401);
   const streamed=await req('/v1/chat/completions',{...body,stream:true},{headers:{Authorization:'Bearer '+second.token}});assert.equal(streamed.status,200);assert.match(await streamed.text(),/data: \[DONE\]/);
   assert.equal((await req('/api/api-key',undefined,{...auth,method:'DELETE'})).status,200);assert.equal((await req('/v1/chat/completions',body,{headers:{Authorization:'Bearer '+second.token}})).status,401);
  }finally{await new Promise(resolve=>server.close(resolve));await runtime.close();fs.rmSync(dir,{recursive:true,force:true});}
 });
 runtime.db.prepare('INSERT INTO users(email,password,email_verified) VALUES(?,?,1)').run('mcp-user@example.test',bcrypt.hashSync('fixture-password',4));
 const server=runtime.app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const base='http://127.0.0.1:'+server.address().port;
 async function request(url,body,cookie,method='POST',headers={}){return fetch(base+url,{method,headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie||'',...headers},body:body?JSON.stringify(body):undefined});}
 try{
  const login=await request('/api/login',{email:'mcp-user@example.test',password:'fixture-password'});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
  const initial=await request('/api/mcp/token',undefined,cookie,'GET');assert.equal((await initial.json()).connected,false);
  const generated=await request('/api/mcp/token',{},cookie);assert.equal(generated.status,200);const first=await generated.json();assert.match(first.token,/^pongy_[A-Za-z0-9_-]{43}$/);assert.equal(first.endpoint,'https://api.example.test/mcp');
  const stored=runtime.db.prepare('SELECT token_hash FROM mcp_tokens WHERE user_id=(SELECT id FROM users WHERE email=?)').get('mcp-user@example.test').token_hash;assert.notEqual(stored,first.token);assert.equal(stored.length,64);
  const tools=await request('/mcp',{jsonrpc:'2.0',id:1,method:'tools/list',params:{}},'', 'POST',{Authorization:'Bearer '+first.token,Accept:'application/json, text/event-stream'});assert.equal(tools.status,200);assert.match(await tools.text(),/ask_pongy/);
  const rotated=await request('/api/mcp/token',{},cookie);const second=await rotated.json();assert.notEqual(second.token,first.token);
  assert.equal((await request('/mcp',{jsonrpc:'2.0',id:2,method:'tools/list',params:{}},'','POST',{Authorization:'Bearer '+first.token,Accept:'application/json, text/event-stream'})).status,401);
  const ask=await request('/mcp',{jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'ask_pongy',arguments:{prompt:'Explain one benefit of regular breaks.'}}},'','POST',{Authorization:'Bearer '+second.token,Accept:'application/json, text/event-stream'});assert.equal(ask.status,200);const askBody=await ask.text();assert.match(askBody,/Pongy MCP response\./);assert.equal(aiCalls[0].url,'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');assert.equal(aiCalls[0].options.headers.Authorization,'Bearer fixture-google-private');assert.equal(runtime.db.prepare('SELECT n FROM message_daily WHERE account=?').get('mcp-user@example.test').n,1);
  runtime.db.prepare('UPDATE message_daily SET n=100 WHERE account=?').run('mcp-user@example.test');const limited=await request('/mcp',{jsonrpc:'2.0',id:4,method:'tools/call',params:{name:'ask_pongy',arguments:{prompt:'A different question about daily limits.'}}},'','POST',{Authorization:'Bearer '+second.token,Accept:'application/json, text/event-stream'});assert.match(await limited.text(),/DAILY_LIMIT/);assert.equal(aiCalls.length,1);
  assert.equal((await request('/api/mcp/token',{},cookie,'DELETE')).status,200);assert.equal((await request('/mcp',{jsonrpc:'2.0',id:5,method:'tools/list',params:{}},'','POST',{Authorization:'Bearer '+second.token,Accept:'application/json, text/event-stream'})).status,401);
 }finally{await new Promise(resolve=>server.close(resolve));await runtime.close();fs.rmSync(dir,{recursive:true,force:true});}
});
