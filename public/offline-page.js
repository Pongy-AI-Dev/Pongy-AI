/* Recovery performs public GET checks only; never resends account operations. */
(function(){'use strict';
var english=false;try{english=JSON.parse(localStorage.getItem('pongy_settings_ui')||'{}').lang==='en';}catch(_){}
function text(ru,en){return english?en:ru;}function el(id){return document.getElementById(id);}
if(english)document.documentElement.lang='en';
el('hint').textContent=text('Не удалось связаться с Pongy','Can’t reach Pongy');
el('retry').textContent=text('Повторить','Retry');
var started=Date.now(),attempt=0,controller=null,timer=null,deadline=null,stopped=false;
function stop(){stopped=true;clearTimeout(timer);clearTimeout(deadline);if(controller)controller.abort();}
function status(value){el('connectionProgress').textContent=value;}
function reload(){stop();location.reload();}
el('retry').onclick=reload;
window.addEventListener('pagehide',stop);
async function check(){
 if(stopped)return;attempt++;var current=new AbortController();controller=current;
 status(text('Подключение · '+attempt+'/3','Connecting · '+attempt+'/3'));
 deadline=setTimeout(function(){current.abort();},[60000,30000,15000][attempt-1]);
 try{
  var response=await fetch('/healthz',{signal:current.signal,cache:'no-store',credentials:'omit',redirect:'error'});
  if(!response.ok)throw Error('HTTP');var body=await response.json();if(stopped)return;if(body.status!=='ok')throw Error('Unexpected health response');
  status(text('Сервер доступен','Server is online'));
  var reloadKey='pongy_public_recovery_reload_at',previous=0,canRemember=false;
  try{previous=Number(sessionStorage.getItem(reloadKey))||0;if(Date.now()-previous>300000){sessionStorage.setItem(reloadKey,String(Date.now()));canRemember=true;}}catch(_){}
  if(canRemember)reload();else stop();
 }catch(_){
  if(stopped)return;var elapsed=Math.round((Date.now()-started)/1000);
  status(text('Нет ответа · '+elapsed+' с','No response · '+elapsed+' s'));
  if(attempt<3&&Date.now()-started<110000)timer=setTimeout(check,5000);
  else{status(text('Не удалось подключиться. Попробуйте позже','Could not connect. Try again later'));stop();}
 }finally{clearTimeout(deadline);if(controller===current)controller=null;}
}
if(typeof fetch==='function'&&typeof AbortController==='function')check();
})();
