import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../server.js';
import {loadConfig} from '../lib/config.js';
import bcrypt from 'bcryptjs';

test('admin test mode requires developer email OTP, grants scoped temporary developer access, and cleans it on exit',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pongy-admin-guest-'));
  let sentMail=null,clock=Date.UTC(2026,10,8);
  const fetchImpl=async(url,options={})=>{if(String(url).includes('api.resend.com/emails')){sentMail=JSON.parse(options.body);return Response.json({id:'mail-fixture'});}return Response.json({data:[]});};
  const runtime=createApp({config:loadConfig({DATA_DIR:dir,JWT_SECRET:'admin-guest-http-secret-'.repeat(3),SESSION_SECRET:'admin-guest-http-session-'.repeat(3),RESEND_API_KEY:'fixture-resend-key',MAIL_FROM:'Pongy <noreply@example.test>'},dir),now:()=>clock,fetchImpl});
  const normalId=runtime.db.prepare('INSERT INTO users(email,password,email_verified,nickname) VALUES(?,?,1,?)').run('customer@example.test',bcrypt.hashSync('fixture-password',4),'Customer').lastInsertRowid;runtime.db.prepare('UPDATE users SET created_at=?,subscription_until=?,smart_pc_until=? WHERE id=?').run(clock-10*86400000,clock+20*86400000,clock+5*86400000,normalId);runtime.db.prepare('INSERT INTO billing_orders(id,user_id,product,currency,minor,provider,status,created_at) VALUES(?,?,?,?,?,?,?,?)').run('fixture-paid',normalId,'plus','RUB',19000,'yookassa','paid',clock-1000);
  const server=runtime.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const base='http://127.0.0.1:'+server.address().port;
  async function req(url,cookie='',body,method=body?'POST':'GET'){return fetch(base+url,{method,headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});}
  try{
    assert.equal((await req('/api/admin/users')).status,401);
    const ordinaryLogin=await req('/api/login','',{email:'customer@example.test',password:'fixture-password'},'POST');assert.equal(ordinaryLogin.status,200);const ordinaryCookie=ordinaryLogin.headers.get('set-cookie').split(';')[0];assert.equal((await req('/api/admin/users',ordinaryCookie)).status,403);
    assert.equal((await req('/api/admin-guest/start','',{email:'not-developer@example.test'},'POST')).status,403);
    const email='notion.app.login@gmail.com';
    const sent=await req('/api/admin-guest/start','',{email},'POST');
    assert.equal(sent.status,200);assert(sentMail);const code=sentMail.text.match(/код: (\d{6})/i)?.[1];assert(code);
    assert.equal((await req('/api/admin-guest/start','',{email},'POST')).status,429);
    assert.equal((await req('/api/admin-guest/verify','',{email,code:'000000'},'POST')).status,400);
    const verified=await req('/api/admin-guest/verify','',{email,code},'POST');
    assert.equal(verified.status,200);
    const data=await verified.json(),cookie=verified.headers.get('set-cookie').split(';')[0];
    assert.equal(data.authenticated,true);assert.equal(data.user.email,email);assert.equal(data.user.developer,true);assert.equal(data.user.adminGuest,true);assert.equal(data.user.localOnly,true);
    const restored=await req('/api/me',cookie);assert.equal(restored.status,200);assert.equal((await restored.json()).adminGuest,true);
    const upload=new FormData();upload.append('files',new Blob(['blocked'],{type:'text/plain'}),'guest.txt');
    const deniedUpload=await fetch(base+'/api/files',{method:'POST',headers:{Origin:base,Cookie:cookie},body:upload});
    assert.equal(deniedUpload.status,403,'admin test session must not upload files');assert.equal((await deniedUpload.json()).code,'GUEST_FEATURE_LOCKED');
    assert.equal(runtime.db.prepare('SELECT COUNT(*) AS n FROM files').get().n,0);
    const usersResponse=await req('/api/admin/users',cookie);assert.equal(usersResponse.status,200);const usersData=await usersResponse.json(),customer=usersData.users.find(u=>u.email==='customer@example.test');assert(customer);assert.equal(customer.name,'Customer');assert(customer.createdAt);assert(customer.lastVisitAt);assert.equal(customer.subscription.plusUntil,clock+20*86400000);assert.equal(customer.subscription.smartPcUntil,clock+5*86400000);assert.equal(customer.payments[0].paidCount,1);assert.equal(customer.payments[0].paidMinor,19000);assert(!JSON.stringify(usersData).includes('fixture-password'));assert(!JSON.stringify(usersData).includes('password'));
    assert.equal(runtime.db.prepare('SELECT COUNT(*) AS n FROM users').get().n,2);
    assert.equal(runtime.db.prepare('SELECT COUNT(*) AS n FROM admin_guest_sessions').get().n,1);
    const ended=await req('/api/admin-guest/end',cookie,{},'POST');assert.equal(ended.status,200);
    assert.equal(runtime.db.prepare('SELECT COUNT(*) AS n FROM users').get().n,1);
    assert.equal(runtime.db.prepare('SELECT COUNT(*) AS n FROM admin_guest_sessions').get().n,0);
    assert.equal((await req('/api/me',cookie)).status,401);assert.equal((await req('/api/admin/users',cookie)).status,401);
    clock+=60001;const secondStart=await req('/api/admin-guest/start','',{email},'POST');assert.equal(secondStart.status,200);const secondCode=sentMail.text.match(/код: ([0-9]{6})/i)?.[1];assert(secondCode);const secondVerified=await req('/api/admin-guest/verify','',{email,code:secondCode},'POST');assert.equal(secondVerified.status,200);const secondCookie=secondVerified.headers.get('set-cookie').split(';')[0];clock+=8*60*60*1000+1;assert.equal((await req('/api/me',secondCookie)).status,401);assert.equal(runtime.db.prepare('SELECT COUNT(*) AS n FROM users').get().n,1,'expired admin test users are purged');
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));runtime.close();fs.rmSync(dir,{recursive:true,force:true});}
});
