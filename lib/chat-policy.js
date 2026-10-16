import {createHash} from 'node:crypto';
export const DAILY_LIMIT=100,CHAT_LIMIT=1000;
export function fingerprint(text,attachments=[]){return createHash('sha256').update(JSON.stringify([String(text).normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase(),attachments.slice().sort()])).digest('hex')}
export function createChatPolicy(db){
 db.exec('CREATE TABLE IF NOT EXISTS message_daily(account TEXT NOT NULL,day TEXT NOT NULL,n INTEGER NOT NULL,PRIMARY KEY(account,day)); CREATE TABLE IF NOT EXISTS message_policy(account TEXT NOT NULL,chat TEXT NOT NULL,fingerprint TEXT NOT NULL,repeats INTEGER NOT NULL,n INTEGER NOT NULL,PRIMARY KEY(account,chat));');
 const reserve=db.transaction((account,chat,text,attachments,count,time)=>{const day=new Date(time).toISOString().slice(0,10),prior=db.prepare('SELECT * FROM message_policy WHERE account=? AND chat=?').get(account,chat),daily=db.prepare('SELECT n FROM message_daily WHERE account=? AND day=?').get(account,day)?.n||0,hash=fingerprint(text,attachments),repeat=prior?.fingerprint===hash?prior.repeats+1:1,n=Math.max(prior?.n||0,count||0);
 if(n+2>CHAT_LIMIT)return {code:'CHAT_LIMIT',status:409};
 if(repeat>=3){db.prepare('UPDATE message_policy SET repeats=? WHERE account=? AND chat=?').run(repeat,account,chat);return {code:'DUPLICATE_MESSAGE',status:409}}
 if(daily>=DAILY_LIMIT)return {code:'DAILY_LIMIT',status:429};
 db.prepare('INSERT INTO message_daily VALUES(?,?,1) ON CONFLICT(account,day) DO UPDATE SET n=n+1').run(account,day);
 db.prepare('INSERT INTO message_policy VALUES(?,?,?,?,?) ON CONFLICT(account,chat) DO UPDATE SET fingerprint=excluded.fingerprint,repeats=excluded.repeats,n=excluded.n').run(account,chat,hash,repeat,n+2);
 db.prepare('DELETE FROM message_daily WHERE day<?').run(new Date(time-7*86400000).toISOString().slice(0,10));
 return {repeat,remaining:DAILY_LIMIT-daily-1};});
 return {reserve:(account,chat,text,attachments=[],count=0,time=Date.now())=>reserve(account,chat,text,attachments,count,time)};
}
export function wantsChatReading(text,chats=[]){if(/прочти|прочитай|изучи|\bread\b|\breview\b/i.test(text)&&chats.some(c=>String(c.title||'').trim().length>=2&&String(text).normalize('NFKC').toLowerCase().includes(String(c.title).normalize('NFKC').toLowerCase())))return true;return /(?:проч(?:ти|итай|итать)|изучи|читай|материал.{0,20}чат|продолж.{0,30}(?:прошл|предыдущ|чат)|read|review|continue.{0,25}(?:previous|last|chat))/i.test(text)&&/чат|chat|conversation/i.test(text)}
export function selectChat(text,chats,currentId){const rows=chats.filter(c=>c.id!==currentId),key=s=>String(s).normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,' ').trim(),q=key(text),matches=rows.filter(c=>key(c.title).length>=2&&q.includes(key(c.title)));
 if(matches.length===1)return matches[0];if(matches.length>1)return null;
 if(/прошл|предыдущ|последн|previous|last/i.test(text))return rows.sort((a,b)=>Number(b.updated_at||b.updatedAt||0)-Number(a.updated_at||a.updatedAt||0))[0]||null;return null;
}
export function chatReference(chat,budget=120000){const messages=[];let length=0;for(const m of chat.messages||[]){if(m.delivery==='not_sent')continue;const text=String(m.text||'');if(length+text.length>budget)break;messages.push({role:m.role,text});length+=text.length}return {title:chat.title,messages,totalMessages:(chat.messages||[]).filter(m=>m.delivery!=='not_sent').length,complete:messages.length===(chat.messages||[]).filter(m=>m.delivery!=='not_sent').length,attachmentsIncluded:false}}
