import crypto from 'node:crypto';
import {prepareImagePrompt} from './image-prompt.js';
import sharp from 'sharp';
import {requireSafe} from './safety.js';
import {withSignal,providerJson} from './provider-io.js';
export const CLOUDFLARE_IMAGE_MODEL='@cf/black-forest-labs/flux-1-schnell';
const states=new WeakMap();
const state=config=>{if(!states.has(config))states.set(config,{day:'',count:0,blockedUntil:0,active:0});return states.get(config);};
const fail=(code,error)=>({code,error});
export function cloudflareImageConfigured(config){return config.imageProvider==='cloudflare'&&config.imageGenerationEnabled===true&&!!config.cloudflareToken&&/^[a-f0-9]{32}$/i.test(config.cloudflareAccountId||'')&&config.imageModel===CLOUDFLARE_IMAGE_MODEL;}
function limit(config){return Math.min(60,Math.max(1,Math.floor(Number(config.cloudflareImageDailyLimit)||60)));}
// A request cap, NOT a guarantee of free Neurons when other apps share the CF account.
// Persist reservations, including failed requests, so restart/parallel requests cannot reset the cap.
export function mountCloudflareBudget(config,db,now=Date.now){
 db.exec('CREATE TABLE IF NOT EXISTS cloudflare_image_budget(account TEXT NOT NULL,day TEXT NOT NULL,count INTEGER NOT NULL DEFAULT 0,blocked_until INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(account,day))');
 const account=String(config.cloudflareAccountId||''),day=()=>new Date(now()).toISOString().slice(0,10);
 config.cloudflareBudget={reserve:db.transaction(()=>{const d=day();db.prepare('INSERT OR IGNORE INTO cloudflare_image_budget(account,day,count,blocked_until) VALUES(?,?,0,0)').run(account,d);const row=db.prepare('SELECT count,blocked_until FROM cloudflare_image_budget WHERE account=? AND day=?').get(account,d);if(row.blocked_until>now()||row.count>=limit(config))return false;db.prepare('UPDATE cloudflare_image_budget SET count=count+1 WHERE account=? AND day=?').run(account,d);return true;}),block:until=>{db.prepare('UPDATE cloudflare_image_budget SET blocked_until=MAX(blocked_until,?) WHERE account=? AND day=?').run(until,account,day());}};
}
function reserve(config,now){if(config.cloudflareBudget)return config.cloudflareBudget.reserve();const s=state(config),day=new Date(now).toISOString().slice(0,10);if(s.day!==day){s.day=day;s.count=0;s.blockedUntil=0;}if(s.count>=limit(config)||s.blockedUntil>now)return false;s.count++;return true;}
function block(config,until){state(config).blockedUntil=until;config.cloudflareBudget?.block(until);}
export async function cloudflareImage(config,prompt,fetchImpl=fetch,signal){
 if(!cloudflareImageConfigured(config))return fail('IMAGE_DISABLED','Cloudflare Workers AI не настроен для генерации изображений.');
 if(typeof prompt!=='string'||!prompt.trim()||prompt.length>2000)return fail('IMAGE_PROMPT_INVALID','Укажите описание изображения до 2000 символов.');
 requireSafe(prompt,{image:true});signal?.throwIfAborted();const s=state(config);
 if(s.active>=2)return fail('IMAGE_BUSY','Генератор сейчас занят. Повторите запрос чуть позже.');
 if(!reserve(config,Date.now()))return fail('IMAGE_RATE_LIMIT','Достигнут лимит генерации изображений или сервис попросил подождать. Повторите позже.');
 s.active++;
 const timeout=AbortSignal.timeout(Math.min(90000,Math.max(1000,Number(config.cloudflareImageTimeoutMs)||60000))),bounded=signal?AbortSignal.any([signal,timeout]):timeout;
 try{
  const steps=Math.min(8,Math.max(1,Math.floor(Number(config.cloudflareImageSteps)||4)));
  const url='https://api.cloudflare.com/client/v4/accounts/'+config.cloudflareAccountId+'/ai/run/'+CLOUDFLARE_IMAGE_MODEL;
  const prepared=await prepareImagePrompt(config,prompt,fetchImpl,bounded);
  const response=await withSignal(fetchImpl(url,{method:'POST',redirect:'error',signal:bounded,headers:{Authorization:'Bearer '+config.cloudflareToken,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({prompt:prepared,steps})}),bounded);
  if(!response.ok){void response.body?.cancel().catch(()=>{});if([402,429].includes(response.status)){const value=response.headers?.get('retry-after'),number=Number(value),retry=number>0?number*1000:Math.max(0,Date.parse(value)-Date.now())||60000;block(config,Date.now()+Math.max(1000,Math.min(86400000,retry)));return fail('IMAGE_RATE_LIMIT','Cloudflare временно ограничил генерацию. Повторите позже.');}return fail([401,403].includes(response.status)?'IMAGE_ACCESS_DENIED':'IMAGE_UNAVAILABLE','Cloudflare не выполнил генерацию изображения.');}
  const data=await providerJson(response,bounded),image=data?.result?.image;
  if(data.success===false||typeof image!=='string'||image.length<4||image.length>8*1024*1024||image.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(image))return fail('IMAGE_INVALID','Cloudflare не вернул корректное изображение.');
  const original=Buffer.from(image,'base64');let buffer;
  for(const quality of [92,84,74,64]){bounded.throwIfAborted();buffer=await withSignal(sharp(original,{limitInputPixels:16000000,failOn:'error'}).rotate().resize({width:quality<74?1280:1600,height:quality<74?1280:1600,fit:'inside',withoutEnlargement:true}).flatten({background:'#fff'}).jpeg({quality}).toBuffer(),bounded);if(buffer.length<=512000)break;}
  if(!buffer?.length||buffer.length>512000)return fail('IMAGE_TOO_LARGE','Изображение слишком большое для сохранения.');
  signal?.throwIfAborted();
  return {file:{id:crypto.randomUUID(),name:'Pongy-FLUX-'+Date.now()+'.jpg',mime:'image/jpeg',bytes:buffer.length,text:'',image:true,generated:true,base64:buffer.toString('base64'),updated_at:Date.now()},model:CLOUDFLARE_IMAGE_MODEL,attribution:'Cloudflare Workers AI · FLUX.1 schnell'};
 }catch(error){if(signal?.aborted)throw error;return fail('IMAGE_UNAVAILABLE','Генерация изображения временно недоступна. Повторите попытку позже.');}finally{s.active--;}
}
