import crypto from 'node:crypto';
import {fileInfo} from './files.js';
const idOK=v=>typeof v==='string'&&/^[\w-]{1,64}$/.test(v);
const fail=(message,status=400,code)=>Object.assign(new Error(message),{status,code,publicMessage:true});
const uniqueIds=(value,max)=>{if(!Array.isArray(value)||value.length>max||value.some(x=>!idOK(x)))throw fail('Invalid linked item IDs');return [...new Set(value)];};
function cleanProject(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw fail('Invalid project');
 const name=String(input.name||'').trim(),description=String(input.description||'').trim(),memory=String(input.memory||'');
 if(!name||name.length>80||description.length>1200||memory.length>12000)throw fail('Project name, description or memory is invalid');
 const icon=['folder','code','image','video','book','game','briefcase','sparkles','graduation-cap'].includes(input.icon)?input.icon:'folder';
 const color=/^#[\da-f]{6}$/i.test(String(input.color||''))?String(input.color):'#6478d3';
 const settings=input.settings&&typeof input.settings==='object'&&!Array.isArray(input.settings)?input.settings:{};
 return {name,description,memory,icon,color,chatIds:uniqueIds(input.chatIds||[],200),fileIds:uniqueIds(input.fileIds||[],100),settings:{theme:['system','light','dark'].includes(settings.theme)?settings.theme:'system'}};
}
function cleanLibrary(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||!idOK(input.fileId))throw fail('Select a valid file');
 const name=String(input.name||'').trim(),description=String(input.description||'').trim(),folder=String(input.folder||'').trim();
 if(!name||name.length>160||description.length>1000||folder.length>80)throw fail('Library item metadata is invalid');
 const tags=Array.isArray(input.tags)?input.tags.map(x=>String(x).trim().slice(0,32)).filter(Boolean).slice(0,20):[];
 return {fileId:input.fileId,name,description,folder,tags:[...new Set(tags)]};
}
export function createWorkspaceRepository({db,store,getFile,now=Date.now}){
 db.exec('CREATE TABLE IF NOT EXISTS projects(id TEXT NOT NULL,user_id INTEGER NOT NULL,json TEXT NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(id,user_id),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)');
 db.exec('CREATE INDEX IF NOT EXISTS projects_user_updated ON projects(user_id,updated_at DESC)');
 db.exec('CREATE TABLE IF NOT EXISTS library_items(id TEXT NOT NULL,user_id INTEGER NOT NULL,json TEXT NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(id,user_id),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)');
 db.exec('CREATE INDEX IF NOT EXISTS library_user_updated ON library_items(user_id,updated_at DESC)');
 const queues=new Map();
 const serial=(req,kind,work)=>{const key=req.user.id+':'+kind,old=queues.get(key)||Promise.resolve(),next=old.catch(()=>{}).then(work);queues.set(key,next);return next.finally(()=>{if(queues.get(key)===next)queues.delete(key);});};
 const table=kind=>kind==='projects'?'projects':kind==='library'?'library_items':null;
 async function get(req,kind,id){if(!idOK(id))return null;if(store.enabled)return store.get(req.user.firebase_uid,req.firebaseIdToken,kind==='library'?'library':kind,id);const row=db.prepare('SELECT json FROM '+table(kind)+' WHERE id=? AND user_id=?').get(id,req.user.id);return row?JSON.parse(row.json):null;}
 async function list(req,kind){if(store.enabled)return (await store.list(req.user.firebase_uid,req.firebaseIdToken,kind==='library'?'library':kind)).slice(0,500);return db.prepare('SELECT json FROM '+table(kind)+' WHERE user_id=? ORDER BY updated_at DESC LIMIT 500').all(req.user.id).map(r=>JSON.parse(r.json));}
 async function save(req,kind,id,value){if(store.enabled)return store.set(req.user.firebase_uid,req.firebaseIdToken,kind==='library'?'library':kind,id,value);db.prepare('INSERT INTO '+table(kind)+'(id,user_id,json,updated_at) VALUES(?,?,?,?) ON CONFLICT(id,user_id) DO UPDATE SET json=excluded.json,updated_at=excluded.updated_at').run(id,req.user.id,JSON.stringify(value),value.updated_at);}
 async function remove(req,kind,id){if(store.enabled)return store.del(req.user.firebase_uid,req.firebaseIdToken,kind==='library'?'library':kind,id);db.prepare('DELETE FROM '+table(kind)+' WHERE id=? AND user_id=?').run(id,req.user.id);}
 async function verifyFiles(req,ids,projectId=null){
  for(const id of ids)if(!await getFile(req,id))throw fail('A linked file was not found',404,'WORKSPACE_FILE_NOT_FOUND');
  if(ids.length){const selected=new Set(ids),otherProjects=await list(req,'projects');if(otherProjects.some(p=>p.id!==projectId&&(p.fileIds||[]).some(id=>selected.has(id))))throw fail('A linked file belongs to another project',409,'FILE_PROJECT_MISMATCH');}
 }
 async function createProject(req,input){return serial(req,'projects',async()=>{const data=cleanProject(input);await verifyFiles(req,data.fileIds);if((await list(req,'projects')).length>=100)throw fail('Project limit reached',413);const id=crypto.randomUUID(),stamp=now(),value={id,...data,created_at:stamp,updated_at:stamp};await save(req,'projects',id,value);return value;});}
 async function putProject(req,id,input){return serial(req,'projects',async()=>{if(!idOK(id))throw fail('Invalid project ID');const prior=await get(req,'projects',id);if(!prior)throw fail('Project not found',404);if(Number(input?.version)!==Number(prior.updated_at))throw fail('Project changed. Reload before saving.',409,'PROJECT_CONFLICT');const data=cleanProject(input);await verifyFiles(req,data.fileIds,id);const value={id,...data,created_at:prior.created_at||prior.updated_at,updated_at:Math.max(now(),Number(prior.updated_at)+1)};await save(req,'projects',id,value);return value;});}
 async function putLibrary(req,input){return serial(req,'library',async()=>{const data=cleanLibrary(input),file=await getFile(req,data.fileId);if(!file)throw fail('File not found',404,'WORKSPACE_FILE_NOT_FOUND');const all=await list(req,'library'),prior=all.find(x=>x.fileId===data.fileId);const id=prior?.id||crypto.randomUUID(),stamp=now(),value={id,...data,file:fileInfo(file),created_at:prior?.created_at||stamp,updated_at:Math.max(stamp,Number(prior?.updated_at||0)+1)};if(!prior&&all.length>=500)throw fail('Library limit reached',413);await save(req,'library',id,value);return value;});}
 async function putProjectFile(req,id,fileId){const prior=await get(req,'projects',id);if(!prior)throw fail('Project not found',404);return putProject(req,id,{...prior,fileIds:[...new Set([...(prior.fileIds||[]),fileId])],version:prior.updated_at});}
 async function del(req,kind,id){return serial(req,kind,async()=>{if(!idOK(id))throw fail('Invalid item ID');if(!await get(req,kind,id))throw fail('Item not found',404);await remove(req,kind,id);});}
 async function projectContext(req,id){const project=await get(req,'projects',id);if(!project)return null;return {id:project.id,name:project.name,description:project.description,memory:project.memory,files:(project.fileIds||[]).map(id=>id).slice(0,100)};}
 return {get,list,createProject,putProject,putLibrary,putProjectFile,del,projectContext};
}