// In-process notification transport; entitlement authority remains the server database.
export function createAccountUpdates({db,subscriptions,now=Date.now}){
 const waiting=new Map();let closed=false;
 db.exec('CREATE TABLE IF NOT EXISTS product_notice_reads(user_id INTEGER NOT NULL,event_id TEXT NOT NULL,seen_at INTEGER NOT NULL,PRIMARY KEY(user_id,event_id))');
 function revision(id){return db.prepare('SELECT id FROM product_events WHERE user_id=? ORDER BY rowid DESC LIMIT 1').get(id)?.id||'initial';}
 function snapshot(id){return {...subscriptions().get(id),revision:revision(id)};}
 function publish(id){for(const done of [...(waiting.get(id)||[])])done();}
 function wait(id,signal){if(closed||signal?.aborted)return Promise.resolve();return new Promise(resolve=>{let set=waiting.get(id);if(!set)waiting.set(id,set=new Set());if(set.size>=6){resolve('busy');return;}let timer;const done=()=>{clearTimeout(timer);signal?.removeEventListener('abort',done);set.delete(done);if(!set.size)waiting.delete(id);resolve();};set.add(done);timer=setTimeout(done,20000);timer.unref?.();signal?.addEventListener('abort',done,{once:true});});}
 function notices(id){return db.prepare(`SELECT p.*,u.nickname actor_name,u.email actor_email,r.seen_at FROM product_events p LEFT JOIN users u ON u.id=p.actor_id LEFT JOIN product_notice_reads r ON r.user_id=p.user_id AND r.event_id=p.id WHERE p.user_id=? ORDER BY p.rowid DESC LIMIT 200`).all(id).map(e=>({id:'product-'+e.id,kind:'subscription',product:e.product,revoked:e.kind==='revoke',until:e.until_at,sender:e.actor_name|| (e.actor_id?'Pongy AI Dev':'Pongy AI'),text:(e.product==='plus'?'Plus':'Умный ПК')+(e.kind==='revoke'?' — доступ завершён':' — доступ обновлён'),createdAt:e.created_at,readAt:e.seen_at||null,importance:2}));}
 function markRead(id,ids){let n=0;const mark=db.prepare('INSERT OR IGNORE INTO product_notice_reads VALUES(?,?,?)'),owns=db.prepare('SELECT 1 FROM product_events WHERE id=? AND user_id=?');db.transaction(()=>{for(const raw of (Array.isArray(ids)?ids:[]).slice(0,200)){if(typeof raw!=='string'||!raw.startsWith('product-'))continue;const key=raw.slice(8);if(owns.get(key,id))n+=mark.run(id,key,now()).changes;}})();return n;}
 return {revision,snapshot,publish,wait,notices,markRead,close(){closed=true;for(const id of [...waiting.keys()])publish(id);waiting.clear();}};
}
