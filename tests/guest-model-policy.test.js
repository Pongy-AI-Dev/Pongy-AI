import test from 'node:test';
import assert from 'node:assert/strict';
import {FreeAI} from '../lib/ai.js';

test('guest model routing selects exactly one smallest clearly-labelled free model and never uses direct providers',async()=>{
  const models=[
    {id:'google/gemma-3-1b-it:free',pricing:{prompt:'0',completion:'0'},architecture:{input_modalities:['text'],output_modalities:['text']}},
    {id:'qwen/qwen-2.5-7b-instruct:free',pricing:{prompt:'0',completion:'0'},architecture:{input_modalities:['text'],output_modalities:['text']}},
    {id:'thinkingmachines/inkling-small:free',pricing:{prompt:'0',completion:'0'},architecture:{input_modalities:['text'],output_modalities:['text']}},
    {id:'openrouter/free',pricing:{prompt:'0',completion:'0'},architecture:{input_modalities:['text'],output_modalities:['text']}}
  ];
  let calls=0;
  const ai=new FreeAI({openrouterApiKey:'',geminiApiKey:'configured-but-not-for-guest',modelCacheMs:60000,catalogWaitMs:1200,maxAiAttempts:32},async()=>{calls++;return Response.json({data:models})});
  const selected=await ai.models(new AbortController().signal,false,0,false,'guest');
  assert.equal(calls,1);assert.deepEqual(selected,['thinkingmachines/inkling-small:free']);
});
