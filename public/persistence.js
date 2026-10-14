(function(root){
'use strict';
// Only unsent chat snapshots. No passwords, authentication tokens or binary files.
var prefix='pongy_pending_v1:',ttl=7*86400000,maxBytes=1800000;
function create(storage,clock){clock=clock||Date.now;var sequence=0;
 function key(account){if(typeof account!=='string'||!account||account.length>320)throw new Error('Invalid account');return prefix+encodeURIComponent(account)}
 function read(account){var raw;try{raw=JSON.parse(storage.getItem(key(account))||'{}')}catch(e){raw={}}var out=Object.create(null);if(!raw||typeof raw!=='object')return out;Object.keys(raw).forEach(function(id){var e=raw[id];if(/^[\w-]{1,64}$/.test(id)&&e&&typeof e.version==='string'&&Number.isFinite(e.time)&&e.time>=clock()-ttl&&e.body&&typeof e.body.title==='string'&&Array.isArray(e.body.messages)&&typeof e.body.pinned==='boolean')out[id]=e});return out}
 function write(account,data){var text=JSON.stringify(data);if(new Blob([text]).size>maxBytes)throw new Error('Pending chat storage is full');if(Object.keys(data).length)storage.setItem(key(account),text);else storage.removeItem(key(account))}
 return {remember:function(account,id,body){if(!/^[\w-]{1,64}$/.test(id))throw new Error('Invalid chat');var data=read(account),entry={version:clock()+'-'+(++sequence)+'-'+Math.random().toString(36).slice(2),time:clock(),body:JSON.parse(JSON.stringify(body))};data[id]=entry;write(account,data);return entry},entries:function(account){return read(account)},peek:function(account,id){return read(account)[id]||null},ack:function(account,id,version){var data=read(account);if(data[id]&&data[id].version===version){delete data[id];write(account,data)}},drop:function(account,id){var data=read(account);delete data[id];write(account,data)},clear:function(account){storage.removeItem(key(account))}};
}
root.PongyPending={create:create};
})(typeof window==='object'?window:globalThis);
