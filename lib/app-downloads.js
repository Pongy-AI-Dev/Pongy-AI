import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function loadAppDownloads(root){
 const dir=path.join(root,'public','downloads');
 const data=JSON.parse(fs.readFileSync(path.join(dir,'releases.json'),'utf8'));
 if(!/^\d+\.\d+\.\d+$/.test(data.version)||data.publisher!=='Pongy AI Dev')throw Error('Invalid native application release');
 const definitions={
  windows:{prefix:'Pongy-AI-',suffix:'windows-x64.msi'},
  android:{prefix:'Pongy-AI-',suffix:'android.apk'},
  pongx:{prefix:'PongX-',suffix:'windows-x64.zip'}
 };
 const files={};
 for(const [platform,definition] of Object.entries(definitions)){
  const item=data.files?.[platform],version=item?.version||data.version;
  if(!item||!/^\d+\.\d+\.\d+$/.test(version)||item.name!==definition.prefix+version+'-'+definition.suffix||!/^[a-f0-9]{64}$/.test(item.sha256)||!Number.isSafeInteger(item.bytes)||item.bytes<1)throw Error('Invalid '+platform+' application package');
  const file=path.join(dir,item.name);
  if(fs.statSync(file).size!==item.bytes||crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==item.sha256)throw Error(platform+' application package integrity mismatch');
  files[platform]={version,name:item.name,url:'/downloads/'+item.name,sha256:item.sha256,bytes:item.bytes};
 }
 return {version:data.version,publisher:data.publisher,onlineOnly:true,windowsSigned:false,androidCertificate:data.androidCertificate,files};
}
export function mountAppDownloads(app,root){
 let release;
 try{release=loadAppDownloads(root)}catch{app.get('/api/downloads',(_req,res)=>res.status(503).set('Cache-Control','no-store').json({code:'DOWNLOADS_UNAVAILABLE'}));return null;}
 app.get('/api/downloads',(_req,res)=>res.set('Cache-Control','no-store').json(release));
 app.get('/downloads/:name',(req,res,next)=>{const item=Object.values(release.files).find(f=>f.name===req.params.name);if(!item)return next();res.set('Cache-Control','public, max-age=31536000, immutable');res.download(path.join(root,'public','downloads',item.name),item.name);});
 return release;
}
