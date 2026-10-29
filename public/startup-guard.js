/* Small first-load watchdog: never clears sessions, keys or local history. */
(function(){'use strict';
var done=false,timer,overlay=null;
function ru(){try{return JSON.parse(localStorage.getItem('pongy_settings_ui')||'{}').lang!=='en';}catch(_){return true;}}
function close(){clearTimeout(timer);if(overlay){overlay.remove();overlay=null;}}
function show(reason){if(done||overlay)return;var russian=ru();overlay=document.createElement('section');overlay.id='startupRecovery';overlay.setAttribute('role','alert');overlay.setAttribute('aria-live','polite');Object.assign(overlay.style,{position:'fixed',inset:'0',zIndex:'2147483000',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'16px',padding:'24px',boxSizing:'border-box',background:matchMedia('(prefers-color-scheme: dark)').matches?'#171b25':'#f8f9fc',color:matchMedia('(prefers-color-scheme: dark)').matches?'#e9ecf4':'#202330',font:'16px/1.5 Arial,sans-serif',textAlign:'center'});
var title=document.createElement('h1');title.textContent=russian?'Pongy загружается дольше обычного':'Pongy is taking longer to load';title.style.fontSize='22px';title.style.margin='0';
var text=document.createElement('p');text.textContent=russian?'Не удалось завершить загрузку. Проверьте соединение и повторите попытку. Ваши данные не удалены.':'Loading has not completed. Check your connection and retry. Your data has not been cleared.';text.style.maxWidth='420px';text.style.margin='0';
var retry=document.createElement('button');retry.id='startupReload';retry.type='button';retry.textContent=russian?'Повторить загрузку':'Reload';Object.assign(retry.style,{border:'0',borderRadius:'12px',padding:'12px 20px',background:'#6661ef',color:'#fff',font:'inherit',cursor:'pointer'});retry.onclick=function(){location.reload();};
var detail=document.createElement('small');detail.textContent=reason==='resource'?(russian?'Не загрузился файл интерфейса.':'An interface file failed to load.'):(russian?'Превышено время ожидания загрузки.':'Loading is taking too long.');detail.style.color='#687083';overlay.append(title,text,retry,detail);(document.body||document.documentElement).append(overlay);}
window.PongyStartup=Object.freeze({ready:function(){done=true;close();}});
timer=setTimeout(function(){show('timeout');},12000);
window.addEventListener('error',function(e){if(!done&&e.target&&e.target.tagName==='SCRIPT')show('resource');},true);
window.addEventListener('pagehide',close);
window.addEventListener('pageshow',function(e){if(e.persisted&&!done){clearTimeout(timer);timer=setTimeout(function(){show('timeout');},12000);}});
})();
