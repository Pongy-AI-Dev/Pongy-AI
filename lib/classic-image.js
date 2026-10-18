import crypto from 'node:crypto';
import sharp from 'sharp';
import {setTimeout as sleep} from 'node:timers/promises';
import {requireSafe} from './safety.js';
let tail=Promise.resolve(),queued=0,nextAt=0;
// Respect the provider's ONE shared anonymous request per 45 seconds.
// Never rotate IPs, pay x402, send keys, or silently replace AI images with photos.
export async function classicImage(prompt,fetchImpl=fetch,signal){
 if(typeof prompt!=='string'||!prompt.trim()||prompt.length>2000)return {error:'Укажите описание изображения до 2000 символов.',code:'IMAGE_PROMPT_INVALID'};
 requireSafe(prompt,{image:true});
 if(queued>=3)return {error:'Очередь бесплатной генерации заполнена. Повторите через две минуты.',code:'IMAGE_QUEUE_FULL'};
 queued++;const previous=tail;let unlock;tail=new Promise(r=>unlock=r);
 try{await previous;signal?.throwIfAborted();const wait=nextAt-Date.now();if(wait>120000)return {error:'Сервис попросил подождать перед следующей генерацией.',code:'IMAGE_RATE_LIMIT',retryAfter:Math.ceil(wait/1000)};if(wait>0)await sleep(wait,undefined,{signal});signal?.throwIfAborted();nextAt=Date.now()+46000;
 const url=new URL('https://image.pollinations.ai/prompt/'+encodeURIComponent(prompt.trim()));url.searchParams.set('width','768');url.searchParams.set('height','768');url.searchParams.set('safe','true');url.searchParams.set('seed',String(crypto.randomInt(1,2147483647)));
 const timeout=AbortSignal.timeout(90000),s=signal?AbortSignal.any([signal,timeout]):timeout;
 const response=await fetchImpl(url.href,{signal:s,redirect:'error',headers:{Accept:'image/jpeg','User-Agent':'Pongy-AI/0.18.1'}});
 if(!response.ok){const retry=Math.min(300,Math.max(46,Number(response.headers.get('retry-after'))||46));if([402,429].includes(response.status))nextAt=Math.max(nextAt,Date.now()+retry*1000);await response.body?.cancel().catch(()=>{});return {error:[402,429].includes(response.status)?'Бесплатный сервис просит подождать перед следующей генерацией.':'Бесплатный сервис изображений сейчас не ответил.',code:[402,429].includes(response.status)?'IMAGE_RATE_LIMIT':'IMAGE_UNAVAILABLE',retryAfter:retry};}
 if(!/^image\/(jpeg|png|webp)(?:;|$)/i.test(response.headers.get('content-type')||'')){await response.body?.cancel().catch(()=>{});return {error:'Сервис не вернул изображение.',code:'IMAGE_INVALID'};}
 const reader=response.body?.getReader();if(!reader)return {error:'Пустой ответ сервиса.',code:'IMAGE_INVALID'};let size=0;const chunks=[];try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>5*1024*1024)throw Error('Image too large');chunks.push(Buffer.from(part.value));}}finally{await reader.cancel().catch(()=>{});}
 const data=Buffer.concat(chunks);let buffer;for(const quality of [90,80,68]){buffer=await sharp(data,{limitInputPixels:16000000,failOn:'error'}).rotate().resize({width:768,height:768,fit:'inside',withoutEnlargement:true}).flatten({background:'#fff'}).jpeg({quality}).toBuffer();if(buffer.length<=512000)break;}
 if(buffer.length>512000)return {error:'Изображение слишком большое для сохранения.',code:'IMAGE_TOO_LARGE'};
 return {file:{id:crypto.randomUUID(),name:'Pongy-image-'+Date.now()+'.jpg',mime:'image/jpeg',bytes:buffer.length,text:'Generated with Pollinations Classic (best effort).',image:true,generated:true,base64:buffer.toString('base64'),updated_at:Date.now()},model:'Pollinations Classic',attribution:'Pollinations AI · free Classic API; provider watermark retained'};
 }catch(error){if(signal?.aborted)throw error;return {error:'Бесплатная генерация временно недоступна. Повторите попытку позже.',code:'IMAGE_UNAVAILABLE'};}finally{queued--;unlock();}
}
