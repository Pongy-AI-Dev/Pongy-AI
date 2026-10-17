import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import multer from 'multer';
// Spool inputs to private temporary files. Decode one large image at a time.
export function createFileUpload(config){let active=0,queue=Promise.resolve();const receive=multer({storage:multer.diskStorage({destination:(req,_file,cb)=>cb(null,req.uploadWorkdir),filename:(_req,_file,cb)=>cb(null,crypto.randomUUID())}),limits:{fileSize:25*1024*1024,files:4,fields:0,parts:4}}).array('files',4);
 function middleware(req,res,next){if(active>=2)return res.status(503).json({error:'Загрузка занята. Попробуйте через несколько секунд.',code:'UPLOAD_BUSY'});active++;try{req.uploadWorkdir=fs.mkdtempSync(path.join(config.dataDir,'upload-'))}catch(error){active--;return next(error)};let released=false;const timer=setTimeout(()=>{req.destroy()},120000);timer.unref();const cleanup=()=>{if(released)return;released=true;clearTimeout(timer);active--;fs.rm(req.uploadWorkdir,{recursive:true,force:true},()=>{})};res.once('finish',cleanup);res.once('close',cleanup);req.once('aborted',cleanup);receive(req,res,error=>{if(error){cleanup();next(error)}else next()});}
 function normalize(raw,extract){const task=queue.then(async()=>extract({...raw,buffer:await fs.promises.readFile(raw.path)}));queue=task.then(()=>{},()=>{});return task;}
 return {middleware,normalize};
}
