const DESTINATIONS=new Set(['fonttbl','colortbl','stylesheet','info','pict','object','header','footer','filetbl','listtable','listoverridetable','generator','xmlnstbl','datastore','themedata','colorschememapping','latentstyles']);
const SYMBOLS={emdash:'—',endash:'–',bullet:'•',lquote:'‘',rquote:'’',ldblquote:'“',rdblquote:'”',tab:'\t',line:'\n',par:'\n',sect:'\n',page:'\n'};
export function extractRtfText(buffer){
 if(!Buffer.isBuffer(buffer)||buffer.length>2*1024*1024)throw new Error('RTF is too large or invalid.');
 const raw=buffer.toString('latin1');if(!/^\s*\{\\rtf/i.test(raw))throw new Error('Invalid RTF header.');
 const page=Number(raw.match(/\\ansicpg(\d+)/i)?.[1]||1252);
 let decoder;try{decoder=new TextDecoder('windows-'+page)}catch{decoder=new TextDecoder('windows-1252')}
 const stack=[];let skip=false,uc=1,fallback=0,binary=0,out='';
 for(let i=0;i<raw.length;i++){
  const ch=raw[i];
  if(binary>0){binary--;continue;}
  if(ch==='{'){stack.push({skip,uc});continue;}
  if(ch==='}'){const prior=stack.pop();if(prior){skip=prior.skip;uc=prior.uc;}continue;}
  if(ch==='\\'){
   const next=raw[i+1]||'';
   if(next==='\\'||next==='{'||next==='}'){if(!skip)out+=next;i++;continue;}
   if(next==="'"){const hex=raw.slice(i+2,i+4);if(/^[0-9a-f]{2}$/i.test(hex)&&!skip)out+=decoder.decode(Buffer.from([parseInt(hex,16)]));i+=3;continue;}
   if(next==='*'){skip=true;i++;continue;}
   if(/[A-Za-z]/.test(next)){
    let j=i+1;while(j<raw.length&&/[A-Za-z]/.test(raw[j]))j++;
    const word=raw.slice(i+1,j).toLowerCase();let sign=1;
    if(raw[j]==='-'){sign=-1;j++;}
    let number='';while(j<raw.length&&/[0-9]/.test(raw[j]))number+=raw[j++];
    const value=number?sign*Number(number):0;if(raw[j]===' ')j++;i=j-1;
    if(DESTINATIONS.has(word)){skip=true;continue;}
    if(word==='bin'){binary=Math.max(0,Math.min(1000000,value));continue;}
    if(word==='uc'){uc=Math.max(0,Math.min(16,value));continue;}
    if(word==='u'){if(!skip)out+=String.fromCharCode(value<0?value+65536:value);fallback=uc;continue;}
    if(!skip&&Object.hasOwn(SYMBOLS,word))out+=SYMBOLS[word];
    continue;
   }
   if(!skip){if(next==='~')out+='\u00a0';else if(next==='_')out+='‑';else if(next==='-'){}}
   i++;continue;
  }
  if(fallback>0){fallback--;continue;}
  if(!skip&&ch!=='\r'&&ch!=='\n')out+=ch;
  if(out.length>120000)break;
 }
 return out.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim().slice(0,100000);
}
