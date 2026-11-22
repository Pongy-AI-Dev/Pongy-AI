import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import {createApp} from '../server.js';
import {loadConfig} from '../lib/config.js';

test('unused-file cleanup checks every reference, moves only old unreferenced files to recoverable Trash and delays permanent deletion',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pongy-file-cleanup-'));let clock=Date.now();
 const runtime=createApp({config:loadConfig({DATA_DIR:dir,JWT_SECRET:'cleanup-jwt-'.repeat(5),SESSION_SECRET:'cleanup-session-'.repeat(5)},dir),now:()=>clock});
 const user=runtime.db.prepare('INSERT INTO users(email,password,email_verified) VALUES(?,?,1)').run('cleanup@example.test',bcrypt.hashSync('fixture-password',4)).lastInsertRowid;
 const day=86400000,old=clock-120*day,recent=clock-20*day;
 const rows=[
  ['old-unused',{id:'old-unused',name:'old.txt',mime:'text/plain',bytes:4,text:'old',base64:Buffer.from('old').toString('base64'),updated_at:old}],
  ['recent-unused',{id:'recent-unused',name:'recent.txt',mime:'text/plain',bytes:6,text:'recent',base64:Buffer.from('recent').toString('base64'),updated_at:recent}],
  ['project-used',{id:'project-used',name:'project.txt',mime:'text/plain',bytes:7,updated_at:old}],
  ['library-used',{id:'library-used',name:'library.txt',mime:'text/plain',bytes:7,updated_at:old}],
  ['note-used',{id:'note-used',name:'note.txt',mime:'text/plain',bytes:7,updated_at:old}],
  ['chat-used',{id:'chat-used',name:'chat.txt',mime:'text/plain',bytes:7,updated_at:old}],
  ['chat-linked',{id:'chat-linked',name:'linked.txt',mime:'text/plain',bytes:7,chatId:'cleanup-chat',updated_at:old}]
 ];
 for(const [id,file] of rows)runtime.db.prepare('INSERT INTO files VALUES(?,?,?)').run(id,user,JSON.stringify(file));
 runtime.db.prepare('INSERT INTO chats(id,user_id,title,messages,updated_at,pinned,project_id,archived_at) VALUES(?,?,?,?,?,?,?,?)').run('cleanup-chat',user,'Cleanup chat',JSON.stringify([{role:'user',text:'file',attachments:[{id:'chat-used'}]}]),clock,0,null,0);
 const project={id:'cleanup-project',name:'Project',description:'',memory:'',icon:'',color:'',chatIds:[],fileIds:['project-used'],settings:{theme:'system'},created_at:clock,updated_at:clock};
 runtime.db.prepare('INSERT INTO projects(id,user_id,json,updated_at) VALUES(?,?,?,?)').run(project.id,user,JSON.stringify(project),clock);
 const library={id:'cleanup-library',fileId:'library-used',name:'Library file',description:'',folder:'',tags:[],created_at:clock,updated_at:clock};
 runtime.db.prepare('INSERT INTO library_items(id,user_id,json,updated_at) VALUES(?,?,?,?)').run(library.id,user,JSON.stringify(library),clock);
 const note={id:'cleanup-note',title:'Note',html:'<p>attached</p>',pinned:false,attachments:[{id:'note-used',position:'below'}],updated_at:clock};
 runtime.db.prepare('INSERT INTO notes(id,user_id,json,updated_at) VALUES(?,?,?,?)').run(note.id,user,JSON.stringify(note),clock);
 const server=await new Promise(resolve=>{const s=runtime.app.listen(0,'127.0.0.1',()=>resolve(s))}),base='http://127.0.0.1:'+server.address().port;
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));runtime.close();fs.rmSync(dir,{recursive:true,force:true})});
 const login=await fetch(base+'/api/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email:'cleanup@example.test',password:'fixture-password'})});
 assert.equal(login.status,200);const cookie=(login.headers.get('set-cookie')||'').split(';')[0];assert.match(cookie,/pongy_session=/);
 const call=(route,method='GET',body)=>fetch(base+route,{method,headers:{Cookie:cookie,...(method==='GET'?{}:{Origin:base,'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const candidateResponse=await call('/api/files/cleanup-candidates');assert.equal(candidateResponse.status,200);
 const candidates=await candidateResponse.json();assert.equal(candidates.retentionDays,90);assert.deepEqual(candidates.files.map(f=>f.id),['old-unused']);
 const protectedResponse=await call('/api/files/project-used/trash','POST');assert.equal(protectedResponse.status,409);
 const recentResponse=await call('/api/files/recent-unused/trash','POST');assert.equal(recentResponse.status,409);
 const trash=await call('/api/files/old-unused/trash','POST');assert.equal(trash.status,200);assert.equal((await trash.json()).recoverableDays,30);
 const visible=await (await call('/api/files')).json();assert(!visible.files.some(f=>f.id==='old-unused'));
 const bin=await (await call('/api/files/trash')).json();assert.equal(bin.files.length,1);assert.equal(bin.files[0].id,'old-unused');
 assert.equal((await call('/api/files/old-unused')).status,404);
 assert.equal((await call('/api/files/old-unused/preview')).status,404);
 assert.equal((await call('/api/files/old-unused','DELETE')).status,409);
 assert.notEqual((await call('/api/library','PUT',{fileId:'old-unused',name:'Trashed file'})).status,201);
 assert.notEqual((await call('/api/projects/cleanup-project','PUT',{...project,fileIds:['old-unused'],version:project.updated_at})).status,200);
 assert.notEqual((await call('/api/notes/cleanup-note','PUT',{...note,attachments:[{id:'old-unused',position:'below'}],version:note.updated_at})).status,200);
 const restored=await call('/api/files/old-unused/restore','POST');assert.equal(restored.status,200);
 assert((await (await call('/api/files')).json()).files.some(f=>f.id==='old-unused'));
 const trashedAgain=await call('/api/files/old-unused/trash','POST');assert.equal(trashedAgain.status,200);
 clock+=31*day;
 const deleted=await call('/api/files/old-unused','DELETE');assert.equal(deleted.status,200);
 assert.equal((await call('/api/files/old-unused')).status,404);
});
