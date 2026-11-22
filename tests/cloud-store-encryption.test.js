import test from 'node:test';
import assert from 'node:assert/strict';
import {CloudStore} from '../lib/store.js';

const key='cloud-history-encryption-fixture-key-'.repeat(2);
function fixture(){
 const docs=new Map();
 const store=new CloudStore({firestoreEnabled:true,firebaseProject:'fixture',jwtSecret:key},async(url,options={})=>{
  const path=new URL(url).pathname;
  if(options.method==='PATCH'){const doc=JSON.parse(options.body);docs.set(path,doc);return Response.json(doc);}
  if(options.method==='DELETE'){docs.delete(path);return Response.json({});}
  return docs.has(path)?Response.json(docs.get(path)):Response.json({},{status:404});
 });
 return {store,docs};
}
test('Firestore payloads encrypt chat content with AES-256-GCM and remain readable by the owning account',async()=>{
 const {store,docs}=fixture(),chat={id:'chat-1',title:'Private title',messages:[{role:'user',text:'Private conversation text'}],updated_at:1};
 await store.set('user-1','token','chats',chat.id,chat);
 const path='/v1/projects/fixture/databases/(default)/documents/pongyUsers/user-1/chats/chat-1',raw=docs.get(path).fields.json.stringValue;
 assert.match(raw,/^enc:v1:/);assert(!raw.includes('Private conversation text'));assert(!raw.includes('Private title'));
 assert.deepEqual(await store.get('user-1','token','chats','chat-1'),chat);
 assert.throws(()=>store.decode(docs.get(path),'user-2'));
 const wrongKey=new CloudStore({firestoreEnabled:true,firebaseProject:'fixture',jwtSecret:'different-cloud-history-key-'.repeat(2)},async()=>Response.json(docs.get(path)));
 await assert.rejects(wrongKey.get('user-1','token','chats','chat-1'));
});
test('legacy plaintext cloud records are readable and lazily rewritten as encrypted records',async()=>{
 const {store,docs}=fixture(),value={id:'legacy-chat',title:'Old title',messages:[{role:'user',text:'Legacy plaintext'}],updated_at:2};
 const path='/v1/projects/fixture/databases/(default)/documents/pongyUsers/user-1/chats/legacy-chat';
 docs.set(path,{fields:{json:{stringValue:JSON.stringify(value)},updated_at:{integerValue:'2'}}});
 assert.deepEqual(await store.get('user-1','token','chats','legacy-chat'),value);
 assert.match(docs.get(path).fields.json.stringValue,/^enc:v1:/);
 assert(!docs.get(path).fields.json.stringValue.includes('Legacy plaintext'));
});
test('encrypted payload tampering is rejected rather than returned as an empty conversation',async()=>{
 const {store,docs}=fixture(),value={id:'tamper',title:'Protected',messages:[{role:'user',text:'Integrity matters'}],updated_at:3};
 await store.set('user-1','token','chats',value.id,value);
 const path='/v1/projects/fixture/databases/(default)/documents/pongyUsers/user-1/chats/tamper',doc=docs.get(path),encrypted=doc.fields.json.stringValue;
 const parts=encrypted.split(':');parts[3]=(parts[3][0]==='A'?'B':'A')+parts[3].slice(1);doc.fields.json.stringValue=parts.join(':');
 await assert.rejects(store.get('user-1','token','chats','tamper'),/integrity|целостност/i);
});
