/* Recovery performs public GET checks only; never resends account operations. */
(function(){'use strict';
var english=false;try{english=JSON.parse(localStorage.getItem('pongy_settings_ui')||'{}').lang==='en';}catch(_){}
function text(ru,en){return english?en:ru;}function el(id){return document.getElementById(id);}
if(english)document.documentElement.lang='en';
el('hint').textContent=text('Не удалось связаться с Pongy. Возможна недоступность сервера или сетевого маршрута; это не обязательно отсутствие интернета.','Unable to reach Pongy. The server or network route may be unavailable; your internet is not necessarily offline.');
el('warning').textContent=text('Связь с Pongy не установлена.','No connection to Pongy.');el('retry').textContent=text('Повторить подключение','Retry connection');el('composer').placeholder=text('Сообщения недоступны до подключения к Pongy','Messaging unavailable until Pongy reconnects');
var started=Date.now(),attempt=0,controller=null,timer=null,deadline=null,stopped=false;
function stop(){stopped=true;clearTimeout(timer);clearTimeout(deadline);if(controller)controller.abort();}
function status(value){el('connectionProgress').textContent=value;}
function reload(){stop();location.reload();}
el('retry').onclick=reload;
window.addEventListener('pagehide',stop);
async function check(){
 if(stopped)return;attempt++;var current=new AbortController();controller=current;
 status(text('Подключаемся к серверу. Попытка ','Connecting to server. Attempt ')+attempt+'/3. '+text('Запуск может занять до 2 минут.','Startup may take up to 2 minutes.'));
 deadline=setTimeout(function(){current.abort();},[60000,30000,15000][attempt-1]);
 try{
  var response=await fetch('/healthz',{signal:current.signal,cache:'no-store',credentials:'omit',redirect:'error'});
  if(!response.ok)throw Error('HTTP');var body=await response.json();if(stopped)return;if(body.status!=='ok')throw Error('Unexpected health response');
  status(text('Сервер доступен. Можно загрузить интерфейс.','Server reachable. The interface can now be loaded.'));
  // At most one automatic reload per five minutes, including across page loads.
  var reloadKey='pongy_public_recovery_reload_at',previous=0,canRemember=false;
  try{previous=Number(sessionStorage.getItem(reloadKey))||0;if(Date.now()-previous>300000){sessionStorage.setItem(reloadKey,String(Date.now()));canRemember=true;}}catch(_){}
  if(canRemember)reload();else stop();
 }catch(_){
  if(stopped)return;var elapsed=Math.round((Date.now()-started)/1000);
  status(text('Сервер пока не ответил. Прошло ','Server has not responded yet. Elapsed ')+elapsed+text(' с.',' s.'));
  if(attempt<3&&Date.now()-started<110000)timer=setTimeout(check,5000);
  else{status(text('Не удалось подключиться за отведённое время. Проверьте доступность Pongy или повторите попытку позже.','Could not connect within the allowed time. Check Pongy availability or retry later.'));stop();}
 }finally{clearTimeout(deadline);if(controller===current)controller=null;}
}
if(typeof fetch==='function'&&typeof AbortController==='function')check();
})();
