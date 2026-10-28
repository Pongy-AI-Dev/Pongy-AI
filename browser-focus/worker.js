/* Public bridge only. No microphone, page content, arbitrary navigation or tab enumeration. */
const PONGY_ORIGIN='https://pongy-ai.devs.surf';let lastFocus=-Infinity;
function trusted(url){try{return new URL(url).origin===PONGY_ORIGIN}catch{return false}}
chrome.runtime.onMessageExternal.addListener((message,sender,respond)=>{
 (async()=>{
  if(!trusted(sender.url)||!Number.isInteger(sender.tab?.id)||!['PONGY_FOCUS_STATUS','PONGY_WAKE_FOCUS'].includes(message?.type))return {ok:false,code:'NOT_ALLOWED'};
  const {enabled=false}=await chrome.storage.local.get('enabled');
  if(message.type==='PONGY_FOCUS_STATUS')return {ok:true,enabled:enabled===true};
  if(enabled!==true)return {ok:false,code:'DISABLED'};
  // Recheck the originating tab: it may have navigated since sending the message.
  const tab=await chrome.tabs.get(sender.tab.id);if(!trusted(tab.url))return {ok:false,code:'NOT_ALLOWED'};
  if(Date.now()-lastFocus<4000)return {ok:false,code:'COOLDOWN'};lastFocus=Date.now();
  await chrome.tabs.update(tab.id,{active:true});await chrome.windows.update(tab.windowId,{focused:true});
  return {ok:true,focused:true};
 })().then(respond,()=>respond({ok:false,code:'FOCUS_UNAVAILABLE'}));return true;
});
