import crypto from 'node:crypto';
import {FreeAI} from './ai.js';
import {USER_PROVIDERS} from './user-api-providers.js';
export {USER_PROVIDERS} from './user-api-providers.js';
const fail=(message,status=400,code='USER_API_INVALID')=>Object.assign(new Error(message),{status,code,publicMessage:true});
export function createUserApi({db,config,fetchImpl,now=Date.now,busy}){
 db.exec('CREATE TABLE IF NOT EXISTS user_api(user_id INTEGER PRIMARY KEY,sealed TEXT NOT NULL,updated_at INTEGER NOT NULL)');
 const key=crypto.createHash('sha256').update('pongy-user-api-v1\0'+config.jwtSecret).digest();
 function seal(id,value){const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key,iv);c.setAAD(Buffer.from(String(id)));const encrypted=Buffer.concat([c.update(JSON.stringify(value)),c.final()]);return Buffer.concat([iv,c.getAuthTag(),encrypted]).toString('base64');}
 function read(id){const row=db.prepare('SELECT sealed FROM user_api WHERE user_id=?').get(id);if(!row)return null;try{const b=Buffer.from(row.sealed,'base64'),c=crypto.createDecipheriv('aes-256-gcm',key,b.subarray(0,12));c.setAAD(Buffer.from(String(id)));c.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([c.update(b.subarray(28)),c.final()]).toString());}catch{throw fail('Личный API недоступен. Удалите и подключите ключ повторно.',503,'USER_API_UNREADABLE');}}
 function status(id){const v=read(id);return v?{connected:true,provider:v.provider,providerName:USER_PROVIDERS[v.provider]?.name||v.provider,model:v.model,validatedAt:v.validatedAt,consent:v.consent===true||!!v.validatedAt,models:Array.isArray(v.models)&&v.models.length?v.models:[{id:v.model,owner:USER_PROVIDERS[v.provider]?.name||v.provider}]}:{connected:false};}
 // The sealed blob can be mirrored to cloud storage and restored after the local
 // database is lost, so re-signing in no longer drops the personal API activation.
 function exportSealed(id){return db.prepare('SELECT sealed FROM user_api WHERE user_id=?').get(id)?.sealed||null;}
 function restore(id,sealed){if(typeof sealed!=='string'||sealed.length<32||sealed.length>65536||!/^[A-Za-z0-9+/]+={0,2}$/.test(sealed))return false;try{const b=Buffer.from(sealed,'base64'),c=crypto.createDecipheriv('aes-256-gcm',key,b.subarray(0,12));c.setAAD(Buffer.from(String(id)));c.setAuthTag(b.subarray(12,28));JSON.parse(Buffer.concat([c.update(b.subarray(28)),c.final()]).toString());}catch{return false;}db.prepare('INSERT INTO user_api VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET sealed=excluded.sealed,updated_at=excluded.updated_at').run(id,sealed,now());return true;}
 function forget(id){db.prepare('DELETE FROM user_api WHERE user_id=?').run(id);}
 function modelHeaders(provider,key){return provider==='gemini'?{'x-goog-api-key':key}:{Authorization:'Bearer '+key};}
 function modelUrl(provider){const p=USER_PROVIDERS[provider];return p.base+p.models;}
 function extractModels(provider,data){
  const p=USER_PROVIDERS[provider],source=provider==='gemini'?data.models:provider==='cohere'?data.models:data.data;
  if(!Array.isArray(source))throw fail('Провайдер вернул неожиданный список моделей.',502,'USER_API_RESPONSE_INVALID');
  return source.slice(0,1000).flatMap(value=>{
   if(!value||typeof value!=='object')return[];
   if(provider==='gemini'&&!(value.supportedGenerationMethods||[]).includes('generateContent'))return[];
   const id=provider==='gemini'?String(value.name||'').replace(/^models\//,''):provider==='cohere'?String(value.name||''):String(value.id||'');
   if(!/^[\w./:-]{1,120}$/.test(id))return[];
   const reportedOwner=value.owned_by||value.developer||value.creator||value.publisher||value.organization||value.provider;
   const owner=typeof reportedOwner==='string'?reportedOwner.replace(/[\x00-\x1f\x7f]/g,'').trim().slice(0,80):'';
   return[{id,owner}];
  }).sort((a,b)=>a.id.localeCompare(b.id,undefined,{sensitivity:'base'}));
 }
 async function models(provider,key){
  if(!Object.hasOwn(USER_PROVIDERS,provider)||typeof key!=='string'||!/^[\x21-\x7e]{16,512}$/.test(key))throw fail('Выберите провайдера и введите корректный API-ключ.');
  let response;try{response=await fetchImpl(modelUrl(provider),{headers:modelHeaders(provider,key),redirect:'error',signal:AbortSignal.timeout(12000)});}catch{throw fail('Провайдер не ответил. Проверьте подключение и попробуйте ещё раз.',503,'USER_API_UNAVAILABLE');}
  if(!response.ok)throw fail('Провайдер отклонил ключ. Проверьте его доступ и тариф.',400);
  let data;try{data=await response.json();}catch{throw fail('Провайдер вернул некорректный список моделей.',502,'USER_API_RESPONSE_INVALID');}
  return extractModels(provider,data);
 }
 async function set(id,input){if(!input||!Object.hasOwn(USER_PROVIDERS,input.provider)||typeof input.model!=='string'||! /^[\w./:-]{1,120}$/.test(input.model))throw fail('Укажите провайдера и доступную модель.');if(input.consent!==true)throw fail('Подтвердите использование тарифов своего провайдера.');const available=await models(input.provider,input.key);if(!available.some(model=>model.id===input.model))throw fail('Модель отсутствует в списке доступных этому ключу моделей.');const v={provider:input.provider,model:input.model,key:input.key,consent:true,models:[available.find(m=>m.id===input.model),...available.filter(m=>m.id!==input.model).slice(0,99)],validatedAt:now()};db.prepare('INSERT INTO user_api VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET sealed=excluded.sealed,updated_at=excluded.updated_at').run(id,seal(id,v),now());return status(id);}
 function engine(value){const own=new FreeAI({...config,userApi:value,openrouterKey:value.key,deepseekEnabled:false,geminiEnabled:false},fetchImpl,now);own.models=async()=>[value.model];own.busy=busy;return own;}
 return {read,status,set,models,exportSealed,restore,forget,providers:()=>Object.entries(USER_PROVIDERS).map(([id,p])=>({id,name:p.name,company:p.company})).sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:'base'})),remove:id=>db.prepare('DELETE FROM user_api WHERE user_id=?').run(id),engine};
}
