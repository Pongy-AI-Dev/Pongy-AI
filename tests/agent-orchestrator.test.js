import test from 'node:test';
import assert from 'node:assert/strict';
import {orchestrateAgents} from '../lib/agent-orchestrator.js';
import {FreeAI} from '../lib/ai.js';

test('planner and independent reviewer execute in order and hand off context', async () => {
  const calls = [], events = [];
  const result = await orchestrateAgents({
    models: ['model-worker','model-planner','model-reviewer'],
    context: {profile:'coding',messages:[{role:'user',content:'Build a safe feature'}]},
    invoke: async (model,messages) => {
      calls.push({model,messages});
      return model === 'model-planner' ? 'Plan: implement, test, document.' : 'Review: add permission and rollback tests.';
    },
    emit: async event => events.push(event)
  });
  assert.deepEqual(calls.map(call=>call.model),['model-planner','model-reviewer']);
  assert.match(calls[1].messages[1].content,/Plan: implement, test, document/);
  assert.match(result.review,/permission and rollback tests/);
  assert.deepEqual(events.map(event=>event.type+':'+event.agent+':'+event.status),[
    'agent_start:planner:undefined','agent_done:planner:completed',
    'agent_start:reviewer:undefined','agent_done:reviewer:completed'
  ]);
});

test('a single available model skips false multi-agent claims and records a normal-route fallback', async () => {
  const events=[];
  const result=await orchestrateAgents({models:['worker-only'],invoke:async()=>{throw new Error('must not call');},context:{task:'Use a single model'},emit:async event=>events.push(event)});
  assert.equal(result,null);
  assert.deepEqual(events,[{type:'agent_fallback',reason:'An independent reviewer model is unavailable'}]);
});

test('reviewer failure is reported and cannot be mistaken for a successful handoff', async () => {
  const events=[];
  await assert.rejects(orchestrateAgents({
    models:['worker','planner','reviewer'],
    context:{task:'Verify an update'},
    invoke:async model=>{if(model==='reviewer')throw new Error('review unavailable');return 'Plan';},
    emit:async event=>events.push(event)
  }),/review unavailable/);
  assert.equal(events.at(-1).type,'agent_done');
  assert.equal(events.at(-1).agent,'reviewer');
  assert.equal(events.at(-1).status,'failed');
});

test('AI agent completion parses bounded provider SSE without enabling tools', async () => {
  let sent;
  const stream = [
    'data: '+JSON.stringify({choices:[{delta:{content:'Independent agent result.'},finish_reason:null}]}),
    '',
    'data: '+JSON.stringify({choices:[{delta:{},finish_reason:'stop'}]}),
    '',
    'data: [DONE]',
    '',
    ''
  ].join('\n');
  const ai = new FreeAI({openrouterKey:'fixture-key',frontendUrl:'https://pongy.example',maxOutputTokens:2048,codingOutputTokens:2048},async(url,options)=>{
    sent=JSON.parse(options.body);
    return new Response(stream,{status:200,headers:{'Content-Type':'text/event-stream'}});
  });
  const result=await ai.agentCompletion('fixture:free',[{role:'system',content:'Planner role'}],AbortSignal.timeout(1000),'general');
  assert.equal(result,'Independent agent result.');
  assert.equal(sent.tools,undefined);
  assert.equal(sent.tool_choice,undefined);
  assert.equal(sent.max_tokens,1000);
});

test('truncated agent output is rejected so the main worker falls back without a partial plan', async () => {
  const stream=[
    'data: '+JSON.stringify({choices:[{delta:{content:'Partial plan'},finish_reason:'length'}]}),
    '',
    'data: [DONE]',
    '',
    ''
  ].join('\n');
  const ai=new FreeAI({openrouterKey:'fixture-key',frontendUrl:'https://pongy.example',maxOutputTokens:2048},async()=>new Response(stream,{status:200}));
  await assert.rejects(ai.agentCompletion('fixture:free',[{role:'system',content:'Planner role'}],AbortSignal.timeout(1000),'general'),/output limit/);
});



