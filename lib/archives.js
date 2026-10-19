import yauzl from 'yauzl';import yazl from 'yazl';import {extractDocument} from './files.js';
export const TEXT_EXTS=new Set(['lua','luau','txt','md','csv','json','log','js','mjs','cjs','ts','tsx','jsx','html','htm','css','scss','py','sql','yaml','yml','xml','svg','sh','bat','ps1','c','cpp','h','java','rs','go','rb','php','swift','kt','ipynb','toml','ini']);
const fail=(message,code='INVALID_ARCHIVE')=>Object.assign(new Error(message),{status:400,publicMessage:true,code});
export function safePath(name){if(typeof name!=='string'||!name||name.length>180||/[\x00-\x1f]/.test(name)||name.includes('\\')||name.startsWith('/')||/^[A-Za-z]:/.test(name)||name.split('/').some(v=>v==='..'||v==='.'||!v))throw fail('Небезопасное имя файла в архиве.');return name;}
const privateName=name=>/(^|\/)(\.git|node_modules|__pycache__|\.env(?:\.(?!example$)[^/]*)?|id_rsa|id_ed25519|secrets\.json)(\/|$)|\.(pem|key)$/i.test(name);
export async function makeZip(files){return new Promise((resolve,reject)=>{const zip=new yazl.ZipFile(),chunks=[];let size=0;zip.outputStream.on('data',c=>{size+=c.length;if(size>4*1024*1024){zip.outputStream.destroy();reject(fail('Созданный ZIP превышает защитный предел 4 МБ.'));return}chunks.push(c)});zip.outputStream.on('error',reject);zip.outputStream.on('end',()=>resolve(Buffer.concat(chunks)));try{for(const f of files)zip.addBuffer(Buffer.isBuffer(f.buffer)?f.buffer:Buffer.from(f.content,'utf8'),safePath(f.name),{mtime:new Date('2026-01-01T00:00:00Z')});zip.end();}catch(e){reject(e)}});}
export async function readZip(buffer){
 if(buffer.length>2*1024*1024)throw fail('ZIP превышает 2 МБ.');
 const entries=[];let count=0,total=0;
 await new Promise((resolve,reject)=>{
  yauzl.fromBuffer(buffer,{lazyEntries:true,validateEntrySizes:true},(error,zip)=>{
   if(error)return reject(fail('Повреждённый ZIP.'));
   const abort=e=>{zip.close();reject(e)};
   zip.on('error',()=>abort(fail('Повреждённый ZIP.')));
   zip.on('entry',entry=>{
    count++;total+=entry.uncompressedSize;
    if(count>100||total>8*1024*1024||entry.uncompressedSize>2*1024*1024)return abort(fail('Лимит ZIP: 100 элементов, 8 МБ после распаковки, 2 МБ на файл.'));
    if(/\/$/.test(entry.fileName)){try{safePath(entry.fileName.slice(0,-1))}catch(e){return abort(e)}return zip.readEntry();}
    let name;try{name=safePath(entry.fileName)}catch(e){return abort(e)}
    if((entry.externalFileAttributes>>>16&0xf000)===0xa000)return abort(fail('Ссылки в ZIP не поддерживаются.'));
    if(entry.generalPurposeBitFlag&1)return abort(fail('ZIP с паролем не поддерживается.'));
    if(privateName(name)){entries.push({name,skipped:'private'});return zip.readEntry()}
    const ext=name.split('.').pop().toLowerCase();
    if(['png','jpg','jpeg','webp'].includes(ext)){entries.push({name,skipped:'image'});return zip.readEntry()}
    if(!TEXT_EXTS.has(ext)&&!['pdf','docx'].includes(ext)&&!/(^|\/)(README|LICENSE|Dockerfile|Makefile|\.gitignore|\.env\.example)$/i.test(name))return abort(fail('Данный формат файлов не поддерживается','UNSUPPORTED_FORMAT'));
    zip.openReadStream(entry,(error,stream)=>{
     if(error)return abort(fail('Не удалось прочитать ZIP.'));const chunks=[];let bytes=0;
     stream.on('data',chunk=>{bytes+=chunk.length;if(bytes>2*1024*1024){stream.destroy();abort(fail('Файл в ZIP слишком большой.'));return}chunks.push(chunk)});
     stream.on('error',()=>abort(fail('Повреждённый файл в ZIP.')));
     stream.on('end',async()=>{
      try{const data=Buffer.concat(chunks);let text;
       if(['pdf','docx'].includes(ext)){text=await extractDocument(data,ext);name+='.txt'}
       else{text=new TextDecoder('utf-8',{fatal:true}).decode(data);if(text.includes('\0'))throw fail('Данный формат файлов не поддерживается','UNSUPPORTED_FORMAT')}
       entries.push({name,text,buffer:['pdf','docx'].includes(ext)?Buffer.from(text):data});zip.readEntry();
      }catch(e){abort(e.status?e:fail('Текстовые файлы в ZIP должны быть в UTF-8.'))}
     });
    });
   });
   zip.on('end',resolve);zip.readEntry();
  });
 });
 const usable=entries.filter(e=>!e.skipped);if(!usable.length)throw fail('В ZIP нет поддерживаемых текстовых файлов. Изображения прикрепите отдельно.');
 let text='ZIP contents:\n'+entries.map(e=>e.name+(e.skipped==='private'?' [excluded: credentials/dependencies]':e.skipped==='image'?' [image: attach separately for vision]':'')).join('\n');
 for(const e of usable){text+='\n\n--- '+e.name+' ---\n'+e.text.slice(0,50000);if(text.length>100000){text=text.slice(0,100000)+'\n[Archive text truncated]';break}}
 const normalized=await makeZip(usable);return {text,base64:normalized.toString('base64'),bytes:normalized.length,members:entries.length};
}
