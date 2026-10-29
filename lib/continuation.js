// Exact boundary deduplication only; no semantic rewriting of code or prose.
export function continuationPrefix(messages, enabled, command) {
 if (!enabled || !/^\s*(?:продолжи|продолжить|continue)[.!?\s]*$/iu.test(command || '')) return '';
 const previous=messages.at(-2);
 return previous?.role==='assistant' && typeof previous.content==='string' ? previous.content : '';
}
export function continuationContext(messages, prefix) {
 if (!prefix) return messages;
 const copy=JSON.parse(JSON.stringify(messages));
 const systemCost=copy.filter(m=>m.role==='system').reduce((n,m)=>n+(typeof m.content==='string'?m.content.length:JSON.stringify(m.content).length),0);
 copy[copy.length-2].content=prefix.slice(-Math.min(40000,Math.max(1024,60000-systemCost-8000)));
 // Retain the latest actual request even when its original payload was huge.
 for(let i=copy.length-3;i>=0;i--)if(copy[i].role==='user'){
  if(Array.isArray(copy[i].content))copy[i].content=copy[i].content.filter(p=>p.type==='text').map(p=>p.text).join('\n');
  if(typeof copy[i].content==='string')copy[i].content=copy[i].content.slice(0,8000);
  break;
 }
 copy.at(-1).content='Continue exactly from the next character after the assistant response below. Do not repeat its text or introduce the continuation. Complete the ORIGINAL user request. Do not repeat completed actions or tool calls. The previous response may be a tail excerpt; do not invent missing earlier contents.';
 return copy;
}
export function boundaryFilter(reference, minimum=12) {
 const tail=reference.slice(-8192);let buffer='',decided=!tail;
 return function accept(chunk='',flush=false){
  if(decided)return chunk;
  buffer+=chunk;let overlap=0,possible=false;
  for(let i=0;i<tail.length;i++){
   const suffix=tail.slice(i);if(suffix.length<minimum)continue;
   if(buffer.startsWith(suffix))overlap=Math.max(overlap,suffix.length);
   else if(suffix.startsWith(buffer))possible=true;
  }
  if(possible&&!flush&&buffer.length<8192)return '';
  decided=true;const result=buffer.slice(overlap);buffer='';return result;
 };
}
