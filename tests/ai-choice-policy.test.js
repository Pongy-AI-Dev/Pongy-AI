import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('public/ai-choice-policy.js','utf8');
function policy(){const window={};vm.runInNewContext(source,{window,Object});return window.PongyAIChoicePolicy;}
test('Extra model and extra thinking are paid choices',()=>{const p=policy();assert.equal(p.requiresPaid('extra','middle'),true);assert.equal(p.requiresPaid('low','extra'),true);assert.equal(p.requiresPaid('standard','high'),false);});
test('expired subscription restores paid choices to free defaults on page load',()=>{const p=policy(),v=p.normalize('extra','extra',false);assert.equal(v.agent,'standard');assert.equal(v.thinking,'high');assert.equal(v.changed,true);});
test('active subscription preserves paid choices and free choices remain unchanged',()=>{const p=policy(),v=p.normalize('extra','extra',true),free=p.normalize('standard','high',false),flash=p.normalize('flash','middle',false),legacy=p.normalize('low','middle',false);assert.equal(v.agent,'extra');assert.equal(v.thinking,'extra');assert.equal(v.changed,false);assert.equal(free.agent,'standard');assert.equal(free.thinking,'high');assert.equal(free.changed,false);assert.equal(flash.agent,'flash');assert.equal(legacy.agent,'low');});
test('new users default to Pongy 2 Free while legacy Pongy 1.9 remains selectable',()=>{const p=policy();assert.equal(p.normalize(undefined,'middle',false).agent,'standard');assert.equal(p.normalize('low','middle',false).agent,'low');});
