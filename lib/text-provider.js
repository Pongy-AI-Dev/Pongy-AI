import {userCompletion} from './user-api-request.js';
// Fixed official endpoints only. No key or prompt is placed in an URL.
export const DEEPSEEK_PREFIX='deepseek-direct/';
export const GEMINI_PREFIX='gemini-direct/';
// Pricing snapshot checked for this release. API availability/quotas remain project-specific.
export const GEMINI_FREE_MODELS=new Set(['gemini-3.8-flash','gemini-3.5-flash-lite']);
export function deepseekEnabled(config){return config.deepseekEnabled===true&&config.deepseekAllowPaid===true&&!!config.deepseekKey;}
export function geminiEnabled(config){return config.geminiEnabled===true&&!!config.geminiKey;}
export function geminiModelAllowed(config,model){return /^gemini-[a-z0-9._-]{1,70}$/.test(model||'')&&(config.geminiAllowPaid===true||GEMINI_FREE_MODELS.has(model));}
export function aiConfigured(config){return !!config.openrouterKey||deepseekEnabled(config)||geminiEnabled(config)&&[config.geminiModel||'gemini-3.8-flash',config.geminiFastModel||'gemini-3.5-flash-lite'].some(m=>geminiModelAllowed(config,m));}
export function deepseekVision(model){return ['deepseek-flash','deepseek-v4-flash','deepseek-v4-flash-vision-exp'].includes(model);}
export function textProvider(model){return model.startsWith(GEMINI_PREFIX)?'gemini':model.startsWith(DEEPSEEK_PREFIX)?'deepseek':'openrouter';}
export function directCandidates(config,{vision=false,profile='general',minContext=0}={}){
 const main=config.geminiModel||'gemini-3.8-flash',fast=config.geminiFastModel||'gemini-3.5-flash-lite';
 const google=geminiEnabled(config)?[main,fast].filter(m=>geminiModelAllowed(config,m)).map(m=>GEMINI_PREFIX+m):[];
 const deepseek=deepseekEnabled(config)&&(!vision||deepseekVision(config.deepseekModel||'deepseek-flash'))?[DEEPSEEK_PREFIX+(config.deepseekModel||'deepseek-flash')]:[];
 return [...new Set([...(profile==='coding'?deepseek:[]),...google,...(profile==='coding'?[]:deepseek),...(config.openrouterKey?['openrouter/free']:[])])];
}
export function outputBudget(config,profile){return profile==='coding'?(config.codingOutputTokens||config.maxOutputTokens):config.maxOutputTokens;}
export function completionRequest(config,model,messages,tools=[],{profile='general',maxTokens=0,voiceMode=false}={}){
 if(config.userApi)return userCompletion(config,messages,tools,profile,{voiceMode});
 const provider=textProvider(model),direct=provider!=='openrouter',google=provider==='gemini';
 const name=google?model.slice(GEMINI_PREFIX.length):direct?model.slice(DEEPSEEK_PREFIX.length):model;
 if(provider==='deepseek'&&!deepseekEnabled(config))throw Error('Direct DeepSeek requires explicit operator billing permission');
 if(google&&(!geminiEnabled(config)||!geminiModelAllowed(config,name)))throw Error('Gemini model is not enabled by the server policy');
 const budget=outputBudget(config,profile),bounded=maxTokens>0?Math.min(budget,Math.max(512,Math.round(maxTokens))):budget;
 const body={model:name,stream:true,messages,max_tokens:voiceMode?Math.min(1200,bounded):bounded,...(tools.length?{tools,tool_choice:'auto'}:{})};
 // Gemini 3 thinking cannot be disabled. Use documented small reasoning efforts, not fake off switches.
 if(google)body.reasoning_effort=voiceMode||profile==='general'&&!messages.some(m=>Array.isArray(m.content)&&m.content.some(p=>p.type==='image_url'))?'minimal':'medium';
 else{body.temperature=0.25;if(direct)body.thinking={type:'disabled'};else{body.provider={max_price:{prompt:0,completion:0}};if(voiceMode)body.reasoning={enabled:false,exclude:true};}}
 const key=google?config.geminiKey:direct?config.deepseekKey:config.openrouterKey;
 return {url:google?'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions':direct?'https://api.deepseek.com/chat/completions':'https://openrouter.ai/api/v1/chat/completions',options:{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key,...(direct?{}:{'HTTP-Referer':config.frontendUrl,'X-Title':'Pongy AI'})},body:JSON.stringify(body)}};
}
