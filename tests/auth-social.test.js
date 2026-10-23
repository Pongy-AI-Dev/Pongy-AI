import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../server.js';
import {loadConfig} from '../lib/config.js';

async function fixture(provider,fetchImpl){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pongy-social-'));
 const env={DATA_DIR:dir,JWT_SECRET:'social-jwt-secret-'.repeat(3),SESSION_SECRET:'social-session-secret-'.repeat(3),[provider.toUpperCase()+'_CLIENT_ID']:'client-id',[provider.toUpperCase()+'_CLIENT_SECRET']:'client-secret'};
 const config=loadConfig(env,dir),runtime=createApp({config,fetchImpl}),server=await new Promise(resolve=>{const value=runtime.app.listen(0,'127.0.0.1',()=>resolve(value));});
 config[provider+'Callback']='http://127.0.0.1:'+server.address().port+'/auth/'+provider+'/callback';
 const base='http://127.0.0.1:'+server.address().port;
 return {base,config,runtime,server,async close(){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));runtime.close();fs.rmSync(dir,{recursive:true,force:true});}};
}
function cookie(response,name){const value=response.headers.getSetCookie().find(item=>item.startsWith(name+'='));assert(value,'missing '+name+' cookie');return value.split(';',1)[0];}
async function callback(f,provider){
 const start=await fetch(f.base+'/auth/'+provider,{redirect:'manual'});assert.equal(start.status,302);
 const authorize=new URL(start.headers.get('location'));const state=authorize.searchParams.get('state');
 assert(state&&state.length>=32,'OAuth state missing or too short');
 const session=cookie(start,'pongy_oauth_state'),result=await fetch(f.base+'/auth/'+provider+'/callback?code=fixture-code&state='+encodeURIComponent(state),{headers:{Cookie:session},redirect:'manual'});
 assert.equal(result.status,302);assert.match(result.headers.get('location'),new RegExp('oauth_login='+provider));
 const sessionCookie=cookie(result,'pongy_session');
 const me=await fetch(f.base+'/api/me',{headers:{Cookie:sessionCookie}});
 assert.equal(me.status,200);return me.json();
}

test('GitHub OAuth verifies a primary email, links the account and signs in',async()=>{
 const f=await fixture('github',async(url)=>{
  if(String(url).includes('github.com/login/oauth/access_token'))return Response.json({access_token:'github-access-token'});
  if(String(url).includes('api.github.com/user/emails'))return Response.json([{email:'linked@example.test',primary:true,verified:true},{email:'unverified@example.test',primary:false,verified:false}]);
  if(String(url).includes('api.github.com/user'))return Response.json({id:98765,name:'Pongy User',avatar_url:'https://avatars.example.test/user.png'});
  throw new Error('Unexpected OAuth URL: '+url);
 });
 try{
  const existing=f.runtime.db.prepare('INSERT INTO users(email,password,email_verified) VALUES(?,?,1)').run('linked@example.test','unused').lastInsertRowid;
  const user=await callback(f,'github');
  assert.equal(user.email,'linked@example.test');assert.equal(f.runtime.db.prepare('SELECT github_id FROM users WHERE id=?').get(existing).github_id,'98765');
  assert.equal(f.runtime.db.prepare('SELECT COUNT(*) AS count FROM users').get().count,1);
 }finally{await f.close();}
});

test('Yandex OAuth rejects state replay before contacting the provider',async()=>{
 let upstreamCalls=0;const f=await fixture('yandex',async()=>{upstreamCalls++;return Response.json({});});
 try{
  const start=await fetch(f.base+'/auth/yandex',{redirect:'manual'}),session=cookie(start,'pongy_oauth_state');
  const result=await fetch(f.base+'/auth/yandex/callback?code=fixture-code&state=invalid-state',{headers:{Cookie:session},redirect:'manual'});
  assert.equal(result.status,302);assert.match(result.headers.get('location'),/oauth_error=OAUTH_STATE_INVALID/);assert.equal(upstreamCalls,0);
 }finally{await f.close();}
});

test('Yandex OAuth creates an account only from a valid provider profile',async()=>{
 let validEmail=false;const f=await fixture('yandex',async(url)=>{
  if(String(url).includes('oauth.yandex.com/token'))return Response.json({access_token:'yandex-access-token'});
  if(String(url).includes('login.yandex.ru/info'))return Response.json({id:'1234567',default_email:'yandex@example.test',emails:validEmail?['yandex@example.test']:[],display_name:'Yandex User'});
  throw new Error('Unexpected OAuth URL: '+url);
 });
 try{
  const start=await fetch(f.base+'/auth/yandex',{redirect:'manual'}),state=new URL(start.headers.get('location')).searchParams.get('state');
  const invalid=await fetch(f.base+'/auth/yandex/callback?code=fixture-code&state='+encodeURIComponent(state),{headers:{Cookie:cookie(start,'pongy_oauth_state')},redirect:'manual'});
  assert.match(invalid.headers.get('location'),/oauth_error=YANDEX_PROVIDER_ERROR/);
  assert.equal(f.runtime.db.prepare('SELECT COUNT(*) AS count FROM users').get().count,0);
  validEmail=true;
  const user=await callback(f,'yandex');
  assert.equal(user.email,'yandex@example.test');
  assert.equal(f.runtime.db.prepare('SELECT yandex_id FROM users WHERE id=?').get(user.id).yandex_id,'1234567');
 }finally{await f.close();}
});
