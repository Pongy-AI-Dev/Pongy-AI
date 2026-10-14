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
 async models(signal,vision=false,minContext=0,preferTools=false){
  if(this.now()>this.expires){
   if(!this.refresh)this.refresh=(async()=>{try{const r=await this.fetch(BASE+'/models',{signal:AbortSignal.any([signal,AbortSignal.timeout(5000)])});if(!r.ok)throw new Error('Catalog unavailable');const j=await r.json();if(!Array.isArray(j.data))throw new Error('Invalid catalog');this.catalog=j.data.filter(m=>typeof m.id==='string'&&Number(m.pricing?.prompt)===0&&Number(m.pricing?.completion)===0&&Number(m.pricing?.request||0)===0&&(!m.architecture?.output_modalities||m.architecture.output_modalities.includes('text'))&&(!m.architecture?.input_modalities||m.architecture.input_modalities.includes('text'))).map(m=>({id:m.id,context:m.context_length||0,vision:!!m.architecture?.input_modalities?.includes('image'),tools:Array.isArray(m.supported_parameters)?m.supported_parameters.includes('tools'):null}));this.expires=this.now()+this.config.modelCacheMs;}catch{this.expires=this.now()+30000;}finally{this.refresh=null;}})();
   await this.refresh;
  }
  const eligible=this.catalog.filter(m=>(!vision||m.vision)&&(!m.context||m.context>=minContext)&&(this.stats.get(m.id)?.until||0)<=this.now());
  const preference=id=>{const i=this.config.modelPreferences.indexOf(id);return i<0?(/qwen|llama|gemma|mistral|gpt-oss/i.test(id)?100:200):i;};
  eligible.sort((a,b)=>(preferTools?Number(b.tools===true)-Number(a.tools===true):0)||preference(a.id)-preference(b.id)||(this.stats.get(b.id)?.success||0)-(this.stats.get(a.id)?.success||0)||(this.stats.get(a.id)?.latency||Infinity)-(this.stats.get(b.id)?.latency||Infinity)||b.context-a.context||a.id.localeCompare(b.id));
  const ids=eligible.map(m=>m.id);if(!vision&&(this.stats.get('openrouter/free')?.until||0)<=this.now()&&!ids.includes('openrouter/free'))ids.push('openrouter/free');
  return ids.slice(0,this.config.maxAiAttempts);
 }
 mark(id,success,latency,status){const old=this.stats.get(id)||{};this.stats.set(id,{success:(old.success||0)+(success?1:0),latency:success?latency:old.latency,until:success?0:this.now()+(status===429?60000:30000)});}
 async respond(req,res,messages,{sources=[],tools=[],runTool,onAnswer}={}){
  if(!this.config.openrouterKey)return res.status(503).json({error:'ИИ ещё не настроен владельцем сервера.',code:'AI_NOT_CONFIGURED'});
  if(this.busy.has(req.user.id)||this.busy.size>=this.config.maxConcurrent)return res.status(429).json({error:'Дождитесь завершения текущего запроса.',code:'AI_BUSY'});
  this.busy.add(req.user.id);const overall=new AbortController(),timer=setTimeout(()=>overall.abort(),this.config.aiTotalMs);const closed=()=>overall.abort();res.once('close',closed);let emitted=0;
  const write=async(event,data)=>{if(overall.signal.aborted||res.destroyed)throw new Error('Aborted');const payload=event==='done'?'data: [DONE]\n\n':'event: '+event+'\ndata: '+JSON.stringify(data)+'\n\n';
   if(!res.write(payload))await new Promise((resolve,reject)=>{const cleanup=()=>{res.off('drain',done);res.off('close',fail);overall.signal.removeEventListener('abort',fail);};const done=()=>{cleanup();resolve();};const fail=()=>{cleanup();reject(new Error('Aborted'));};res.once('drain',done);res.once('close',fail);overall.signal.addEventListener('abort',fail,{once:true});});};
  try{
   const models=await this.models(overall.signal,messages.some(m=>Array.isArray(m.content)&&m.content.some(p=>p.type==='image_url')),Math.ceil(messages.reduce((n,m)=>n+(typeof m.content==='string'?m.content.length:JSON.stringify(m.content).replace(/data:image\/jpeg;base64,[A-Za-z0-9+/=]+/g,'[image]').length),0)/3)+this.config.maxOutputTokens,!!tools.length);if(!models.length)return res.status(503).json({error:'Подходящие бесплатные модели временно недоступны. Для изображений нужна модель с поддержкой vision.',code:'AI_UNAVAILABLE'});
   res.set({'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no'});res.flushHeaders();if(sources.length){await write('sources',{sources:sources.map(({title,url})=>({title,url}))});await write('pages',{pages:sources.map(({title,url,text})=>({title,url,excerpt:(text||'').slice(0,350)}))});}
   for(const model of models){
    if(overall.signal.aborted)break;
    if(emitted){await write('reset',{});emitted=0;}
    await write('model',{model});const started=this.now(),attempt=new AbortController();let attemptTimer=setTimeout(()=>attempt.abort(),this.config.aiAttemptMs);let httpStatus=0,answer='';const conversation=JSON.parse(JSON.stringify(messages));const withTools=!!tools.length&&this.catalog.find(m=>m.id===model)?.tools!==false;
    try{
     for(let round=0;round<5;round++){
     clearTimeout(attemptTimer);attemptTimer=setTimeout(()=>attempt.abort(),this.config.aiAttemptMs);
     const pending=new Map();let roundText='';
     const upstream=await this.fetch(BASE+'/chat/completions',{method:'POST',signal:AbortSignal.any([overall.signal,attempt.signal]),headers:{'Content-Type':'application/json',Authorization:'Bearer '+this.config.openrouterKey,'HTTP-Referer':this.config.frontendUrl,'X-Title':'Pongy AI'},body:JSON.stringify({model,stream:true,messages:conversation,...(withTools&&round<4?{tools,tool_choice:'auto'}:{}),temperature:0.35,max_tokens:this.config.maxOutputTokens,provider:{max_price:{prompt:0,completion:0,request:0,image:0}}})});httpStatus=upstream.status;
     if(httpStatus===401){try{await upstream.body?.cancel();}catch{}await write('error',{error:'Ключ OpenRouter на сервере недействителен. Владельцу сайта нужно заменить OPENROUTER_API_KEY в Render.',code:'AI_CREDENTIALS_REJECTED'});res.end();return;}
     if(!upstream.ok){try{await upstream.body?.cancel();}catch{}throw new Error('Upstream failure');}
     if(!upstream.body)throw new Error('Empty upstream');
     for await(const data of readSse(upstream.body)){
      clearTimeout(attemptTimer);attemptTimer=setTimeout(()=>attempt.abort(),this.config.aiAttemptMs);
      if(data==='[DONE]')break;
      const event=JSON.parse(data);if(event.error)throw new Error('Upstream stream failure');const content=event.choices?.[0]?.delta?.content;
      for(const part of event.choices?.[0]?.delta?.tool_calls||[]){if(!Number.isInteger(part.index)||part.index<0||part.index>3)throw new Error('Invalid tool index');const item=pending.get(part.index)||{id:'',name:'',arguments:''};if(part.id)item.id+=part.id;if(part.function?.name)item.name+=part.function.name;if(part.function?.arguments)item.arguments+=part.function.arguments;if(item.arguments.length>400000||item.name.length>80||item.id.length>120)throw new Error('Oversized tool request');pending.set(part.index,item);}
      if(typeof content==='string'&&content){roundText+=content;answer+=content;if((answer.match(/^\s*\[\d+(?:\.\d+){2,}\]/gm)||[]).length>=3&&!messages.some(m=>m.role==='user'&&typeof m.content==='string'&&/\[\d+(?:\.\d+){2,}\]/.test(m.content)))throw new Error('Malformed answer');emitted+=content.length;await write('delta',{choices:[{delta:{content}}]});}
     }
     clearTimeout(attemptTimer);
     if(pending.size){
      if(!withTools||!runTool||round>=4)throw new Error('Tool limit');
      const calls=[...pending.values()];if(calls.some(c=>!c.id||!c.name))throw new Error('Invalid tool request');
      conversation.push({role:'assistant',content:null,tool_calls:calls.map(c=>({id:c.id,type:'function',function:{name:c.name,arguments:c.arguments}}))});
      for(const call of calls){let result;try{const args=JSON.parse(call.arguments);result=await runTool(call.name,args,{signal:overall.signal,emit:write});}catch(e){result={error:e.publicMessage?e.message:'Действие не выполнено. Проверьте аргументы и ограничения.'};}conversation.push({role:'tool',tool_call_id:call.id,content:JSON.stringify(result).slice(0,120000)});}
      continue;
     }
     if(!roundText)throw new Error('Empty final answer');
     break;
     }
     if(!emitted)throw new Error('Empty model answer');
     if(onAnswer)await onAnswer(answer,{signal:overall.signal,emit:write});
     this.mark(model,true,this.now()-started,httpStatus);await write('done',{});res.end();return;
    }catch{this.mark(model,false,0,httpStatus);if(!overall.signal.aborted)await write('switching',{model});}finally{clearTimeout(attemptTimer);attempt.abort();}
   }
   if(!res.destroyed){if(overall.signal.aborted)res.end();else{await write('error',{error:'Все доступные бесплатные модели временно отказали. Попробуйте позже.',code:'AI_UNAVAILABLE'});res.end();}}
  }catch{if(!res.destroyed){if(res.headersSent){res.write('event: error\ndata: '+JSON.stringify({error:'Запрос прерван или истекло время ожидания.',code:'AI_TIMEOUT'})+'\n\n');res.end();}else res.status(503).json({error:'ИИ временно недоступен.',code:'AI_UNAVAILABLE'});}}
  finally{clearTimeout(timer);overall.abort();res.off('close',closed);this.busy.delete(req.user.id);}
 }
}
