import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {inferCodeFiles} from '../lib/workbench.js';
import {deliveryAnswer,codeFence} from '../lib/code-delivery.js';
import {createArtifacts} from '../lib/artifacts.js';
import {inspectAppProject} from '../lib/app-workflow.js';

test('long Markdown fences preserve embedded backticks and trailing prose',()=>{
 const file={name:'demo.js',content:'const example = `\n```json\n{}\n```\n`;\n'};
 const answer=codeFence(file)+'\n\nExplanation stays outside.';
 assert.deepEqual(inferCodeFiles(answer),[file]);
 assert.equal(deliveryAnswer(answer,[file]),answer);
});
test('tilde fences and CRLF work without inferring unclosed source',()=>{
 assert.deepEqual(inferCodeFiles('~~~js filename=src/main.js\r\nconst x=1;\r\n~~~\r\nAfter'),[{name:'src/main.js',content:'const x=1;\r\n'}]);
 assert.equal(inferCodeFiles('````js\nconst x = 1;\n```').length,0);
});
test('multi-file final prose excludes complete long-fenced source, not following paragraphs',()=>{
 const files=[{name:'a.js',content:'const a=1;\n'},{name:'b.js',content:'const b=2;\n'}];
 const answer='Project ready.\n\n````js filename=a.js\nconst a=1;\n````\n\n~~~js filename=b.js\nconst b=2;\n~~~\n\nRun the entry point.';
 assert.equal(deliveryAnswer(answer,files),'Project ready.\n\nRun the entry point.');
});
test('environment variants cannot be shipped even if their final extension is supported',async()=>{
 for(const name of ['.env.json','nested/.env.production.json','.env.example/private.json','.env.foo.env.example']){
  await assert.rejects(createArtifacts({files:[{name,content:'{"secret":"example"}'}]}));
  await assert.rejects(inspectAppProject([{name,content:'{}'},{name:'main.js',content:'const a=1;'}],{application:false}));
 }
 assert.equal((await createArtifacts({files:[{name:'.env.example',content:'API_KEY=\n'}]})).length,1);
});
test('ZIP file/directory name conflicts are rejected in either insertion order',async()=>{
 for(const files of [[{name:'src.js',content:'const a=1;'},{name:'src.js/main.js',content:'const b=1;'}],[{name:'SRC.js/main.js',content:'const b=1;'},{name:'src.js',content:'const a=1;'}]]){
  await assert.rejects(createArtifacts({files}));
  await assert.rejects(inspectAppProject(files,{application:false}));
 }
});

test('malformed file objects have a controlled public validation error',async()=>{for(const file of [null,undefined,42])await assert.rejects(createArtifacts({files:[file]}),error=>error.status===400&&error.publicMessage===true);});

function reminderUI(){let account='first',writes=0;const controls=new Map(),root={};const document={getElementById(id){if(!controls.has(id)){let value='';controls.set(id,{value:'',textContent:'UTC',dataset:{mode:'once'},classList:{contains:()=>true,toggle(){}},get textContent(){return value;},set textContent(v){value=v;if(id==='reminderStatus')writes++;}});}return controls.get(id);}};document.getElementById('reminderCount').value='1';const source=fs.readFileSync('public/reminders.js','utf8').replace('root.PongyReminders={init,','root.PongyReminders={setContext(value){ctx=value;},saveTest:save,init,');vm.runInNewContext(source,{window:root,document,localStorage:{getItem:()=>null},console});root.PongyReminders.setContext({ready:()=>true,account:()=>account,lang:()=> 'en',api:async()=>{account='second';throw Error('old account failure');},notify(){writes++;},events(){}});return {ui:root.PongyReminders,writes:()=>writes};}
test('late schedule load failure cannot change another account status',async()=>{const f=reminderUI();await f.ui.poll();assert.equal(f.writes(),0);});
test('late schedule save failure cannot change another account status',async()=>{const f=reminderUI();await f.ui.saveTest();assert.equal(f.writes(),0);});
