import test from 'node:test';
import assert from 'node:assert/strict';
import {completionRequest,directCandidates} from '../lib/text-provider.js';

test('thinking levels map to real supported provider parameters',()=>{
 const c={openrouterKey:'fixture',frontendUrl:'https://example.test',maxOutputTokens:2048};
 const levels=['low','middle','high','extra'],expected=['low','medium','high','high'];
 for(let i=0;i<levels.length;i++){
  const body=JSON.parse(completionRequest(c,'openrouter/free',[{role:'user',content:'Explain'}],[],{reasoningLevel:levels[i],reasoningAvailable:true}).options.body);
  assert.equal(body.reasoning.effort,expected[i]);
  assert.deepEqual(body.provider.max_price,{prompt:0,completion:0});
 }
});
test('Gemini thinking effort and DeepSeek thinking switch follow selected level',()=>{
 const g={geminiEnabled:true,geminiKey:'fixture',geminiModel:'gemini-3.8-flash'};
 for(const [level,expected] of [['low','minimal'],['middle','medium'],['high','high'],['extra','high']]){
  const body=JSON.parse(completionRequest(g,'gemini-direct/gemini-3.8-flash',[{role:'user',content:'Explain'}],[],{reasoningLevel:level}).options.body);
  assert.equal(body.reasoning_effort,expected);
 }
 const d={deepseekEnabled:true,deepseekAllowPaid:true,deepseekKey:'fixture'};
 assert.equal(JSON.parse(completionRequest(d,'deepseek-direct/deepseek-flash',[],[],{reasoningLevel:'middle'}).options.body).thinking.type,'disabled');
 assert.equal(JSON.parse(completionRequest(d,'deepseek-direct/deepseek-flash',[],[],{reasoningLevel:'extra'}).options.body).thinking.type,'enabled');
});
test('model tier changes actual candidate ordering and the extra tier prefers the higher-capability route',()=>{
 const c={geminiEnabled:true,geminiKey:'fixture',geminiModel:'gemini-3.8-flash',geminiFastModel:'gemini-3.5-flash-lite',deepseekEnabled:true,deepseekAllowPaid:true,deepseekKey:'fixture',deepseekModel:'deepseek-flash',openrouterKey:'fixture'};
 assert.equal(directCandidates(c,{tier:'low'})[0],'gemini-direct/gemini-3.5-flash-lite');
 assert.equal(directCandidates(c,{tier:'standard'})[0],'gemini-direct/gemini-3.8-flash');
 assert.equal(directCandidates(c,{tier:'flash'})[0],'gemini-direct/gemini-3.5-flash-lite');
 assert.equal(directCandidates(c,{tier:'extra'})[0],'deepseek-direct/deepseek-flash');
});
