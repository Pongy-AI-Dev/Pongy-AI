import {requestedConnections} from './connections.js';
// Only explicit requests, or narrow follow-ups anchored in recent USER messages.
// Assistant text and reference documents never grant access to a service.
export function connectionScope(messages=[]){
 const users=messages.filter(m=>m.role==='user').slice(-5),text=String(users.at(-1)?.content||users.at(-1)?.text||'');
 if(/^(?:что такое\s|как (?:подключ|настро)|how (?:to )?(?:connect|set up)\s|what is\s)/iu.test(text))return [];
 if(/(?:не\s+(?:надо\s+|нужно\s+)?(?:читай|читать|открывай|открывать|смотри|смотреть|используй|использовать)|do not (?:read|open|use)|don't (?:read|open|use))/iu.test(text)||/^(?:отключи|подключи|disconnect|connect|отправь|удали|send|delete)\s/iu.test(text))return [];
 const direct=requestedConnections(text);if(direct.length)return /(?:прочита|прочти|читай|посмотр|покажи|найди|изучи|проверь|проанализ|обобщ|сводк|что|какие|список|репозитор|письм|событи|файл|документ|канал|почт|календар|\b(?:read|review|show|find|search|list|summari|analy|what|which|repo|mail|file|event|channel|document))/iu.test(text)?direct:[];
 if(!/^(?:(?:открой|прочитай|покажи|найди|расскажи|что(?:\s+написано)?\s+в)\s|(?:open|read|show|find|what (?:is|does))\b)/iu.test(text))return [];
 if(!/(?:файл|письм|событи|репозитор|канал|документ|второ|перв|последн|\b(?:it|that|file|email|message|event|repository|channel|second|first)\b)/iu.test(text))return [];
 for(const m of users.slice(0,-1).reverse()){const scope=connectionScope([m]);if(scope.length)return scope;}
 return [];
}
export function connectionReadArgs(service,text){
 const quoted=String(text).match(/[«“"]([^»”"]{1,150})[»”"]/u)?.[1];
 if(service==='github'){
  const path=String(text).match(/(?:https:\/\/github\.com\/)?([\w.-]+\/[\w.-]+\/(?:[\p{L}\p{N}_.@-]+\/)*[\p{L}\p{N}_.@-]+)/u)?.[1];
  // GitHub web URLs with blob/tree need an explicit ref, not a guessed path.
  if(path&&!/\/(?:blob|tree)\//.test(path))return {service,action:'read',resource:path};
 }
 return {service,action:quoted&&service!=='slack'?'search':'list',...(quoted&&service!=='slack'?{query:quoted}:{})};
}
export async function connectionSnapshot(connections,uid,messages,{signal}={}){
 const scope=connectionScope(messages),catalogue=connections.list(uid),text=String(messages.at(-1)?.content||messages.at(-1)?.text||'');
 const results=await Promise.all(scope.slice(0,2).map(async service=>{
  if(!catalogue.some(c=>c.id===service&&c.connected))return {service,error:'CONNECTION_NOT_CONNECTED'};
  const args=connectionReadArgs(service,text);try{return {request:args,...await connections.read(uid,args,{signal})};}catch(e){return {service,error:e.code||'CONNECTION_UNAVAILABLE'};}
 }));return {scope,results};
}
