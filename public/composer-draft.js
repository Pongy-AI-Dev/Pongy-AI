(function(root){
'use strict';
var PREFIX='pongy_composer_draft_v1:',MAX_TEXT=20000;
function create(storage){
 function key(account,chatId){
  if(typeof account!=='string'||!account||account.length>320)throw new Error('Invalid account');
  if(typeof chatId!=='string'||!/^[\w-]{1,64}$/.test(chatId))throw new Error('Invalid chat');
  return PREFIX+encodeURIComponent(account)+':'+chatId;
 }
 function read(account,chatId){
  try{
   var value=JSON.parse(storage.getItem(key(account,chatId))||'null');
   return value&&value.version===1&&typeof value.text==='string'&&value.text.length<=MAX_TEXT?value.text:'';
  }catch(_){return '';}
 }
 function save(account,chatId,text){
  if(typeof text!=='string')return false;
  if(text.length>MAX_TEXT)text=text.slice(0,MAX_TEXT);
  var id;try{id=key(account,chatId);}catch(_){return false;}
  try{
   if(!text){storage.removeItem(id);return true;}
   storage.setItem(id,JSON.stringify({version:1,text:text,updatedAt:Date.now()}));
   return true;
  }catch(_){return false;}
 }
 function remove(account,chatId){try{storage.removeItem(key(account,chatId));return true;}catch(_){return false;}}
 return Object.freeze({read:read,save:save,remove:remove});
}
root.PongyComposerDraft={create:create};
})(typeof window==='object'?window:globalThis);
