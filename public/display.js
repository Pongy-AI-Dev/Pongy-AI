(function(root){
'use strict';
// Device display preferences are deliberately separate from account preferences.
// A phone's touch layout must never silently replace a desktop's layout.
var key='pongy_display_v1',prefs={},busy=false,initialized=false,pending=null;
try{var saved=JSON.parse(localStorage.getItem(key)||'{}');if(saved&&typeof saved==='object'){if(typeof saved.mobile==='boolean')prefs.mobile=saved.mobile;if(typeof saved.large==='boolean')prefs.large=saved.large;}}catch(_){}
function platform(){var value=new URLSearchParams(location.search).get('pongy_app');if(value==='android'||value==='windows')return value;try{var client=JSON.parse(sessionStorage.getItem('pongy_app_client')||'null');if(client?.platform==='android'||client?.platform==='windows')return client.platform;}catch(_){}return root.PongyNative?.platform||(root.PongyAndroid?'android':root.PongyDesktop?'windows':'web');}
function mobile(){if(typeof prefs.mobile==='boolean')return prefs.mobile;var p=platform();return p==='android'||p!=='windows'&&root.matchMedia('(max-width:1024px)').matches;}
function paint(){document.documentElement.dataset.layout=mobile()?'mobile':'desktop';document.documentElement.dataset.largeIcons=String(prefs.large===true);}
function labels(){var ru=document.documentElement.lang==='ru';var m=document.getElementById('mobileMode'),l=document.getElementById('largeIcons');if(!m||!l)return;m.checked=busy&&pending?.name==='mobile'?pending.value:mobile();l.checked=busy&&pending?.name==='large'?pending.value:prefs.large===true;m.disabled=l.disabled=busy;document.getElementById('mobileModeLabel').textContent=ru?'Мобильный режим':'Mobile mode';document.getElementById('largeIconsLabel').textContent=ru?'Крупные значки':'Large icons';}
function frame(){return new Promise(resolve=>requestAnimationFrame(resolve));}
function emit(){root.dispatchEvent(new CustomEvent('pongy-display-change',{detail:{mobile:mobile(),large:prefs.large===true}}));}
async function change(name,value){
 if(busy||!['mobile','large'].includes(name)||typeof value!=='boolean')return;
 busy=true;pending={name,value};labels();var before={...prefs},lastFocus=document.activeElement,host=document.createElement('section'),ru=document.documentElement.lang==='ru';
 host.id='displayApplying';host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-labelledby','displayApplyingTitle');host.setAttribute('aria-describedby','displayApplyingText');host.tabIndex=-1;
 host.innerHTML='<div class="display-loading-content"><img class="display-loading-logo" src="/welcome-logo.png" alt="" width="82" height="82"/><h2 id="displayApplyingTitle" aria-label="Pongy AI"><span aria-hidden="true">'+[...'Pongy AI'].map((c,i)=>'<span style="--letter:'+i+'">'+(c===' '?'&nbsp;':c)+'</span>').join('')+'</span></h2><p id="displayApplyingText">'+(ru?'Идёт применение изменений. Пожалуйста, подождите!':'Applying changes. Please wait!')+'</p><div class="display-progress" role="progressbar" aria-label="'+(ru?'Применение изменений':'Applying changes')+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div></div>';
 document.body.append(host);var roots=[...document.body.children].filter(el=>el!==host&&!['SCRIPT','STYLE','LINK'].includes(el.tagName)).map(el=>({el,inert:el.inert}));roots.forEach(v=>v.el.inert=true);document.documentElement.setAttribute('aria-busy','true');host.focus({preventScroll:true});
 var progress=host.querySelector('[role=progressbar]'),fill=progress.firstElementChild;
 function advance(n){progress.setAttribute('aria-valuenow',String(n));fill.style.transform='scaleX('+(n/100)+')';}
 try{
  await frame();await frame();advance(20);
  prefs={...prefs,[name]:value};paint();emit();roots.forEach(v=>v.el.inert=true);advance(65);
  // Wait for layout and a painted frame, rather than pretending to download assets.
  await frame();document.getElementById('main')?.getBoundingClientRect();await frame();advance(85);
  localStorage.setItem(key,JSON.stringify(prefs));advance(100);await frame();if(document.documentElement.dataset.motion!=='reduced')await new Promise(resolve=>{var timer=setTimeout(resolve,180);fill.addEventListener('transitionend',function(){clearTimeout(timer);resolve();},{once:true});});await frame();
 }catch(error){prefs=before;paint();emit();root.PongyAppSession?.notify(ru?'Не удалось сохранить вид интерфейса. Проверьте доступное место на устройстве.':'Could not save display preferences. Check available device storage.');}
 finally{roots.forEach(v=>{if(v.el.isConnected)v.el.inert=v.inert;});host.remove();document.documentElement.removeAttribute('aria-busy');busy=false;pending=null;labels();if(lastFocus?.isConnected&&!lastFocus.closest('[inert]'))lastFocus.focus({preventScroll:true});}
}
function refreshDefault(){if(typeof prefs.mobile!=='boolean'){paint();labels();if(initialized)emit();}}
paint();root.PongyDisplay={mobile,large:()=>prefs.large===true,labels,change};
root.addEventListener('resize',refreshDefault,{passive:true});root.addEventListener('pongy-native-ready',refreshDefault);root.addEventListener('pageshow',refreshDefault);
root.addEventListener('storage',function(e){if(e.key!==key)return;try{var v=JSON.parse(e.newValue||'{}');prefs={};if(typeof v.mobile==='boolean')prefs.mobile=v.mobile;if(typeof v.large==='boolean')prefs.large=v.large;paint();labels();emit();}catch(_){} });
function init(){initialized=true;labels();var m=document.getElementById('mobileMode'),l=document.getElementById('largeIcons');if(m)m.onchange=function(){change('mobile',this.checked);};if(l)l.onchange=function(){change('large',this.checked);};new MutationObserver(labels).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window);
