import {zeroPriceModel,isFreeId} from './model-policy.js';
export async function verifiedFreeImage(config,fetchImpl=fetch,signal){
 if(!config.imageGenerationEnabled||!isFreeId(config.imageModel)||!config.openrouterKey)return false;
 const deadline=AbortSignal.timeout(8000),s=signal?AbortSignal.any([signal,deadline]):deadline;
 try{const r=await fetchImpl('https://openrouter.ai/api/v1/models',{signal:s,redirect:'error'});if(!r.ok||!r.body)return false;const reader=r.body.getReader(),chunks=[];let bytes=0;try{while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>4*1024*1024)return false;chunks.push(Buffer.from(part.value));}}finally{await reader.cancel().catch(()=>{});}const model=JSON.parse(Buffer.concat(chunks).toString('utf8')).data?.find(m=>m.id===config.imageModel);return zeroPriceModel(model)&&model.architecture?.output_modalities?.includes('image')===true;}catch(e){if(signal?.aborted)throw e;return false;}
}
