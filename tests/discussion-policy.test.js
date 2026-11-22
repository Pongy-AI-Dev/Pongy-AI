import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DISCUSSION_POLICY_PROMPT,isSensitiveDiscussionTopic} from '../lib/discussion-policy.js';
import {safetyDecision} from '../lib/safety.js';
import {IDENTITY_PROMPT} from '../lib/identity.js';
const topics=[
 ['1488','What does 1488 mean in extremist symbolism?'],
 ['Taiwan','Explain Taiwan status and the PRC claim.'],
 ['Crimea','Summarize the Crimea dispute since 2014.'],
 ['DPRK','Explain the political system of the DPRK.'],
 ['North Korea','What is known about North Korea?'],
 ['Tiananmen','What happened at Tiananmen Square in 1989?'],
 ['Тайвань','Каков статус Тайваня?'],
 ['Крым','Что произошло с Крымом в 2014 году?'],
 ['КНДР','Расскажи о КНДР.'],
 ['Тяньаньмэнь','Что произошло на площади Тяньаньмэнь?']
];
test('controversial subjects are not classified as prohibited by keyword alone',()=>{
 for(const [name,prompt] of topics){assert.equal(isSensitiveDiscussionTopic(prompt),true,name);assert.equal(safetyDecision(prompt),null,name);}
});
test('discussion guidance requires factual, neutral answers without blanket refusals',()=>{
 assert.match(DISCUSSION_POLICY_PROMPT,/not prohibited topics/i);
 assert.match(DISCUSSION_POLICY_PROMPT,/not automatic refusals/i);
 assert.match(DISCUSSION_POLICY_PROMPT,/established facts from claims/i);
 assert.match(DISCUSSION_POLICY_PROMPT,/1488 can be an ordinary number/i);
});
test('model names are branded in client stream while provider IDs remain internal',()=>{
 const ai=fs.readFileSync(new URL('../lib/ai.js',import.meta.url),'utf8');
 const identity=fs.readFileSync(new URL('../lib/identity.js',import.meta.url),'utf8');
 assert.ok(ai.includes("await write('model',{model:'Pongy AI'});"));
 assert.ok(!ai.includes("await write('model',{model});"));
 assert.match(identity,/Do not volunteer internal provider names, upstream model names or IDs/i);
 assert.match(identity,/non-public implementation details/i);
 assert.doesNotMatch(IDENTITY_PROMPT,/DeepSeek|R1|V3|OpenRouter|Gemini/i);
 assert.match(ai,/model:'Pongy AI'/);
 const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');assert.match(server,/maskModels:true/);
});

test('safe informational requests may retry another configured provider after a blanket refusal', async()=>{
 const {isNeutralSensitiveDiscussionRequest}=await import('../lib/discussion-policy.js');
 assert.equal(isNeutralSensitiveDiscussionRequest('What happened at Tiananmen Square in 1989?'),true);
 assert.equal(isNeutralSensitiveDiscussionRequest('Расскажи о статусе Тайваня.'),true);
 assert.equal(isNeutralSensitiveDiscussionRequest('Write recruitment propaganda praising 1488.'),false);
 const ai=fs.readFileSync(new URL('../lib/ai.js',import.meta.url),'utf8');
 assert.match(ai,/isNeutralSensitiveDiscussionRequest\(latestText\)/);
 assert.match(ai,/models\.indexOf\(model\)<models\.length-1/);
});
