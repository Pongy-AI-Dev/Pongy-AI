/* Small first-load watchdog: never clears sessions, keys or local history. */
(function(){'use strict';
var done=false,timer,overlay=null,probe=null,probeTimer=null;
function ru(){try{return JSON.parse(localStorage.getItem('pongy_settings_ui')||'{}').lang!=='en';}catch(_){return true;}}
function close(){clearTimeout(timer);clearTimeout(probeTimer);if(probe){probe.abort();probe=null;}if(overlay){overlay.remove();overlay=null;}}
function show(reason){if(done||overlay)return;var russian=ru();overlay=document.createElement('section');overlay.id='startupRecovery';overlay.setAttribute('role','alert');overlay.setAttribute('aria-live','polite');Object.assign(overlay.style,{position:'fixed',inset:'0',zIndex:'2147483000',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'16px',padding:'24px',boxSizing:'border-box',background:matchMedia('(prefers-color-scheme: dark)').matches?'#171b25':'#f8f9fc',color:matchMedia('(prefers-color-scheme: dark)').matches?'#e9ecf4':'#202330',font:'16px/1.5 Arial,sans-serif',textAlign:'center'});
var title=document.createElement('h1');title.textContent=russian?'Pongy загружается дольше обычного':'Pongy is taking longer to load';title.style.fontSize='22px';title.style.margin='0';
var text=document.createElement('p');text.textContent=russian?'Загрузка ещё идёт. Запуск сервера иногда занимает 1–2 минуты. Ваши данные не удалены.':'Loading is still in progress. Starting the server can take 1–2 minutes. Your data has not been cleared.';text.style.maxWidth='420px';text.style.margin='0';
var retry=document.createElement('button');retry.id='startupReload';retry.type='button';retry.textContent=russian?'Повторить загрузку':'Reload';Object.assign(retry.style,{border:'0',borderRadius:'12px',padding:'12px 20px',background:'#6661ef',color:'#fff',font:'inherit',cursor:'pointer'});retry.onclick=function(){location.reload();};
var detail=document.createElement('small');detail.textContent=reason==='resource'?(russian?'Не загрузился файл интерфейса.':'An interface file failed to load.'):(russian?'Ожидаем файлы интерфейса; это ещё не означает отсутствие интернета.':'Waiting for interface files; this does not prove your internet is offline.');detail.style.color='#687083';overlay.append(title,text,retry,detail);(document.body||document.documentElement).append(overlay);
// Read-only, one bounded check. Never retry chat/payment mutations or disable TLS.
if(typeof fetch==='function'&&typeof AbortController==='function'){
 probe=new AbortController();var current=probe,started=Date.now();detail.textContent=russian?'Проверяем связь с сервером…':'Checking the server connection…';probeTimer=setTimeout(function(){current.abort();},90000);
 fetch('/healthz',{signal:current.signal,credentials:'omit',cache:'no-store',redirect:'error'}).then(function(response){if(!response.ok)throw Error('HTTP');return response.json();}).then(function(body){if(body.status!=='ok')throw Error('Unexpected response');if(!done&&overlay)detail.textContent=russian?'Сервер доступен. Ожидаем интерфейс; если файл не загрузился, нажмите «Повторить загрузку».':'Server reachable. Waiting for the interface; reload if a file failed to load.';}).catch(function(){if(!done&&overlay)detail.textContent=(russian?'Связь с сервером не подтверждена. Проверка заняла ':'Server connection not confirmed. Check took ')+Math.round((Date.now()-started)/1000)+(russian?' с. Можно повторить загрузку.':' s. You can reload.');}).finally(function(){clearTimeout(probeTimer);if(probe===current)probe=null;});
}
}
window.PongyStartup=Object.freeze({ready:function(){done=true;close();}});
timer=setTimeout(function(){show('timeout');},12000);
window.addEventListener('error',function(e){if(!done&&e.target&&e.target.tagName==='SCRIPT')show('resource');},true);
window.addEventListener('pagehide',close);
window.addEventListener('pageshow',function(e){if(e.persisted&&!done){clearTimeout(timer);timer=setTimeout(function(){show('timeout');},12000);}});
})();
