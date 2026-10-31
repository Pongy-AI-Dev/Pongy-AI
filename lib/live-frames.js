import sharp from 'sharp';
const fail=(message,status=400)=>Object.assign(Error(message),{status,code:'CAMERA_STREAM_UNAVAILABLE'});
// Ephemeral, per-account rolling frame buffer. Never persisted to SQLite or disk.
export function createLiveFrames({now=Date.now,maxSessions=64,ttl=10000}={}){
 const sessions=new Map();let processing=0;
 const token=(uid,id)=>String(uid)+':'+id;
 function clean(){for(const [k,s]of sessions)if(s.expires<=now())sessions.delete(k);}
 const timer=setInterval(clean,5000);timer.unref?.();
 function validate(id){if(typeof id!=='string'||!/^[a-f0-9]{32}$/.test(id))throw fail('Некорректный сеанс камеры');}
 async function push(uid,{session,sequence,image}={}){validate(session);clean();if(!Number.isSafeInteger(sequence)||sequence<1||sequence>1e9||typeof image!=='string'||image.length>140000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(image))throw fail('Некорректный видеокадр');const k=token(uid,session),old=sessions.get(k);if(old?.closed)throw fail('Камера закрыта',409);if(old&&(sequence<=old.sequence||old.busy))throw fail('Кадр уже получен',409);if(old&&now()-old.at<1000)throw fail('Слишком частые кадры',429);if(processing>=2||!old&&[...sessions.values()].filter(v=>!v.closed).length>=maxSessions)throw fail('Видеопередача занята — повторите позже',429);if(!old&&[...sessions.entries()].filter(([x,v])=>x.startsWith(uid+':')&&!v.closed).length>=2)throw fail('Открыто слишком много камер',429);if(sessions.size>=maxSessions*4)for(const [name,value]of sessions){if(value.closed){sessions.delete(name);break;}}const s=old||{frames:[],sequence:0,at:0,expires:now()+ttl};s.busy=true;sessions.set(k,s);processing++;try{const bytes=Buffer.from(image.slice(23),'base64');const normalized=await sharp(bytes,{limitInputPixels:1280*720}).rotate().resize({width:640,height:480,fit:'inside',withoutEnlargement:true}).jpeg({quality:65}).toBuffer();if(s.closed||sessions.get(k)!==s)throw fail('Камера закрыта',409);s.sequence=sequence;s.at=now();s.expires=now()+ttl;s.frames.push({image:'data:image/jpeg;base64,'+normalized.toString('base64'),at:s.at});s.frames=s.frames.slice(-3);return {received:sequence,expiresIn:ttl};}catch(e){if(e.code==='CAMERA_STREAM_UNAVAILABLE')throw e;throw fail('Не удалось прочитать видеокадр');}finally{s.busy=false;processing--;}}
 function frames(uid,id){validate(id);clean();const s=sessions.get(token(uid,id));return !s||s.closed?[]:s.frames.filter(f=>now()-f.at<ttl).slice(-2).map(f=>({...f}));}
 function drop(uid,id){validate(id);const k=token(uid,id),s=sessions.get(k);if(s){s.closed=true;s.frames=[];s.expires=now()+ttl;}return {closed:true};}
 return {push,frames,drop,close(){clearInterval(timer);for(const s of sessions.values()){s.closed=true;s.frames=[];}sessions.clear();}};
}
