import test from 'node:test';
import assert from 'node:assert/strict';
import {auditSourceFiles} from '../lib/code-auditor.js';
import {createTools} from '../lib/tools.js';

test('static auditor detects credentials without exposing their value',()=>{
  const secret='sk-'+('a'.repeat(32));
  const report=auditSourceFiles([{name:'src/config.js',content:'const apiKey = "'+secret+'";'}]);
  assert(report.findings.length>=1);
  assert.equal(report.findings[0].severity,'high');
  assert.equal(report.findings[0].code,'possible_generic_api_key');
  assert.equal(JSON.stringify(report).includes(secret),false);
  assert.equal(report.executed,false);
});

test('static auditor flags risky APIs as review items without matching unrelated exec methods',()=>{
  const report=auditSourceFiles([{name:'src/app.js',content:'eval(userInput);\ndatabase.exec(query);\nchild_process.exec(command);\nspawnSync(command);\nelement.innerHTML = value;'}]);
  assert(report.findings.some(f=>f.code==='dynamic_code'&&f.severity==='review'));
  assert(report.findings.some(f=>f.code==='unsafe_html'&&f.severity==='review'));
  const processFindings=report.findings.filter(f=>f.code==='shell_execution');
  assert.equal(processFindings.length,2);
  assert(processFindings.every(f=>f.severity==='review'));
});

test('complete project audit reports missing relative imports; partial audit is explicit',()=>{
  const files=[{name:'src/main.js',content:"import './missing.js';"}];
  const partial=auditSourceFiles(files);
  const complete=auditSourceFiles(files,{completeProject:true});
  assert.equal(partial.findings[0].severity,'info');
  assert.equal(complete.findings[0].severity,'info');
  assert.equal(complete.completeProject,true);
});

test('auditor rejects traversal paths and reports duplicate paths case-insensitively',()=>{
  const report=auditSourceFiles([
    {name:'../outside.js',content:'x'},
    {name:'src/App.js',content:'export const x=1;'},
    {name:'src/app.js',content:'export const y=2;'}
  ]);
  assert(report.findings.some(f=>f.code==='invalid_file'));
  assert(report.findings.some(f=>f.code==='duplicate_path'));
});

test('auditor parses JSON and enforces bounded input',()=>{
  assert(auditSourceFiles([{name:'config.json',content:'{bad'}]).findings.some(f=>f.code==='invalid_json'));
  assert.throws(()=>auditSourceFiles(Array.from({length:1001},(_,i)=>({name:'f'+i+'.js',content:''}))),/1000/);
});

test('project audit tool scans only readable source attachments and emits a bounded public work-log event',async()=>{
 const events=[];
 const req={user:{id:1},body:{locale:'en',mode:'coding',messages:[{role:'user',content:'Audit this project'}]}};
 const files=[{id:'a',name:'src/main.js',text:"import './missing.js';\\nexport const ok = true;",analysisComplete:true}];
 const tools=createTools({req,config:{},getFiles:async()=>files,saveFile:async()=>{}});
 const result=await tools.runTool('audit_project',{}, {signal:new AbortController().signal,emit:async(name,data)=>events.push({name,data})});
 assert.equal(result.filesScanned,1);
 assert.equal(result.complete,true);
 assert.equal(result.executed,false);
 assert(events.some(e=>e.name==='work_log'&&e.data.type==='code_audit'));
 assert.equal(events.find(e=>e.name==='work_log'&&e.data.type==='code_audit').data.findings[0].code,'unresolved_local_import');
});

test('private environment files are flagged by name while the example template is allowed',()=>{
 const privateFile=auditSourceFiles([{name:'config/.env.production',content:'TOKEN=placeholder'}]);
 const example=auditSourceFiles([{name:'.env.example',content:'TOKEN='}]);
 assert(privateFile.findings.some(f=>f.code==='private_env_file'&&f.severity==='high'));
 assert(!example.findings.some(f=>f.code==='private_env_file'));
});
