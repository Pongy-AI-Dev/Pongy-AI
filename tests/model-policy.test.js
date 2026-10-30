import test from 'node:test';import assert from 'node:assert/strict';
import {isFreeId,zeroPriceModel,modelOrder,requestProfile,PAID_MODELS_ENABLED} from '../lib/model-policy.js';
import {FreeAI} from '../lib/ai.js';import {quickConversation,CONVERSATION_PROMPT} from '../lib/conversation.js';
import {createTools} from '../lib/tools.js';
const main='nvidia/nemotron-3.5-super-vl:free';
function ready(preferences=[],count=6){const ai=new FreeAI({modelPreferences:preferences,maxAiAttempts:count},async()=>{throw Error('No metadata fetch expected')});ai.expires=Date.now()+10000;ai.catalog=[...new Set([...modelOrder(),...modelOrder('coding')])].map(id=>({id,vision:!id.includes('laguna'),tools:true,reasoning:true,context:1000000}));return ai}
test('free identity and every live pricing dimension must be explicitly zero',()=>{
 assert(isFreeId(main));assert(isFreeId('openrouter/free'));assert(!isFreeId('openrouter/auto'));assert(!PAID_MODELS_ENABLED);
 const row={id:main,pricing:{prompt:'0',completion:'0'}};assert(zeroPriceModel(row));
 for(const row2 of [{...row,id:'paid/model'},{...row,pricing:{prompt:'0'}},{...row,pricing:{prompt:null,completion:'0'}},{...row,pricing:{prompt:'',completion:'0'}},{...row,pricing:{prompt:'0',completion:'0',image:'0.01'}},{...row,pricing:{prompt:'0',completion:'0',internal_reasoning:'1'}},{...row,pricing:{prompt:'0',completion:'0',web_search:null}},{...row,pricing:{prompt:'0',completion:'0',request:'unknown'}},{...row,id:'vendor/content-safety:free'}])assert(!zeroPriceModel(row2),JSON.stringify(row2));
});
test('balanced, programming and mathematics route only to eligible free catalogue entries',async()=>{
 const ai=ready();assert.equal((await ai.models(null))[0],main);assert.equal((await ai.models(null,false,100,true,'coding'))[0],'poolside/laguna-s-2.1:free');assert.equal((await ai.models(null,true,100,true,'coding'))[0],main);
 assert.equal(modelOrder('complex')[1],'nvidia/nemotron-3-ultra-550b-a55b:free');assert.equal(requestProfile([{role:'user',content:'Реши задачу по геометрии'}]),'complex');assert.equal(requestProfile([{role:'user',content:'Поч?'}],'coding'),'coding');assert.equal(requestProfile([{role:'user',content:'Напиши Python код'}]),'coding');
});
test('expanded free pool caps at sixteen unique candidates; free router stays reachable; cooldowns are respected',async()=>{
 const ai=ready([],16);ai.catalog.push(...Array.from({length:12},(_,i)=>({id:'extra-'+i+':free',context:100000})));const first=await ai.models(null);assert.equal(first.length,16);assert.equal(new Set(first).size,16);assert.equal(first.at(-1),'openrouter/free');assert(first.every(isFreeId));
 ai.mark(main,false,0,429);assert(!(await ai.models(null)).includes(main));ai.mark('openrouter/free',false,0,429);assert(!(await ai.models(null)).includes('openrouter/free'));
 ai.config.modelPreferences=['paid/model','google/gemma-4-31b-it:free'];assert.equal((await ai.models(null))[0],'google/gemma-4-31b-it:free');ai.catalog.push({id:'paid/model',context:1000000,tools:true});assert(!(await ai.models(null)).includes('paid/model'));
});
test('live paid extras and paid owner hints never reach the completions endpoint',async()=>{
 const ai=new FreeAI({modelPreferences:['fake:free'],maxAiAttempts:6,modelCacheMs:1000},async()=>Response.json({data:[{id:'fake:free',pricing:{prompt:'0',completion:'0',request:'.01'}},{id:main,pricing:{prompt:'0',completion:'0'},architecture:{input_modalities:['text','image'],output_modalities:['text']}}]}));const ids=await ai.models(null);assert.equal(ids[0],main);assert(!ids.includes('fake:free'));
});
test('local greetings are warm, bounded and never grant developer status from a nickname',()=>{
 const s=quickConversation('Привет!',{nickname:'<script>\n**Admin**',email:'other@example.test',email_verified:1});assert.match(s,/Чем могу помочь/);assert(!s.includes('<'));assert(!s.includes('разработчика'));assert.equal(quickConversation('Привет! Напиши код',{}),null);assert.equal(quickConversation('Поч?',{}),null);
 assert.match(quickConversation('Hello',{nickname:'Sam'}),/Hello, Sam/);assert.match(quickConversation('Hi',{email:'sergiv1609@gmail.com',email_verified:0}),/How can I help/);assert(!quickConversation('Hi',{email:'sergiv1609@gmail.com',email_verified:0}).includes('developer'));assert.match(quickConversation('Hi',{email:'sergiv1609@gmail.com',email_verified:1}),/developer/);
 for(const entry of ['поч/поч?','всм/всм?','пж/пжлст','wdym','tl;dr','surrounding conversation','one requested language','successful tools'])assert(CONVERSATION_PROMPT.includes(entry),entry);
});
test('explicit Russian and English link requests expose research tools with search toggle off',()=>{
 for(const content of ['Дай ссылку на официальный сайт Python','Пришли ссылки на источники','Can you give me a link to the documentation?']){const t=createTools({req:{user:{id:1},body:{messages:[{role:'user',content}]}},config:{},saveFile:()=>{}});assert(t.tools.some(t=>t.function.name==='web_search'),content)}
 const t=createTools({req:{user:{id:1},body:{messages:[{role:'user',content:'Explain a sorting algorithm'}]}},config:{},saveFile:()=>{}});assert(!t.tools.some(t=>t.function.name==='web_search'));
});

