import {createHash,randomUUID} from 'node:crypto';
export const DAILY_LIMIT=80,CHAT_LIMIT=1000;
export function fingerprint(text,attachments=[]){return createHash('sha256').update(JSON.stringify([String(text).normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase(),attachments.slice().sort()])).digest('hex')}
// Quarter-units, based only on server-validated content and completed work.
export function requestCost({text='',messages=[],attachments=0}={}){
 const length=String(text).length;let cost=length<=160?.25:length<=800?.5:length<=4000?1:length<=16000?2:4;
 if(/```|(?:debug|refactor|implement|algorithm|исправ.{0,20}код|разработ|алгоритм)/iu.test(text))cost=Math.max(cost,1.5);
 const context=messages.reduce((n,m)=>n+(typeof m.content==='string'?m.content.length:JSON.stringify(m.content||'').replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g,'[image]').length),0);
 cost+=Math.min(2,Math.floor(context/16000)*.5)+Math.min(2,attachments*.5);
 return Math.min(8,Math.ceil(cost*4)/4);
}
export function completionCost(base,{outputChars=0,tools=0}={}){return Math.min(8,base+Math.min(2,Math.floor(Math.max(0,outputChars)/4000)*.25)+Math.min(2,Math.max(0,tools)*.25));}
export function createChatPolicy(db){
 const active=new Set();
 db.exec('CREATE TABLE IF NOT EXISTS message_daily(account TEXT NOT NULL,day TEXT NOT NULL,n INTEGER NOT NULL,PRIMARY KEY(account,day)); CREATE TABLE IF NOT EXISTS message_policy(account TEXT NOT NULL,chat TEXT NOT NULL,fingerprint TEXT NOT NULL,repeats INTEGER NOT NULL,n INTEGER NOT NULL,PRIMARY KEY(account,chat)); CREATE TABLE IF NOT EXISTS message_reservations(token TEXT PRIMARY KEY,account TEXT NOT NULL,chat TEXT NOT NULL,day TEXT NOT NULL,cost REAL NOT NULL,state TEXT NOT NULL,created_at INTEGER NOT NULL);');
 if(!db.prepare('PRAGMA table_info(message_policy)').all().some(c=>c.name==='pending'))db.exec("ALTER TABLE message_policy ADD COLUMN pending TEXT NOT NULL DEFAULT ''; ALTER TABLE message_policy ADD COLUMN pending_at INTEGER NOT NULL DEFAULT 0; UPDATE message_policy SET repeats=0;");
 if(!db.prepare('PRAGMA table_info(message_policy)').all().some(c=>c.name==='answer'))db.exec("ALTER TABLE message_policy ADD COLUMN answer TEXT NOT NULL DEFAULT ''");
 function refund(row){if(!row||row.state!=='pending')return;db.prepare('UPDATE message_daily SET n=MAX(0,n-?) WHERE account=? AND day=?').run(row.cost,row.account,row.day);db.prepare("UPDATE message_reservations SET state='refunded' WHERE token=? AND state='pending'").run(row.token);}
 db.transaction(()=>{for(const row of db.prepare("SELECT * FROM message_reservations WHERE state='pending'").all())refund(row);db.prepare("UPDATE message_policy SET pending='',pending_at=0,repeats=MAX(0,repeats-1) WHERE pending<>''").run();})();
 const reserve=db.transaction((account,chat,text,attachments,count,time,ownApi,options)=>{
  const day=new Date(time).toISOString().slice(0,10);let prior=db.prepare('SELECT * FROM message_policy WHERE account=? AND chat=?').get(account,chat);
  if(prior?.pending&&!active.has(prior.pending)&&prior.pending_at<=time-120000){refund(db.prepare('SELECT * FROM message_reservations WHERE token=?').get(prior.pending));db.prepare("UPDATE message_policy SET pending='',pending_at=0,repeats=MAX(0,repeats-1) WHERE account=? AND chat=?").run(account,chat);prior=db.prepare('SELECT * FROM message_policy WHERE account=? AND chat=?').get(account,chat);}
  const daily=db.prepare('SELECT n FROM message_daily WHERE account=? AND day=?').get(account,day)?.n||0,hash=fingerprint(text,attachments),repeat=prior?.fingerprint===hash&&!prior.pending?prior.repeats+1:1,n=Math.max(prior?.n||0,count||0);
  if(n+2>CHAT_LIMIT)return {code:'CHAT_LIMIT',status:409};
  if(prior?.pending)return {code:'AI_BUSY',status:409};
  if(repeat>=5)return {code:'DUPLICATE_MESSAGE',status:409};
  if(!ownApi&&daily>=DAILY_LIMIT)return {code:'DAILY_LIMIT',status:429};
  const requested=Number.isFinite(options?.cost)?Math.max(.25,Math.min(8,Math.ceil(options.cost*4)/4)):1,cost=ownApi?0:Math.min(requested,DAILY_LIMIT-daily),token=randomUUID();
  if(cost)db.prepare('INSERT INTO message_daily VALUES(?,?,?) ON CONFLICT(account,day) DO UPDATE SET n=n+excluded.n').run(account,day,cost);
  db.prepare("INSERT INTO message_reservations VALUES(?,?,?,?,?,'pending',?)").run(token,account,chat,day,cost,time);
  db.prepare('INSERT INTO message_policy(account,chat,fingerprint,repeats,n,pending,pending_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(account,chat) DO UPDATE SET fingerprint=excluded.fingerprint,repeats=excluded.repeats,n=excluded.n,pending=excluded.pending,pending_at=excluded.pending_at').run(account,chat,hash,repeat,n+2,token,time);
  const cutoff=new Date(time-7*86400000).toISOString().slice(0,10);db.prepare('DELETE FROM message_daily WHERE day<?').run(cutoff);db.prepare("DELETE FROM message_reservations WHERE day<? AND state<>'pending'").run(cutoff);
  return {repeat,remaining:ownApi?null:DAILY_LIMIT-daily-cost,token,cost,previousAnswer:prior?.fingerprint===hash?prior.answer||'':''};
 });
 const settle=db.transaction((account,chat,token,success,answer,metrics)=>{
  const row=db.prepare('SELECT * FROM message_reservations WHERE token=? AND account=? AND chat=?').get(token,account,chat);if(!row||row.state!=='pending')return false;
  if(!success)refund(row);else{if(row.cost&&metrics){const daily=db.prepare('SELECT n FROM message_daily WHERE account=? AND day=?').get(account,row.day)?.n||0,extra=Math.min(Math.max(0,DAILY_LIMIT-daily),Math.max(0,completionCost(row.cost,metrics)-row.cost));if(extra)db.prepare('UPDATE message_daily SET n=n+? WHERE account=? AND day=?').run(extra,account,row.day);}db.prepare("UPDATE message_reservations SET state='completed' WHERE token=?").run(token);}
  db.prepare("UPDATE message_policy SET repeats=CASE WHEN ? THEN repeats ELSE MAX(0,repeats-1) END,answer=CASE WHEN ? THEN ? ELSE answer END,pending='',pending_at=0 WHERE account=? AND chat=? AND pending=?").run(success?1:0,success?1:0,String(answer).slice(0,1000000),account,chat,token);return true;
 });
 return {reserve:(account,chat,text,attachments=[],count=0,time=Date.now(),ownApi=false,options)=>{const result=reserve(account,chat,text,attachments,count,time,ownApi,options);if(result.token)active.add(result.token);return result;},settle:(account,chat,token,success,answer='',metrics)=>{const changed=settle(account,chat,token,success,answer,metrics);if(changed)active.delete(token);return changed;}};
}
export function wantsChatReading(text,chats=[],currentId){if(/прочти|прочитай|изучи|\bread\b|\breview\b/i.test(text)&&chats.some(c=>c.id!==currentId&&String(c.title||'').trim().length>=2&&String(text).normalize('NFKC').toLowerCase()!==String(c.title).normalize('NFKC').toLowerCase()&&String(text).normalize('NFKC').toLowerCase().includes(String(c.title).normalize('NFKC').toLowerCase())))return true;return /(?:проч(?:ти|итай|итать)|изучи|читай|материал.{0,20}чат|продолж.{0,30}(?:прошл|предыдущ|чат)|read|review|continue.{0,25}(?:previous|last|chat))/i.test(text)&&/чат|chat|conversation/i.test(text)}
export function selectChat(text,chats,currentId){const current=chats.find(c=>c.id===currentId);if(current&&/(?:текущ|активн|этот|этом|наше[мй]|нашего|current|active|this)\s*(?:чат|chat|conversation)/i.test(String(text)))return current;const rows=chats.filter(c=>c.id!==currentId),key=s=>String(s).normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,' ').trim(),q=key(text),matches=rows.filter(c=>key(c.title).length>=2&&q.includes(key(c.title)));
 if(matches.length===1)return matches[0];if(matches.length>1)return null;
 if(/прошл|предыдущ|последн|previous|last/i.test(text))return rows.sort((a,b)=>Number(b.updated_at||b.updatedAt||0)-Number(a.updated_at||a.updatedAt||0))[0]||null;return null;
}
export function chatReference(chat,budget=120000){const messages=[];let length=0;for(const m of chat.messages||[]){if(m.delivery==='not_sent')continue;const text=String(m.text||'');if(length+text.length>budget)break;messages.push({role:m.role,text});length+=text.length}return {title:chat.title,messages,totalMessages:(chat.messages||[]).filter(m=>m.delivery!=='not_sent').length,complete:messages.length===(chat.messages||[]).filter(m=>m.delivery!=='not_sent').length,attachmentsIncluded:false}}
