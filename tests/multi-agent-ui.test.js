import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=fs.readFileSync(path.join(root,'public/app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const ai=fs.readFileSync(path.join(root,'lib/ai.js'),'utf8');
const orchestrator=fs.readFileSync(path.join(root,'lib/agent-orchestrator.js'),'utf8');
const activity=fs.readFileSync(path.join(root,'public/activity.js'),'utf8');
const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
const history=fs.readFileSync(path.join(root,'public/local-history.js'),'utf8');

test('multi-agent mode is a visible, persistent user choice and is off unless explicitly enabled',()=>{
  assert.match(html,/id="multiAgentBtn"/);
  assert.match(app,/state\.multiAgent=!state\.multiAgent/);
  assert.match(app,/multiAgent:state\.multiAgent===true/);
  assert.match(app,/state\.multiAgent=v\.multiAgent===true/);
  assert.match(history,/multiAgent:input\.aiChoices\?\.multiAgent===true/);
  assert.match(server,/multiAgent:choices\.multiAgent===true/);
});

test('multi-agent planner and reviewer are opt-in, bounded and have a normal-route fallback',()=>{
  assert.match(ai,/const multiAgentRequested=req\.body\?\.siteContext\?\.multiAgent===true/);
  assert.match(ai,/AbortSignal\.timeout\(Math\.min\(this\.config\.aiAttemptMs,12000\)\)/);
  assert.match(ai,/agent_fallback/);
  assert.match(ai,/Independent multi-agent handoff \(planner \+ reviewer\)/);
});

test('enabled multi-agent mode reviews the completed draft and applies repair before artifact packaging',()=>{
  const reviewer=ai.indexOf('reviewAndRepairAnswer({models,workerModel:model');
  const packaging=ai.indexOf('onAnswer(finalDraft');
  assert.ok(reviewer>=0,'completed-answer reviewer is wired into the AI response flow');
  assert.ok(packaging>reviewer,'review and repair happen before onAnswer packages artifacts');
  assert.ok(ai.includes("quality?.revised&&typeof quality.answer==='string'"));
  assert.match(ai,/write\('replace',\{text:finalDraft\}\)/);
  assert.match(orchestrator,/agent_review_result/);
});

test('activity timeline distinguishes final review, worker repair and unresolved verification',()=>{
  assert.match(activity,/entry\.type==='agent_repair_start'/);
  assert.match(activity,/entry\.type==='agent_repair_done'/);
  assert.match(activity,/entry\.type==='agent_review_result'/);
  assert.match(activity,/Проверка готового ответа/);
  assert.match(activity,/Исправление по замечаниям рецензента/);
  assert.match(app,/agent_repair_start/);
  assert.match(history,/agent_review_result/);
  assert.match(history,/result_reviewer','worker/);
});
