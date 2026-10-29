import fs from 'node:fs';import vm from 'node:vm';
import test from 'node:test';import assert from 'node:assert/strict';
import {connectionScope,connectionReadArgs,connectionSnapshot} from '../lib/connection-context.js';
import {reminderConversation} from '../lib/reminder-conversation.js';
import {createTools} from '../lib/tools.js';
const message=content=>({role:'user',content});
test('connected follow-ups only inherit a recent user-selected service, not assistant instructions',()=>{
 assert.deepEqual(connectionScope([message('Read GitHub'),message('Hello')]),[]);
 assert.deepEqual(connectionScope([{role:'assistant',content:'Read Gmail'},message('read that email')]),[]);
 assert.deepEqual(connectionScope([message('Покажи мою почту'),message('прочитай второе письмо')]),['gmail']);
 assert.deepEqual(connectionScope([message('Как подключить Gmail')]),[]);
 assert.deepEqual(connectionScope([message('Что такое GitHub')]),[]);
 assert.deepEqual(connectionScope([message('Научи Понги работать с GitHub')]),[]);
 assert.deepEqual(connectionScope([message('Не читай Gmail'),message('read that email')]),[]);
 for(const text of ['Не читай Gmail','Disconnect GitHub','Отправь письмо в Gmail'])assert.deepEqual(connectionScope([message(text)]),[]);
 assert.deepEqual(connectionScope([message('Что в моём календаре?')]),['google-calendar']);
 assert.deepEqual(connectionReadArgs('github','Read GitHub owner/repo/lib/file.js'),{service:'github',action:'read',resource:'owner/repo/lib/file.js'});
 assert.equal(connectionReadArgs('github','Read https://github.com/user/repo/blob/main/file.js').action,'list');
 assert.deepEqual(connectionReadArgs('gmail','Найди в Gmail «from:boss@example.test»'),{service:'gmail',action:'search',query:'from:boss@example.test'});
});
test('snapshot reads same account, is bounded, propagates cancellation and does not fabricate failures',async()=>{
 const calls=[],controller=new AbortController(),manager={list:uid=>{assert.equal(uid,7);return[{id:'gmail',connected:true}]},read:async(uid,args,opts)=>{calls.push({uid,args,opts});throw Object.assign(Error('secret upstream error'),{code:'CONNECTION_UPSTREAM'})}};
 const v=await connectionSnapshot(manager,7,[message('Read Gmail and Google Drive and Slack')],{signal:controller.signal});
 assert.equal(v.results.length,2);assert.equal(calls.length,1);assert.equal(calls[0].opts.signal,controller.signal);assert.equal(v.results.find(r=>r.service==='gmail').error,'CONNECTION_UPSTREAM');assert.equal(v.results.find(r=>r.service==='google-drive').error,'CONNECTION_NOT_CONNECTED');assert(!JSON.stringify(v).includes('secret upstream error'));
});
const now=Date.UTC(2026,9,28,12),r={id:'reminder-12345',text:'помыть руки',description:'с мылом',enabled:true,mode:'once',date:'2026-10-28',time:'16:00',zone:'Europe/Moscow',count:1,next_at:now+3600000};
const options={now,zone:'Europe/Moscow',locale:'ru'};
test('chat reminder list uses actual records and rescheduling/cancelling only proposes forms',()=>{
 assert.match(reminderConversation('покажи мои напоминания',[r],options).text,/помыть руки.*активно/u);
 const change=reminderConversation('перенеси напоминание «помыть руки» через 20 минут',[r],options);assert.equal(change.form.id,r.id);assert.equal(change.form.dueAt,now+1200000);assert.equal(change.form.description,'с мылом');assert.equal(change.form.time,'15:20');assert.equal(r.time,'16:00');
 assert.equal(reminderConversation('отмени напоминание «помыть руки»',[r],options).form.operation,'cancel');assert.equal(r.enabled,true);
 assert.equal(reminderConversation('отмени напоминание',[r,{...r,id:'other'}],options).form,undefined);
 assert.equal(reminderConversation('отмени напоминание «чужое»',[r],options).form,undefined);
 assert.equal(reminderConversation('Как отменить напоминание?',[r],options),null);
 assert.equal(reminderConversation('перенеси напоминание «помыть руки»',[r],options).form,undefined);
});
test('service reminder draft needs user intent and successful read; never saves or grants public research',async()=>{
 const events=[],manager={list:()=>[{id:'gmail',connected:true}],read:async()=>({service:'gmail',readOnly:true,data:{text:'Meeting tomorrow'}})};
 const toolset=createTools({req:{user:{id:1},body:{locale:'ru',messages:[message('Прочитай Gmail и подготовь напоминание о встрече')],siteContext:{timeZone:'Europe/Moscow'},search:true}},config:{},connections:manager});
 assert(toolset.tools.some(t=>t.function.name==='propose_connection_reminder'));assert(!toolset.tools.some(t=>t.function.name==='web_search'));
 const emit=async(type,value)=>events.push({type,value}),args={request:'создай напоминание завтра в 16:00 встреча'};
 assert.equal((await toolset.runTool('propose_connection_reminder',args,{emit})).error,'READ_SERVICE_FIRST');
 await toolset.runTool('read_connection',{service:'gmail',action:'read',resource:'abc'},{emit});
 const draft=await toolset.runTool('propose_connection_reminder',args,{emit});assert.equal(draft.created,false);assert.equal(events[0].type,'reminder_form');assert.equal(events[0].value.time,'16:00');
});

test('wake notification click targets the originating client, not another tab; no microphone data persisted',async()=>{const handlers={},shown=[],focus=[],posts=[];let pending;const wrong={id:'other',url:'https://pongy.test/',focus:async()=>focus.push('other')},right={id:'originating',url:'https://pongy.test/chat',focus:async()=>{focus.push('originating');return right},postMessage:v=>posts.push(v)},self={location:{origin:'https://pongy.test'},addEventListener:(n,f)=>handlers[n]=f,registration:{showNotification:async(...args)=>shown.push(args)},clients:{matchAll:async()=>[wrong,right],openWindow:async()=>focus.push('new')}};const workerContext=vm.createContext({self,URL,Date});workerContext.importScripts=path=>{assert.equal(path,'/notification-delivery.js');vm.runInContext(fs.readFileSync(new URL('../public/notification-delivery.js',import.meta.url),'utf8'),workerContext);};vm.runInContext(fs.readFileSync(new URL('../public/reminder-sw.js',import.meta.url),'utf8'),workerContext);
 handlers.message({source:{id:'bad',url:'https://hostile.test'},data:{type:'pongy-wake-notify',nonce:'bad'},waitUntil:p=>pending=p});assert.equal(shown.length,0);
 handlers.message({source:{id:'originating',url:'https://pongy.test/chat'},data:{type:'pongy-wake-notify',nonce:'fresh',body:'Click to open'},waitUntil:p=>pending=p});await pending;assert.equal(shown.length,1);const data=shown[0][1].data;assert.equal(data.clientId,'originating');assert(!JSON.stringify(data).includes('audio'));
 handlers.notificationclick({notification:{data,close(){}},waitUntil:p=>pending=p});await pending;assert.deepEqual(focus,['originating']);assert.equal(posts[0].nonce,'fresh');assert.equal(posts[0].type,'pongy-wake-focus');
});