test('completed draft is independently reviewed, repaired by the worker, and re-reviewed before delivery', async () => {
  const calls = [], events = [];
  const reports = [
    JSON.stringify({status:'revise',criticalIssues:['The answer omits the requested rollback procedure.'],improvements:[],summary:'One required acceptance item is missing.'}),
    JSON.stringify({status:'pass',criticalIssues:[],improvements:[],summary:'The repaired draft now includes rollback and verification.'})
  ];
  const result = await (await import('../lib/agent-orchestrator.js')).reviewAndRepairAnswer({
    models:['worker','planner','reviewer'], workerModel:'worker',
    context:{request:'Explain deployment and rollback'}, answer:'Draft without rollback.',
    invoke:async(model,messages)=>{calls.push({model,messages});if(model==='reviewer')return reports.shift();return 'Corrected draft with deployment, rollback and verification.';},
    emit:async event=>events.push(event)
  });
  assert.deepEqual(calls.map(call=>call.model),['reviewer','worker','reviewer']);
  assert.match(calls[1].messages[1].content,/rollback procedure/);
  assert.equal(result.answer,'Corrected draft with deployment, rollback and verification.');
  assert.equal(result.status,'repaired_and_passed');
  assert.equal(result.revised,true);
  assert.equal(events.at(-1).status,'repaired_and_passed');
});

test('completed draft passes without invoking the worker repair step', async () => {
  const calls=[];
  const result=await (await import('../lib/agent-orchestrator.js')).reviewAndRepairAnswer({
    models:['worker','planner','reviewer'],workerModel:'worker',context:{request:'Answer clearly'},answer:'Complete answer.',
    invoke:async(model)=>{calls.push(model);return JSON.stringify({status:'pass',criticalIssues:[],improvements:[],summary:'Complete.'});}
  });
  assert.deepEqual(calls,['reviewer']);
  assert.equal(result.answer,'Complete answer.');
  assert.equal(result.status,'passed');
  assert.equal(result.revised,false);
});

test('review failure preserves the original draft and never claims a successful check', async () => {
  const result=await (await import('../lib/agent-orchestrator.js')).reviewAndRepairAnswer({
    models:['worker','planner','reviewer'],workerModel:'worker',context:{request:'Check this'},answer:'Original draft.',
    invoke:async()=>{throw new Error('review provider unavailable');}
  });
  assert.equal(result.answer,'Original draft.');
  assert.equal(result.status,'fallback');
  assert.equal(result.revised,false);
});

test('oversized drafts are marked unverified rather than silently reviewed in truncated form', async () => {
  let called=false;
  const answer='x'.repeat(28001);
  const result=await (await import('../lib/agent-orchestrator.js')).reviewAndRepairAnswer({
    models:['worker','planner','reviewer'],workerModel:'worker',context:{request:'Review all of it'},answer,
    invoke:async()=>{called=true;return JSON.stringify({status:'pass',criticalIssues:[],improvements:[],summary:'ok'});}
  });
  assert.equal(called,false);
  assert.equal(result.answer,answer);
  assert.equal(result.status,'unverified');
});

test('repair worker can return a bounded full corrected source instead of the short reviewer token budget', async () => {
  let sent;
  const stream=[
    'data: '+JSON.stringify({choices:[{delta:{content:'Complete corrected source.'},finish_reason:null}]}),
    '',
    'data: '+JSON.stringify({choices:[{delta:{},finish_reason:'stop'}]}),
    '',
    'data: [DONE]',
    '',
    ''
  ].join(String.fromCharCode(10));
  const ai=new FreeAI({openrouterKey:'fixture-key',frontendUrl:'https://pongy.example',maxOutputTokens:8192,codingOutputTokens:8192},async(url,options)=>{
    sent=JSON.parse(options.body);
    return new Response(stream,{status:200,headers:{'Content-Type':'text/event-stream'}});
  });
  const result=await ai.agentCompletion('fixture:free',[{role:'system',content:'Repair the full source'}],AbortSignal.timeout(1000),'coding',7000);
  assert.equal(result,'Complete corrected source.');
  assert.equal(sent.max_tokens,7000);
  assert.equal(sent.tools,undefined);
});
