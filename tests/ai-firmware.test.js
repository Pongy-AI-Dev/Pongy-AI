import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import {createApp} from '../server.js';
import {loadConfig} from '../lib/config.js';

async function fixture(existingDir){
  const dir=existingDir||fs.mkdtempSync(path.join(os.tmpdir(),'pongy-ai-firmware-'));
  let completionBody=null,toolFileId=null;
  const runtime=createApp({config:loadConfig({DATA_DIR:dir,OPENROUTER_API_KEY:'fixture-key',JWT_SECRET:'ai-firmware-jwt-'.repeat(4),SESSION_SECRET:'ai-firmware-session-'.repeat(4)},dir),fetchImpl:async(url,options={})=>{
    if(String(url).endsWith('/models'))return Response.json({data:[{id:'fixture:free',pricing:{prompt:'0',completion:'0'},architecture:{input_modalities:['text']}}]});
    completionBody=JSON.parse(options.body);
    if(toolFileId&&completionBody.tools?.some(t=>t.function.name==='read_project_file')&&!completionBody.messages.some(m=>m.role==='tool'))return new Response('data: '+JSON.stringify({choices:[{delta:{tool_calls:[{index:0,id:'linked-file-read',type:'function',function:{name:'read_project_file',arguments:JSON.stringify({id:toolFileId,offset:0})}}]}}]})+'\n\ndata: [DONE]\n\n');
    return new Response('data: '+JSON.stringify({choices:[{delta:{content:'A factual answer.'}}]})+'\n\ndata: [DONE]\n\n');
  }});
  for(const email of ['sergiv1609@gmail.com','regular@example.test'])runtime.db.prepare('INSERT OR IGNORE INTO users(email,password,email_verified) VALUES(?,?,1)').run(email,bcrypt.hashSync('fixture-password',4));
  const server=await new Promise(resolve=>{const s=runtime.app.listen(0,'127.0.0.1',()=>resolve(s));});
  const base='http://127.0.0.1:'+server.address().port;
  const login=async email=>{const response=await fetch(base+'/api/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email,password:'fixture-password'})});assert.equal(response.status,200);return response.headers.get('set-cookie').split(';')[0];};
  const request=(url,cookie,method='GET',body)=>fetch(base+url,{method,headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  return {base,runtime,request,login,getCompletion:()=>completionBody,setToolFileId:id=>toolFileId=id,async close({preserve=false}={}){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));runtime.close();if(!preserve)fs.rmSync(dir,{recursive:true,force:true});}};
}

test('global AI firmware is developer-only, validated, persistent and affects every account prompt',async()=>{
  const f=await fixture();
  try{
    const admin=await f.login('sergiv1609@gmail.com'),user=await f.login('regular@example.test');
    assert.equal((await f.request('/api/admin/ai-firmware',user)).status,403);
    assert.equal((await f.request('/api/admin/ai-firmware',user,'PUT',{style:'detailed'})).status,403);
    const initial=await (await f.request('/api/admin/ai-firmware',admin)).json();
    assert.equal(initial.style,'balanced');assert.equal(initial.discussion,'contextual');assert.equal(initial.maskModels,true);
    const saved=await f.request('/api/admin/ai-firmware',admin,'PUT',{style:'detailed',discussion:'academic',maskModels:true,disableSafety:true,provider:'secret'});
    assert.equal(saved.status,200);
    const value=await saved.json();assert.deepEqual({style:value.style,discussion:value.discussion,maskModels:value.maskModels},{style:'detailed',discussion:'academic',maskModels:true});
    assert.equal(value.disableSafety,undefined);assert.equal(value.provider,undefined);
    const chat=await f.request('/api/chat',user,'POST',{locale:'ru',messages:[{role:'user',content:'Расскажи нейтрально об историческом событии.'}],smart:false,search:false});
    assert.equal(chat.status,200);await chat.text();
    const system=f.getCompletion().messages.find(message=>message.role==='system').content;
    assert.match(system,/thorough and explanatory/);assert.match(system,/careful historical, academic and source-aware analysis/);assert.match(system,/not refusal triggers by themselves/);
    const persisted=await (await f.request('/api/admin/ai-firmware',admin)).json();assert.equal(persisted.style,'detailed');assert.equal(persisted.discussion,'academic');
  }finally{await f.close();}
});

test('linked project files can be read by the model only in the owning selected project',async()=>{
  const f=await fixture();
  try{
    const owner=await f.login('sergiv1609@gmail.com'),other=await f.login('regular@example.test');
    const form=new FormData();form.append('files',new Blob(['Private linked reference text'],{type:'text/plain'}),'reference.txt');
    const uploaded=await fetch(f.base+'/api/files',{method:'POST',headers:{Origin:f.base,Cookie:owner},body:form});
    assert.equal(uploaded.status,200);const [file]=await uploaded.json();
    const created=await f.request('/api/projects',owner,'POST',{name:'Reference project',fileIds:[file.id]});
    assert.equal(created.status,201);const project=await created.json();
    const prompt={messages:[{role:'user',content:'What does the reference say?'}],locale:'en',siteContext:{projectId:project.id}};
    f.setToolFileId(file.id);
    const selected=await f.request('/api/chat',owner,'POST',prompt);assert.equal(selected.status,200);await selected.text();
    let model=f.getCompletion();assert(model.messages.some(m=>m.role==='tool'&&String(m.content).includes('Private linked reference text')));
    const foreign=await f.request('/api/chat',other,'POST',prompt);assert.equal(foreign.status,404);
    const unselected=await f.request('/api/chat',owner,'POST',{...prompt,siteContext:{}});assert.equal(unselected.status,200);await unselected.text();
    model=f.getCompletion();assert(!model.tools?.some(t=>t.function.name==='read_project_file'));
    assert(!JSON.stringify(model.messages).includes('Private linked reference text'));
  }finally{await f.close();}
});

test('a reused chat ID cannot expose an orphaned file to a different project',async()=>{
 const f=await fixture();
 try{
  const owner=await f.login('sergiv1609@gmail.com');
  const a=await (await f.request('/api/projects',owner,'POST',{name:'Original project'})).json();
  const b=await (await f.request('/api/projects',owner,'POST',{name:'Other project'})).json();
  const form=new FormData();form.append('files',new Blob(['orphan-secret-cobalt'],{type:'text/plain'}),'private.txt');
  const upload=await fetch(f.base+'/api/files',{method:'POST',headers:{Origin:f.base,Cookie:owner},body:form});assert.equal(upload.status,200);const [file]=await upload.json();
  f.runtime.db.prepare("UPDATE files SET json=json_set(json,'$.chatId',?) WHERE id=?").run('reused-chat',file.id);
  assert.equal((await f.request('/api/chats/reused-chat',owner,'PUT',{title:'Original',messages:[{role:'user',text:'Private file',attachments:[file]}],pinned:false,projectId:a.id})).status,200);
  assert.equal((await f.request('/api/chats/reused-chat',owner,'DELETE')).status,200);
  f.setToolFileId(file.id);
  const response=await f.request('/api/chat',owner,'POST',{chatId:'reused-chat',siteContext:{projectId:b.id},messages:[{role:'user',content:'Read the project file private.txt'}],locale:'en'});
  assert.equal(response.status,200);await response.text();
  const sent=f.getCompletion();assert(!JSON.stringify(sent).includes('orphan-secret-cobalt'));assert(!sent.messages.some(m=>m.role==='tool'&&String(m.content).includes('orphan-secret-cobalt')),'the orphaned file must not be read by the model');
 }finally{await f.close();}
});

test('a chatId-linked upload moved into project A is invisible to project B tools and ordinary chat tools',async()=>{
 const f=await fixture();
 try{
  const owner=await f.login('sergiv1609@gmail.com');
  const form=new FormData();form.append('files',new Blob(['private-upload-chatid-marker'],{type:'text/plain'}),'private.txt');
  const upload=await fetch(f.base+'/api/files',{method:'POST',headers:{Origin:f.base,Cookie:owner},body:form});assert.equal(upload.status,200);
  const [file]=await upload.json();
  // Old records may still carry chatId even though current multipart uploads accept no fields.
  f.runtime.db.prepare("UPDATE files SET json=json_set(json,'$.chatId',?) WHERE id=?").run('shared-old-id',file.id);
  const a=await (await f.request('/api/projects',owner,'POST',{name:'Project A',fileIds:[file.id]})).json();
  const b=await (await f.request('/api/projects',owner,'POST',{name:'Project B'})).json();
  f.setToolFileId(file.id);
  for(const projectId of [b.id,null]){
   const saved=await f.request('/api/chats/shared-old-id',owner,'PUT',{title:'Old ID',messages:[{role:'user',text:'A question without attachments'}],pinned:false,projectId});assert.equal(saved.status,200);
   const answer=await f.request('/api/chat',owner,'POST',{chatId:'shared-old-id',siteContext:{projectId},messages:[{role:'user',content:'Read the project file private.txt'}],locale:'en'});
   assert.equal(answer.status,200);await answer.text();
   assert(!JSON.stringify(f.getCompletion()).includes('private-upload-chatid-marker'),'model must not read file from another project via chatId');
   assert(!f.getCompletion().messages.some(m=>m.role==='tool'&&String(m.content).includes('private-upload-chatid-marker')));
   assert.equal((await f.request('/api/chats/shared-old-id',owner,'DELETE')).status,200);
  }
  const own=await f.request('/api/chat',owner,'POST',{siteContext:{projectId:a.id},messages:[{role:'user',content:'Read the project file private.txt'}],locale:'en'});
  assert.equal(own.status,200);await own.text();assert(JSON.stringify(f.getCompletion()).includes('private-upload-chatid-marker'));
 }finally{await f.close();}
});

test('a project file cannot be relinked to another project through create or update API',async()=>{
 const f=await fixture();
 try{
  const owner=await f.login('sergiv1609@gmail.com');
  const form=new FormData();form.append('files',new Blob(['project-one-only-marker'],{type:'text/plain'}),'restricted.txt');
  const upload=await fetch(f.base+'/api/files',{method:'POST',headers:{Origin:f.base,Cookie:owner},body:form});assert.equal(upload.status,200);const [file]=await upload.json();
  const a=await (await f.request('/api/projects',owner,'POST',{name:'A',fileIds:[file.id]})).json();
  const duplicate=await f.request('/api/projects',owner,'POST',{name:'B',fileIds:[file.id]});assert.equal(duplicate.status,409);assert.equal((await duplicate.json()).code,'FILE_PROJECT_MISMATCH');
  const b=await (await f.request('/api/projects',owner,'POST',{name:'B'})).json();
  const update=await f.request('/api/projects/'+b.id,owner,'PUT',{...b,fileIds:[file.id],version:b.updated_at});assert.equal(update.status,409);assert.equal((await update.json()).code,'FILE_PROJECT_MISMATCH');
  assert.deepEqual((await (await f.request('/api/projects',owner)).json()).projects.find(p=>p.id===b.id).fileIds,[]);
  f.setToolFileId(file.id);
  const rejected=await f.request('/api/chat',owner,'POST',{siteContext:{projectId:b.id},messages:[{role:'user',content:'Read restricted.txt'}],locale:'en'});assert.equal(rejected.status,200);await rejected.text();assert(!JSON.stringify(f.getCompletion()).includes('project-one-only-marker'));
  const allowed=await f.request('/api/chat',owner,'POST',{siteContext:{projectId:a.id},messages:[{role:'user',content:'Read restricted.txt'}],locale:'en'});assert.equal(allowed.status,200);await allowed.text();assert(JSON.stringify(f.getCompletion()).includes('project-one-only-marker'));
 }finally{await f.close();}
});

test('a linked file from project A cannot be attached to project B or an ordinary chat',async()=>{
 const f=await fixture();
 try{
  const owner=await f.login('sergiv1609@gmail.com');
  const form=new FormData();form.append('files',new Blob(['private-alpha-file-marker'],{type:'text/plain'}),'alpha.txt');
  const upload=await fetch(f.base+'/api/files',{method:'POST',headers:{Origin:f.base,Cookie:owner},body:form});assert.equal(upload.status,200);
  const [file]=await upload.json();
  const a=await (await f.request('/api/projects',owner,'POST',{name:'Alpha',fileIds:[file.id]})).json();
  const b=await (await f.request('/api/projects',owner,'POST',{name:'Beta'})).json();
  for(const id of [b.id,null])for(const location of ['messages','body']){
   const body={chatId:'fresh-'+location+'-'+(id||'ordinary'),siteContext:{projectId:id},messages:[{role:'user',content:'Explain this research note.'}]};
   if(location==='messages')body.messages[0].attachments=[file.id];else body.attachments=[file.id];
   const response=await f.request('/api/chat',owner,'POST',body);
   assert.equal(response.status,409,location+' must not read a file linked to another project');
   assert.equal((await response.json()).code,'FILE_PROJECT_MISMATCH');
  }
  const allowed=await f.request('/api/chat',owner,'POST',{chatId:'alpha-current',siteContext:{projectId:a.id},messages:[{role:'user',content:'Explain this research note.',attachments:[file.id]}]});
  assert.equal(allowed.status,200);await allowed.text();
  assert(JSON.stringify(f.getCompletion()).includes('private-alpha-file-marker'));
 }finally{await f.close();}
});

test('saving a chat cannot link a file from another project, while its owning project can retain it',async()=>{
 const f=await fixture();
 try{
  const owner=await f.login('sergiv1609@gmail.com');
  const form=new FormData();form.append('files',new Blob(['private-save-marker'],{type:'text/plain'}),'alpha.txt');
  const upload=await fetch(f.base+'/api/files',{method:'POST',headers:{Origin:f.base,Cookie:owner},body:form});assert.equal(upload.status,200);
  const [file]=await upload.json();
  const a=await (await f.request('/api/projects',owner,'POST',{name:'Alpha',fileIds:[file.id]})).json();
  const b=await (await f.request('/api/projects',owner,'POST',{name:'Beta'})).json();
  const save=projectId=>f.request('/api/chats/attempted-link',owner,'PUT',{title:'Research',messages:[{role:'user',text:'Read this',attachments:[file]}],pinned:false,projectId});
  for(const projectId of [b.id,null]){
   const response=await save(projectId);assert.equal(response.status,409);
   assert.equal((await response.json()).code,'FILE_PROJECT_MISMATCH');
   assert.equal((await (await f.request('/api/chats',owner)).json()).some(chat=>chat.id==='attempted-link'),false);
  }
  assert.equal((await save(a.id)).status,200);
  assert.equal((await f.request('/api/chats/attempted-link',owner,'DELETE')).status,200);
  const ordinary=await f.request('/api/chat',owner,'POST',{chatId:'attempted-link',messages:[{role:'user',content:'Read this',attachments:[file.id]}],locale:'en'});
  assert.equal(ordinary.status,409,'deleting a chat must not remove the file project boundary');
 }finally{await f.close();}
});

test('a historical ordinary chat cannot retain an attachment after that file becomes project-linked',async()=>{
 const f=await fixture();
 try{
  const owner=await f.login('sergiv1609@gmail.com');
  const form=new FormData();form.append('files',new Blob(['historical-private-marker'],{type:'text/plain'}),'old.txt');
  const upload=await fetch(f.base+'/api/files',{method:'POST',headers:{Origin:f.base,Cookie:owner},body:form});assert.equal(upload.status,200);
  const [file]=await upload.json();
  const save=()=>f.request('/api/chats/old-ordinary',owner,'PUT',{title:'Old chat',messages:[{role:'user',text:'Historical attachment',attachments:[file]}],pinned:false,projectId:null});
  assert.equal((await save()).status,200);
  const project=await f.request('/api/projects',owner,'POST',{name:'Later project',fileIds:[file.id]});assert.equal(project.status,201);
  const again=await save();assert.equal(again.status,409);assert.equal((await again.json()).code,'FILE_PROJECT_MISMATCH');
  const chat=await f.request('/api/chat',owner,'POST',{chatId:'old-ordinary',messages:[{role:'user',content:'Read old attachment',attachments:[file.id]}],locale:'en'});
  assert.equal(chat.status,409,'old saved attachment must not be reused in an ordinary model request');
  const implicit=await f.request('/api/chat',owner,'POST',{chatId:'old-ordinary',messages:[{role:'user',content:'Read the old attached project file'}],locale:'en'});
  assert.equal(implicit.status,409,'a model tool must not implicitly read a now project-linked file from old chat history');
  assert.equal((await implicit.json()).code,'FILE_PROJECT_MISMATCH');
 }finally{await f.close();}
});

test('chat uses only an owned selected project, rejects foreign IDs, and omits project memory outside it',async()=>{
  const f=await fixture();
  try{
    const first=await f.login('sergiv1609@gmail.com'),second=await f.login('regular@example.test');
    const created=await f.request('/api/projects',first,'POST',{name:'Private study',description:'Study geometry',memory:'Remember the blue compass illustration'});
    assert.equal(created.status,201);const project=await created.json();
    const prompt=chatId=>({chatId,messages:[{role:'user',content:'Explain a useful method for careful revision.'}],locale:'en',siteContext:{projectId:project.id}});
    const foreign=await f.request('/api/chat',second,'POST',prompt('foreign'));assert.equal(foreign.status,404);assert.equal((await foreign.json()).code,'PROJECT_NOT_FOUND');
    const invalid=await f.request('/api/chat',first,'POST',{...prompt('invalid'),siteContext:{projectId:'../not-a-project'}});assert.equal(invalid.status,400);
    const selected=await f.request('/api/chat',first,'POST',prompt('selected'));assert.equal(selected.status,200);await selected.text();
    let system=f.getCompletion().messages.find(m=>m.role==='system').content;
    assert.match(system,/Private study/);assert.match(system,/Remember the blue compass illustration/);assert.match(system,/Linked project files are available through list_project_files and read_project_file/);
    const plain=await f.request('/api/chat',second,'POST',{chatId:'plain',messages:[{role:'user',content:'Explain a useful method for careful revision.'}],locale:'en'});assert.equal(plain.status,200);await plain.text();
    system=f.getCompletion().messages.find(m=>m.role==='system').content;
    assert.doesNotMatch(system,/Remember the blue compass illustration|Private study/);
    assert.equal((await f.request('/api/projects/'+project.id,first,'DELETE')).status,200);
    assert.equal((await f.request('/api/chat',first,'POST',prompt('deleted'))).status,404);
  }finally{await f.close();}
});

test('project isolation and saved history survive a server restart',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pongy-project-restart-'));
 let first,second;
 try{
  first=await fixture(dir);
  const owner=await first.login('sergiv1609@gmail.com');
  const a=await (await first.request('/api/projects',owner,'POST',{name:'Persistent Alpha',memory:'alpha-private-compass'})).json();
  const b=await (await first.request('/api/projects',owner,'POST',{name:'Persistent Beta',memory:'beta-private-lantern'})).json();
  const form=new FormData();form.append('files',new Blob(['alpha-private-file'],{type:'text/plain'}),'alpha.txt');
  const uploaded=await fetch(first.base+'/api/files',{method:'POST',headers:{Origin:first.base,Cookie:owner},body:form});assert.equal(uploaded.status,200);
  const [file]=await uploaded.json();
  const linked=await first.request('/api/projects/'+a.id,owner,'PUT',{...a,fileIds:[file.id],version:a.updated_at});assert.equal(linked.status,200);
  for(const [id,projectId,marker] of [['alpha-history',a.id,'alpha-history-marker'],['beta-history',b.id,'beta-history-marker'],['ordinary-history',null,'ordinary-history-marker']]){
   assert.equal((await first.request('/api/chats/'+id,owner,'PUT',{title:'Saved '+marker,messages:[{role:'user',text:marker}],pinned:false,projectId})).status,200);
  }
  await first.close({preserve:true});first=null;
  second=await fixture(dir);
  const restored=await second.login('sergiv1609@gmail.com');
  assert.equal((await (await second.request('/api/chats',restored)).json()).length,3);
  assert.deepEqual((await (await second.request('/api/projects',restored)).json()).projects.find(p=>p.id===a.id).fileIds,[file.id]);
  assert.equal((await second.request('/api/preferences',restored,'PUT',{memory:true})).status,200);
  second.setToolFileId(file.id);
  for(const [projectId,own,excluded] of [[a.id,'alpha-private-compass',['beta-private-lantern','beta-history-marker','ordinary-history-marker']],[b.id,'beta-private-lantern',['alpha-private-compass','alpha-history-marker','ordinary-history-marker','alpha-private-file']],[null,'ordinary-history-marker',['alpha-private-compass','beta-private-lantern','alpha-history-marker','beta-history-marker','alpha-private-file']]]){
   const answer=await second.request('/api/chat',restored,'POST',{chatId:'fresh-'+(projectId||'ordinary'),siteContext:{projectId},messages:[{role:'user',content:'Explain the saved project decision and read alpha.txt'}],locale:'en'});
   assert.equal(answer.status,200);await answer.text();const sent=JSON.stringify(second.getCompletion());
   assert(sent.includes(own),'own context should be available after restart');for(const marker of excluded)assert(!sent.includes(marker),'foreign context leaked after restart: '+marker);
  }
  const mismatch=await second.request('/api/chat',restored,'POST',{chatId:'alpha-history',siteContext:{projectId:b.id},messages:[{role:'user',content:'Read old history'}],locale:'en'});assert.equal(mismatch.status,409);
 }finally{if(first)await first.close({preserve:true});if(second)await second.close({preserve:true});fs.rmSync(dir,{recursive:true,force:true});}
});

test('saved project chats stay bound to their project in model memory, history and replies',async()=>{
 const f=await fixture();
 try{
  const owner=await f.login('sergiv1609@gmail.com'),other=await f.login('regular@example.test');
  const a=await (await f.request('/api/projects',owner,'POST',{name:'Project Alpha'})).json();
  const b=await (await f.request('/api/projects',owner,'POST',{name:'Project Beta'})).json();
  const save=(id,projectId,marker)=>f.request('/api/chats/'+id,owner,'PUT',{title:'Careful revision '+marker,messages:[{role:'user',text:'Careful revision includes '+marker+' in this project.'}],pinned:false,projectId});
  assert.equal((await save('alpha-chat',a.id,'alpha-only-cobalt')).status,200);
  assert.equal((await save('beta-chat',b.id,'beta-only-amber')).status,200);
  assert.equal((await save('plain-chat',null,'plain-only-ivory')).status,200);
  assert.equal((await save('alpha-chat',b.id,'moved')).status,409);
  assert.equal((await save('alpha-chat',null,'moved')).status,409);
  assert.equal((await f.request('/api/chats/alpha-chat',other,'PUT',{title:'x',messages:[{role:'user',text:'x'}],pinned:false,projectId:a.id})).status,404);
  assert.equal((await f.request('/api/preferences',owner,'PUT',{memory:true})).status,200);
  const send=async(id,projectId,text='Explain careful revision using cobalt decisions.')=>{const response=await f.request('/api/chat',owner,'POST',{chatId:id,siteContext:{projectId},messages:[{role:'user',content:text}],locale:'en'});if(response.status===200)await response.text();return response;};
  assert.equal((await send('alpha-chat',b.id)).status,409);
  assert.equal((await send('plain-chat',a.id)).status,409);
  assert.equal((await send('alpha-chat',a.id)).status,200);
  let system=f.getCompletion().messages[0].content;
  assert(!system.includes('beta-only-amber'));assert(!system.includes('plain-only-ivory'));
  assert.equal((await send('beta-chat',b.id)).status,200);
  system=f.getCompletion().messages[0].content;
  assert(!system.includes('alpha-only-cobalt'));assert(!system.includes('plain-only-ivory'));
  assert.equal((await send('fresh-beta',b.id)).status,200);
  system=f.getCompletion().messages[0].content;
  assert(system.includes('beta-only-amber'),'same-project saved chat must reach model');
  assert(!system.includes('alpha-only-cobalt'));assert(!system.includes('plain-only-ivory'));
  assert.equal((await send('fresh-plain',null)).status,200);
  system=f.getCompletion().messages[0].content;
  assert(system.includes('plain-only-ivory'),'ordinary saved chat must reach ordinary chat');
  assert(!system.includes('alpha-only-cobalt'));assert(!system.includes('beta-only-amber'));
  const reply=await f.request('/api/chat',owner,'POST',{chatId:'beta-chat',siteContext:{projectId:b.id},reply:{chatId:'alpha-chat',index:0},messages:[{role:'user',content:'Explain careful revision with cobalt.'}]});
  assert.equal(reply.status,409);
  assert.equal((await f.request('/api/chats',owner)).status,200);
  const rows=await (await f.request('/api/chats',owner)).json();
  assert.equal(rows.find(c=>c.id==='alpha-chat').project_id,a.id);
 }finally{await f.close();}
});