test('output token limits are reported, never finalized or attached as a complete code file',async()=>{
 const {EventEmitter}=await import('node:events');let persisted=0;
 const ai=new FreeAI({openrouterKey:'fixture',aiTotalMs:1000,aiAttemptMs:300,maxConcurrent:1,maxOutputTokens:128,maxAiAttempts:1,modelPreferences:[]},async()=>new Response('data: '+JSON.stringify({choices:[{delta:{content:'```python\npartial'}}]})+'\n\ndata: '+JSON.stringify({choices:[{delta:{},finish_reason:'length'}]})+'\n\n'));
 ai.expires=Date.now()+10000;ai.catalog=[{id:'fixture:free',context:10000}];const res=new EventEmitter();res.output='';res.set=()=>res;res.flushHeaders=()=>res.headersSent=true;res.write=t=>{res.output+=t;return true};res.end=t=>{res.output+=t||'';res.writableEnded=true};await ai.respond({user:{id:1},body:{}},res,[{role:'user',content:'Write code'}],{onAnswer:()=>{persisted++}});assert.match(res.output,/AI_OUTPUT_LIMIT/);assert(!res.output.includes('[DONE]'));assert.equal(persisted,0);assert.equal(ai.busy.size,0);
});

test('five failed free candidates reach the sixth free fallback without paid dispatch',async()=>{
 const {EventEmitter}=await import('node:events');const attempted=[];const ai=ready([],6);Object.assign(ai.config,{openrouterKey:'fixture',aiTotalMs:1500,aiAttemptMs:100,maxConcurrent:1,maxOutputTokens:128});
 ai.fetch=async(_url,opts)=>{const body=JSON.parse(opts.body);attempted.push(body.model);assert.equal(body.provider.max_price.prompt,0);assert.equal(body.provider.max_price.completion,0);return body.model==='openrouter/free'?new Response('data: {"choices":[{"delta":{"content":"Free fallback answer"},"finish_reason":"stop"}]}\n\n'):new Response('',{status:502})};
 const res=new EventEmitter();res.output='';res.set=()=>res;res.flushHeaders=()=>res.headersSent=true;res.write=t=>{res.output+=t;return true};res.end=t=>{res.output+=t||'';res.writableEnded=true};await ai.respond({user:{id:1},body:{}},res,[{role:'user',content:'Explain a useful concept'}]);assert.equal(attempted.length,6);assert(attempted.every(isFreeId));assert.equal(attempted.at(-1),'openrouter/free');assert.match(res.output,/Free fallback answer/);assert.match(res.output,/DONE/);assert.equal(ai.busy.size,0);
});
