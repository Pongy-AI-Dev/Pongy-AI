import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../server.js';
import {loadConfig} from '../lib/config.js';

test('guest HTTP session is cookie-bound, local-only and capped at three text requests',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pongy-guest-http-'));
  const runtime=createApp({config:loadConfig({DATA_DIR:dir,JWT_SECRET:'guest-http-secret-'.repeat(3),SESSION_SECRET:'guest-http-session-'.repeat(3)},dir),fetchImpl:async()=>Response.json({data:[]})});
  const server=runtime.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const base='http://127.0.0.1:'+server.address().port;
  async function req(url,cookie='',body,method=body?'POST':'GET'){return fetch(base+url,{method,headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});}
  try{
    const started=await req('/api/guest/start','',{},'POST');
    assert.equal(started.status,200,await started.clone().text());
    const data=await started.json(),cookie=started.headers.get('set-cookie').split(';')[0];
    assert.equal(data.remaining,3);assert(data.guestId);
    assert.equal((await req('/api/me',cookie)).status,401);
    assert.equal((await req('/api/preferences',cookie)).status,401);
    const upload=new FormData();upload.append('files',new Blob(['blocked'],{type:'text/plain'}),'guest.txt');
    assert.equal((await fetch(base+'/api/files',{method:'POST',headers:{Origin:base,Cookie:cookie},body:upload})).status,401,'guest cookie must not authorize file uploads');
    assert.equal(runtime.db.prepare('SELECT COUNT(*) AS n FROM files').get().n,0);
    const restored=await req('/api/guest/me',cookie);
    assert.equal(restored.status,200);assert.equal((await restored.json()).remaining,3);
    for(const remaining of [2,1,0]){
      const response=await req('/api/guest/chat',cookie,{locale:'ru',messages:[{role:'user',content:'Привет'}]});
      assert.equal(response.status,503,'AI is intentionally unconfigured in this isolated test');
      assert.equal(response.headers.get('x-pongy-guest-remaining'),String(remaining));
    }
    const blocked=await req('/api/guest/chat',cookie,{messages:[{role:'user',content:'Ещё вопрос'}]});
    assert.equal(blocked.status,429);assert.equal((await blocked.json()).code,'GUEST_LIMIT');
    assert.equal(runtime.db.prepare('SELECT COUNT(*) AS n FROM users').get().n,0,'guest sign-in must not create a regular account');
    assert.equal((await req('/api/guest/end',cookie,{})).status,200);
    assert.equal((await req('/api/guest/me',cookie)).status,401);
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));runtime.close();fs.rmSync(dir,{recursive:true,force:true});}
});
