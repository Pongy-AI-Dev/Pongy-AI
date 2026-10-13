const BASE='https://openrouter.ai/api/v1';
export async function* readSse(body){
 const reader=body.getReader(),decoder=new TextDecoder();let buffer='';
 try{
  while(true){const {done,value}=await reader.read();buffer+=done?decoder.decode():decoder.decode(value,{stream:true});buffer=buffer.replace(/\r\n/g,'\n');if(buffer.length>1024*1024)throw new Error('Oversized upstream SSE event');
   let boundary;while((boundary=buffer.indexOf('\n\n'))>=0){const block=buffer.slice(0,boundary);buffer=buffer.slice(boundary+2);const data=block.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');if(data)yield data;}
   if(done){const data=buffer.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');if(data)yield data;break;}
  }
 }finally{try{await reader.cancel();}catch{}reader.releaseLock();}
}
export class FreeAI{
 constructor(config,fetchImpl=fetch,now=Date.now){Object.assign(this,{config,fetch:fetchImpl,now});this.catalog=[];this.expires=0;this.stats=new Map();this.refresh=null;this.busy=new Set();}
 async models(signal){
  if(this.now()>this.expires){
   if(!this.refresh)this.refresh=(async()=>{try{const r=await this.fetch(BASE+'/models',{signal:AbortSignal.any([signal,AbortSignal.timeout(5000)])});if(!r.ok)throw new Error('Catalog unavailable');const j=await r.json();if(!Array.isArray(j.data))throw new Error('Invalid catalog');this.catalog=j.data.filter(m=>typeof m.id==='string'&&Number(m.pricing?.prompt)===0&&Number(m.pricing?.completion)===0&&Number(m.pricing?.request||0)===0&&(!m.architecture?.output_modalities||m.architecture.output_modalities.includes('text'))&&(!m.architecture?.input_modalities||m.architecture.input_modalities.includes('text'))).map(m=>({id:m.id,context:m.context_length||0}));this.expires=this.now()+this.config.modelCacheMs;}catch{this.expires=this.now()+30000;}finally{this.refresh=null;}})();
   await this.refresh;
  }
  const eligible=this.catalog.filter(m=>(this.stats.get(m.id)?.until||0)<=this.now());
  const preference=id=>{const i=this.config.modelPreferences.indexOf(id);return i<0?1000:i;};
  eligible.sort((a,b)=>preference(a.id)-preference(b.id)||(this.stats.get(b.id)?.success||0)-(this.stats.get(a.id)?.success||0)||(this.stats.get(a.id)?.latency||Infinity)-(this.stats.get(b.id)?.latency||Infinity)||b.context-a.context||a.id.localeCompare(b.id));
  const ids=eligible.map(m=>m.id);if((this.stats.get('openrouter/free')?.until||0)<=this.now()&&!ids.includes('openrouter/free'))ids.push('openrouter/free');
  return ids.slice(0,this.config.maxAiAttempts);
 }
 mark(id,success,latency,status){const old=this.stats.get(id)||{};this.stats.set(id,{success:(old.success||0)+(success?1:0),latency:success?latency:old.latency,until:success?0:this.now()+(status===429?60000:30000)});}
 async respond(req,res,messages){
  if(!this.config.openrouterKey)return res.status(503).json({error:'ИИ ещё не настроен владельцем сервера.',code:'AI_NOT_CONFIGURED'});
  if(this.busy.has(req.user.id)||this.busy.size>=this.config.maxConcurrent)return res.status(429).json({error:'Дождитесь завершения текущего запроса.',code:'AI_BUSY'});
  this.busy.add(req.user.id);const overall=new AbortController(),timer=setTimeout(()=>overall.abort(),this.config.aiTotalMs);const closed=()=>overall.abort();res.once('close',closed);let emitted=0;
  const write=async(event,data)=>{if(overall.signal.aborted||res.destroyed)throw new Error('Aborted');const payload=event==='done'?'data: [DONE]\n\n':'event: '+event+'\ndata: '+JSON.stringify(data)+'\n\n';
   if(!res.write(payload))await new Promise((resolve,reject)=>{const cleanup=()=>{res.off('drain',done);res.off('close',fail);overall.signal.removeEventListener('abort',fail);};const done=()=>{cleanup();resolve();};const fail=()=>{cleanup();reject(new Error('Aborted'));};res.once('drain',done);res.once('close',fail);overall.signal.addEventListener('abort',fail,{once:true});});};
  try{
   const models=await this.models(overall.signal);if(!models.length)return res.status(503).json({error:'Бесплатные модели временно недоступны.',code:'AI_UNAVAILABLE'});
   res.set({'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no'});res.flushHeaders();
   for(const model of models){
    if(overall.signal.aborted)break;
    if(emitted){await write('reset',{});emitted=0;}
    await write('model',{model});const started=this.now(),attempt=new AbortController();let attemptTimer=setTimeout(()=>attempt.abort(),this.config.aiAttemptMs);let httpStatus=0;
    try{
     const upstream=await this.fetch(BASE+'/chat/completions',{method:'POST',signal:AbortSignal.any([overall.signal,attempt.signal]),headers:{'Content-Type':'application/json',Authorization:'Bearer '+this.config.openrouterKey,'HTTP-Referer':this.config.frontendUrl,'X-Title':'Pongy AI'},body:JSON.stringify({model,stream:true,messages,max_tokens:this.config.maxOutputTokens,provider:{max_price:{prompt:0,completion:0,request:0,image:0}}})});httpStatus=upstream.status;
     if([401,402,403].includes(httpStatus)){try{await upstream.body?.cancel();}catch{}await write('error',{error:'Провайдер отклонил доступ сервера. Обратитесь к администратору.',code:'AI_CREDENTIALS_REJECTED'});res.end();return;}
     if(!upstream.ok){try{await upstream.body?.cancel();}catch{}throw new Error('Upstream failure');}
     if(!upstream.body)throw new Error('Empty upstream');
     for await(const data of readSse(upstream.body)){
      clearTimeout(attemptTimer);attemptTimer=setTimeout(()=>attempt.abort(),this.config.aiAttemptMs);
      if(data==='[DONE]')break;
      const event=JSON.parse(data);if(event.error)throw new Error('Upstream stream failure');const content=event.choices?.[0]?.delta?.content;
      if(typeof content==='string'&&content){emitted+=content.length;await write('delta',{choices:[{delta:{content}}]});}
     }
     if(!emitted)throw new Error('Empty model answer');
     this.mark(model,true,this.now()-started,httpStatus);await write('done',{});res.end();return;
    }catch{this.mark(model,false,0,httpStatus);if(!overall.signal.aborted)await write('switching',{model});}finally{clearTimeout(attemptTimer);attempt.abort();}
   }
   if(!res.destroyed){if(overall.signal.aborted)res.end();else{await write('error',{error:'Все доступные бесплатные модели временно отказали. Попробуйте позже.',code:'AI_UNAVAILABLE'});res.end();}}
  }catch{if(!res.destroyed){if(res.headersSent){res.write('event: error\ndata: '+JSON.stringify({error:'Запрос прерван или истекло время ожидания.',code:'AI_TIMEOUT'})+'\n\n');res.end();}else res.status(503).json({error:'ИИ временно недоступен.',code:'AI_UNAVAILABLE'});}}
  finally{clearTimeout(timer);overall.abort();res.off('close',closed);this.busy.delete(req.user.id);}
 }
}
