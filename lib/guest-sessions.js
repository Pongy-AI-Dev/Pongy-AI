import {randomUUID} from 'node:crypto';

export const GUEST_MESSAGE_LIMIT=3;
export const GUEST_SESSION_TTL=30*24*60*60*1000;

export function createGuestSessions(db,now=Date.now){
  db.exec('CREATE TABLE IF NOT EXISTS guest_sessions(id TEXT PRIMARY KEY,messages_used INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL)');
  const create=db.prepare('INSERT INTO guest_sessions(id,messages_used,created_at,expires_at) VALUES(?,0,?,?)');
  const read=db.prepare('SELECT id,messages_used,created_at,expires_at FROM guest_sessions WHERE id=? AND expires_at>?');
  const consume=db.prepare('UPDATE guest_sessions SET messages_used=messages_used+1 WHERE id=? AND expires_at>? AND messages_used<?');
  return {
    create(){
      const id=randomUUID(),at=now();
      create.run(id,at,at+GUEST_SESSION_TTL);
      db.prepare('DELETE FROM guest_sessions WHERE expires_at<=?').run(at);
      return {id,messagesUsed:0,remaining:GUEST_MESSAGE_LIMIT,expiresAt:at+GUEST_SESSION_TTL};
    },
    read(id){
      if(typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id))return null;
      const row=read.get(id,now());
      return row?{id:row.id,messagesUsed:row.messages_used,remaining:Math.max(0,GUEST_MESSAGE_LIMIT-row.messages_used),expiresAt:row.expires_at}:null;
    },
    consume(id){
      const at=now(),changed=consume.run(id,at,GUEST_MESSAGE_LIMIT).changes;
      const state=this.read(id);
      return {allowed:changed===1,...(state||{messagesUsed:GUEST_MESSAGE_LIMIT,remaining:0,expiresAt:0})};
    },
    remove(id){return db.prepare('DELETE FROM guest_sessions WHERE id=?').run(id).changes===1;}
  };
}
