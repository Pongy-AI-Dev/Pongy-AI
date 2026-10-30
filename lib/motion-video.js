// Bounded declarative video. Never execute model/user JavaScript on the server.
import {createArtifacts} from './artifacts.js';
const fail=()=>Object.assign(Error('MOTION_SCENE_INVALID'),{status:400,publicMessage:true});
const number=(n,min,max)=>{if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw fail();return n;};
const color=c=>{if(typeof c!=='string'||!/^#[a-f\d]{6}$/i.test(c))throw fail();return c;};
const fields=(o,keys)=>{if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).some(k=>!keys.includes(k)))throw fail();};
export function validateMotionScene(value){
 fields(value,['width','height','duration','fps','background','layers']);
 const width=number(value.width,160,1280),height=number(value.height,160,1280),duration=number(value.duration,1,120),fps=number(value.fps??30,10,60);
 if(!Number.isInteger(width)||!Number.isInteger(height)||!Number.isInteger(fps)||!Array.isArray(value.layers)||!value.layers.length||value.layers.length>120)throw fail();
 const background=color(value.background),layers=value.layers.map(l=>{
  fields(l,['type','text','color','x','y','endX','endY','size','width','height','start','end','effect']);
  if(!['text','circle','rect','stickman'].includes(l.type)||!['fade','slide','pulse','walk','none'].includes(l.effect??'fade'))throw fail();
  const start=number(l.start??0,0,duration),end=number(l.end??duration,0,duration);if(end<=start)throw fail();
  const out={type:l.type,color:color(l.color),x:number(l.x,-width,width*2),y:number(l.y,-height,height*2),endX:number(l.endX??l.x,-width,width*2),endY:number(l.endY??l.y,-height,height*2),size:number(l.size??48,4,500),width:number(l.width??120,1,1280),height:number(l.height??80,1,1280),start,end,effect:l.effect??'fade'};
  if(l.type==='text'){if(typeof l.text!=='string'||!l.text.trim()||l.text.length>500||/[\x00-\x1f]/.test(l.text))throw fail();out.text=l.text;}
  return out;
 });
 return {width,height,duration,fps,background,layers};
}
// Header-only WebM -> Matroska remux: encoded frames and Segment-relative offsets stay unchanged.
export function matroskaHeader(input){
 const b=input instanceof Uint8Array?input:new Uint8Array(input);const fail=()=>{throw Error('Invalid WebM EBML header')};
 function vint(pos,id=false){if(pos>=b.length||!b[pos])return fail();let width=1,marker=128;while(!(b[pos]&marker)){width++;marker>>=1;}if(width>(id?4:8)||pos+width>b.length)return fail();let n=id?b[pos]:b[pos]&(marker-1),unknown=!id&&n===marker-1;for(let i=1;i<width;i++){n=n*256+b[pos+i];unknown=unknown&&b[pos+i]===255;}if(!Number.isSafeInteger(n)||unknown)return fail();return {n,width};}
 if(b.length<8||b[0]!==26||b[1]!==69||b[2]!==223||b[3]!==163)return fail();const size=vint(4),start=4+size.width,end=start+size.n;if(end>65536||end+4>b.length||b[end]!==24||b[end+1]!==83||b[end+2]!==128||b[end+3]!==103)return fail();
 let doc=null;for(let p=start;p<end;){const id=vint(p,true),length=vint(p+id.width),value=p+id.width+length.width,next=value+length.n;if(next>end||id.n===191)return fail();if(id.n===17026){if(doc)return fail();doc={start:p,end:next,text:String.fromCharCode(...b.slice(value,next))};}p=next;}
 if(!doc||!['webm','matroska'].includes(doc.text))return fail();if(doc.text==='matroska')return {header:b.slice(0,end),consumed:end};
 const content=new Uint8Array(size.n-(doc.end-doc.start)+11);content.set(b.slice(start,doc.start));content.set([66,130,136,109,97,116,114,111,115,107,97],doc.start-start);content.set(b.slice(doc.end,end),doc.start-start+11);
 let width=1;while(content.length>=Math.pow(2,7*width)-1)width++;const encoded=new Uint8Array(width);let n=content.length;for(let i=width-1;i>=0;i--){encoded[i]=n%256;n=Math.floor(n/256);}encoded[0]|=1<<(8-width);const header=new Uint8Array(4+width+content.length);header.set([26,69,223,163]);header.set(encoded,4);header.set(content,4+width);return {header,consumed:end};
}
// This fixed runtime is embedded in the downloaded HTML; scene data stays inert JSON.
function player(remuxHeader){
 'use strict';
 const scene=JSON.parse(document.getElementById('scene').textContent),canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),play=document.getElementById('play'),save=document.getElementById('export'),download=document.getElementById('download'),format=document.getElementById('format'),status=document.getElementById('status'),ru=document.documentElement.lang==='ru';
 let active=null,downloadURL=null;
 const say=(state,r,e)=>{status.dataset.state=state;status.textContent=ru?r:e;};
 canvas.width=scene.width;canvas.height=scene.height;
 function draw(t){ctx.fillStyle=scene.background;ctx.fillRect(0,0,canvas.width,canvas.height);for(const l of scene.layers){if(t<l.start||t>l.end)continue;const p=Math.min(1,(t-l.start)/(l.end-l.start)),ease=l.effect==='walk'?p:1-Math.pow(1-p,3),fade=Math.min(1,p*8,(1-p)*8),scale=l.effect==='pulse'?1+.045*Math.sin(p*Math.PI*6):1;ctx.save();ctx.globalAlpha=l.effect==='none'?1:Math.max(0,fade);ctx.translate(l.x+(l.endX-l.x)*ease,l.y+(l.endY-l.y)*ease);ctx.scale(scale,scale);ctx.fillStyle=l.color;if(l.type==='circle'){ctx.beginPath();ctx.arc(0,0,l.size/2,0,Math.PI*2);ctx.fill();}else if(l.type==='rect')ctx.fillRect(-l.width/2,-l.height/2,l.width,l.height);else if(l.type==='stickman'){const unit=l.size/100,phase=(t-l.start)*Math.PI*3,walk=l.effect==='walk'?Math.sin(phase):0;ctx.scale(unit,unit);ctx.strokeStyle=l.color;ctx.lineWidth=5;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.arc(0,-36,12,0,Math.PI*2);ctx.moveTo(0,-24);ctx.lineTo(0,15);ctx.moveTo(-22,walk*13-2);ctx.lineTo(0,-12);ctx.lineTo(22,-walk*13-2);ctx.moveTo(-18-walk*8,48);ctx.lineTo(0,15);ctx.lineTo(18+walk*8,48);ctx.stroke();}else{ctx.font='600 '+l.size+'px Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(l.text,0,0,canvas.width*.94);}ctx.restore();}}
 function resetDownload(){download.hidden=true;download.removeAttribute('href');if(downloadURL)URL.revokeObjectURL(downloadURL);downloadURL=null;}
 function cleanup(ticket){cancelAnimationFrame(ticket.raf);clearTimeout(ticket.timer);ticket.stream?.getTracks().forEach(t=>t.stop());if(active===ticket){active=null;play.disabled=false;save.disabled=false;format.disabled=false;}}
 function stopTicket(ticket,state,r,e){if(active!==ticket)return;ticket.cancelled=true;try{if(ticket.recorder?.state==='recording')ticket.recorder.stop();}catch{}cleanup(ticket);say(state,r,e);}
 function exportType(){if(typeof canvas.captureStream!=='function'||typeof window.MediaRecorder!=='function'||typeof MediaRecorder.isTypeSupported!=='function')return null;try{return (format.value==='mp4'?['video/mp4;codecs=avc1.42E01E','video/mp4']:['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm']).find(t=>MediaRecorder.isTypeSupported(t))||null;}catch{return null;}}
 function run(record){
  if(active)return;
  if(document.hidden){say('cancelled','Откройте вкладку для воспроизведения.','Keep this tab visible to play.');return;}
  const mime=record?exportType():null;
  if(record&&!mime){say('unsupported','Выбранный формат не поддерживается этим браузером. Выберите WebM или другой браузер.','This format is not available in this browser. Choose WebM or another browser.');return;}
  const ticket={raf:0,timer:0,stream:null,recorder:null,cancelled:false,parts:[],format:format.value};active=ticket;play.disabled=true;save.disabled=true;format.disabled=true;if(record)resetDownload();draw(0);
  if(record){
   try{
    ticket.stream=canvas.captureStream(scene.fps);ticket.recorder=new MediaRecorder(ticket.stream,{mimeType:mime,videoBitsPerSecond:Math.min(16000000,Math.max(4000000,scene.width*scene.height*scene.fps*.25))});
    ticket.recorder.ondataavailable=e=>{if(active===ticket&&!ticket.cancelled&&e.data.size)ticket.parts.push(e.data);};
    ticket.recorder.onerror=()=>stopTicket(ticket,'error','Не удалось записать видео. Попробуйте другой браузер.','Video recording failed. Try another browser.');
    ticket.recorder.onstop=async()=>{
     if(active!==ticket||ticket.cancelled)return;
     if(!ticket.parts.length){stopTicket(ticket,'error','Браузер не вернул видео. Попробуйте другой браузер.','The browser returned no video. Try another browser.');return;}
     let blob=new Blob(ticket.parts,{type:ticket.recorder.mimeType||mime});
     if(ticket.format==='mkv'){try{say('muxing','Собираю контейнер MKV…','Muxing MKV container…');const prefix=new Uint8Array(await blob.slice(0,65540).arrayBuffer()),changed=remuxHeader(prefix);blob=new Blob([changed.header,blob.slice(changed.consumed)],{type:'video/x-matroska'});}catch{stopTicket(ticket,'error','Не удалось собрать MKV. Попробуйте экспорт WebM.','Could not mux MKV. Try WebM export.');return;}if(active!==ticket||ticket.cancelled)return;}
     downloadURL=URL.createObjectURL(blob);download.href=downloadURL;download.download='pongy-motion.'+(ticket.format==='mkv'?'mkv':mime.startsWith('video/mp4')?'mp4':'webm');download.hidden=false;cleanup(ticket);
     say('ready','Видео готово. Нажмите «Скачать готовое видео».','Video ready. Click Download video.');
    };
    ticket.recorder.start(200);
   }catch{stopTicket(ticket,'unsupported','Экспорт WebM не поддерживается. Попробуйте настольный Chrome, Edge или Firefox.','WebM export unavailable. Try desktop Chrome, Edge or Firefox.');return;}
  }
  say(record?'recording':'playing',record?'Записываю видео — не скрывайте вкладку.':'Воспроизведение…',record?'Recording — keep this tab visible.':'Playing…');
  // Also bounds engines that advertise recording but never emit a stop/data event.
  ticket.timer=setTimeout(()=>stopTicket(ticket,'error','Запись не завершилась. Повторите экспорт или смените браузер.','Recording did not finish. Retry or use another browser.'),(scene.duration+8)*1000);
  const began=performance.now();
  function tick(now){if(active!==ticket)return;if(document.hidden){stopTicket(ticket,'cancelled','Остановлено: вкладка скрыта. Повторите экспорт.','Stopped: tab hidden. Export again.');return;}const t=(now-began)/1000;draw(Math.min(t,scene.duration));if(t<scene.duration)ticket.raf=requestAnimationFrame(tick);else if(record){try{if(ticket.recorder.state==='recording')ticket.recorder.stop();else stopTicket(ticket,'error','Запись остановилась раньше времени. Повторите экспорт.','Recording stopped early. Export again.');}catch{stopTicket(ticket,'error','Не удалось завершить запись.','Could not finish recording.');}}else{cleanup(ticket);say('idle','Готово.','Done.');}}
  ticket.raf=requestAnimationFrame(tick);
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)stopTicket(active,'cancelled','Остановлено: вкладка скрыта. Повторите экспорт.','Stopped: tab hidden. Export again.');});
 play.onclick=()=>run(false);save.onclick=()=>run(true);format.disabled=false;format.onchange=()=>{resetDownload();};
 window.addEventListener('pagehide',()=>{if(active)stopTicket(active,'cancelled','Запись остановлена.','Recording stopped.');resetDownload();});
 status.dataset.state='idle';draw(Math.min(.5,scene.duration/2));
}
export function motionHTML(scene,locale='en'){
 const ru=locale==='ru',json=JSON.stringify(validateMotionScene(scene)).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
 return `<!doctype html><html lang="${ru?'ru':'en'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; media-src blob:; connect-src 'none'; base-uri 'none'; form-action 'none'"><title>Pongy Motion</title><style>body{margin:0;padding:24px;background:#171923;color:#f0effa;font:15px Arial,sans-serif}main{max-width:960px;margin:auto}canvas{display:block;width:100%;max-height:70vh;object-fit:contain;border-radius:18px;background:#000}nav{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}button,nav a{font:inherit;color:inherit;padding:12px 18px;border:1px solid #55506a;border-radius:12px;background:#34304e;cursor:pointer}nav a{display:inline-block;text-decoration:none}nav a[hidden]{display:none}button:disabled{opacity:.5;cursor:progress}button:focus-visible{outline:2px solid #aaa0ff;outline-offset:3px}p{line-height:1.5;color:#c0bed2}</style><main><h1>Motion</h1><canvas aria-label="${ru?'Предпросмотр анимации':'Animation preview'}"></canvas><nav><button id="play">${ru?'Воспроизвести':'Play'}</button><label>${ru?'Формат':'Format'} <select id="format"><option value="webm">WebM</option><option value="mp4">MP4</option><option value="mkv">MKV (Matroska)</option></select></label><button id="export">${ru?'Экспорт видео':'Export video'}</button><a id="download" hidden download="pongy-motion.webm">${ru?'Скачать готовое видео':'Download video'}</a></nav><p id="status" role="status">${ru?'Экспорт идёт в реальном времени, без звука. Не скрывайте вкладку.':'Export runs in real time, without audio. Keep the tab visible.'}</p></main><script type="application/json" id="scene">${json}</script><script>(${player.toString()})(${matroskaHeader.toString()});</script></html>`;
}
export async function createMotionVideo(args,locale='en'){
 fields(args,['scene']);const scene=validateMotionScene(args.scene),html=motionHTML(scene,locale),ru=locale==='ru';
 const readme=ru?'# Motion — видео из кода\n\nРаспакуйте архив и откройте index.html в браузере. Выберите WebM, MP4 или MKV, нажмите «Экспорт видео», затем «Скачать готовое видео». Это локальный рендер в реальном времени, без звука. Не скрывайте вкладку до завершения. Нужна поддержка Canvas captureStream и MediaRecorder/WebM (рекомендуется настольный Chrome/Edge).\n\nscene.json — редактируемый исходник сцены. Для применения правок замените JSON в блоке scene внутри index.html. Размеры 160–1280, длительность 1–120 с, до 120 слоёв. Текст, круги, прямоугольники и стикмены; fade/slide/pulse/walk/none. Внешние ресурсы и произвольный JS не поддерживаются.\n\nЭто встроенный генератор Pongy Motion, не пакет Remotion или Motion Canvas. MP4 доступен, если браузер поддерживает запись H.264/MP4 через MediaRecorder. Если нет — экспортируйте WebM и конвертируйте локально: ffmpeg -i pongy-motion.webm -c:v libx264 -pix_fmt yuv420p -movflags +faststart video.mp4. MKV собирается локально из WebM: меняется EBML DocType на matroska, исходные видеопакеты не перекодируются. Это не смена расширения; качество от смены контейнера не повышается. Серверный рендер и аудио не входят.\n':'# Motion — video from code\n\nExtract and open index.html in desktop Chrome/Edge. Choose WebM, MP4 or MKV, click Export video, then Download video when ready. Export runs locally in real time without audio; keep the tab visible. Requires Canvas captureStream and MediaRecorder/WebM.\n\nscene.json is editable source. To apply changes replace the scene JSON block in index.html. 160–1280 pixels, 1–120 seconds, up to 120 layers. Text/circles/rectangles/stickmen, fade/slide/pulse/walk/none. No external resources or arbitrary JavaScript.\n\nBuilt-in Pongy Motion generator, not the Remotion or Motion Canvas library. MP4 requires browser MediaRecorder H.264/MP4 support. Otherwise export WebM and convert locally: ffmpeg -i pongy-motion.webm -c:v libx264 -pix_fmt yuv420p -movflags +faststart video.mp4. MKV is locally remuxed from WebM by rebuilding the EBML header with the Matroska DocType; encoded video packets are preserved, not re-encoded. Changing the container does not improve quality. No server rendering or audio.\n';
 const files=await createArtifacts({name:'pongy-motion.zip',files:[{name:'index.html',content:html},{name:'scene.json',content:JSON.stringify(scene,null,2)},{name:'README.md',content:readme}]});return {file:files[0],scene};
}
const num={type:'number'},col={type:'string',pattern:'^#[a-fA-F0-9]{6}$'};
export const MOTION_TOOL={type:'function',function:{name:'create_motion_video',description:'Build a downloadable Pongy Motion ZIP with a validated code scene and self-contained HTML Canvas player. User opens index.html and exports a SILENT WebM, Matroska MKV (local remux) or supported-browser MP4 locally in real time. NOT an already rendered video, Remotion, or server execution. Support 1–120 seconds and 10–60 fps with up to 120 layers; use stickman layers with walk effect for articulated people. Do not add plugin names as scene text unless requested. Use complete readable composition; no URLs, arbitrary JS or external assets. Coordinates in pixels; x/y are layer centers, size is font pixels or circle diameter. Text must fit, choose contrasting colors.',parameters:{type:'object',properties:{scene:{type:'object',properties:{width:{type:'integer',minimum:160,maximum:1280},height:{type:'integer',minimum:160,maximum:1280},duration:{type:'number',minimum:1,maximum:120},fps:{type:'integer',minimum:10,maximum:60},background:col,layers:{type:'array',minItems:1,maxItems:120,items:{type:'object',properties:{type:{type:'string',enum:['text','circle','rect','stickman']},text:{type:'string',maxLength:500},color:col,x:num,y:num,endX:num,endY:num,size:num,width:num,height:num,start:num,end:num,effect:{type:'string',enum:['fade','slide','pulse','walk','none']}},required:['type','color','x','y'],additionalProperties:false}}},required:['width','height','duration','background','layers'],additionalProperties:false}},required:['scene'],additionalProperties:false}}};
