/* Wake-word listener for the Pongy trigger words (Pongy, Понги, Понг, Понгери, Понджи…).
   Runs the local Vosk recognizer in the background while the tab is hidden; when the
   trigger word is heard it raises the site tab and starts voice input. Audio never
   leaves the device: recognition uses the same offline model as dictation. */
(function(root){'use strict';var ctx=null,listening=false,starting=false,recognizer=null,stream=null,audCtx=null,source=null,node=null,mute=null,seq=0,refractory=0,restartTimer=0,watchTimer=0,failures=0,pendingFocus=false,pendingAt=0,titleTimer=0,titleOriginal='',lastStatus='';
var $=function(id){return document.getElementById(id)},tr=function(ru,en){return ctx&&ctx.lang&&ctx.lang()==='ru'?ru:en};
var WAKE_KEY='pongy_wake_word';
function enabled(){try{return root.localStorage.getItem(WAKE_KEY)==='on'}catch(e){return false}}
function setEnabled(value){try{if(value)root.localStorage.setItem(WAKE_KEY,'on');else root.localStorage.removeItem(WAKE_KEY)}catch(e){}}
// Fuzzy trigger match: "понг/понги/понгери/понджи/понги аи/понги ии/понги эй ай" and
// "pong/pongy/pongery", tolerant to single-letter recognizer slips ("pongi", "понги" misspells).
function lev(a,b){var m=a.length,n=b.length,row=[],i,j;for(i=0;i<=m;i++)row[i]=i;for(j=1;j<=n;j++){var prev=row[0];row[0]=j;for(i=1;i<=m;i++){var cur=row[i];row[i]=Math.min(row[i]+1,row[i-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=cur;}}return row[m]}
function isWakeToken(t){if(!t)return false;if(t.indexOf('понг')===0||t.indexOf('понд')===0)return true;if(t.indexOf('pong')===0)return true;return lev(t,'pongy')<=1}
function hasWake(text){var tokens=String(text||'').toLowerCase().replace(/ё/g,'е').split(/[^a-zа-я]+/);for(var i=0;i<tokens.length;i++)if(isWakeToken(tokens[i]))return true;return false}
function status(state){lastStatus=state;var el=$('wakeWordHint');if(!el)return;var map={model:tr('Загружаю офлайн-модель распознавания…','Loading the offline recognition model…'),denied:tr('Нет доступа к микрофону — разрешите его, чтобы триггер работал.','Microphone access is blocked — allow it so the trigger can hear you.'),error:tr('Триггер остановлен из-за ошибки. Включите переключатель снова.','The trigger stopped after an error. Toggle it back on to retry.'),listening:tr('Слушаю в фоне: скажите «Понги».','Listening in the background: say “Pongy”.'),triggered:tr('Триггер «Pongy» распознан.','Wake word “Pongy” detected.')};el.textContent=enabled()?(map[state]||''):'';}
function handleText(text){if(!listening||!text)return;var at=Date.now();if(at<refractory)return;if(!hasWake(text))return;refractory=at+6000;trigger();}
function flashTitle(){if(titleTimer)return;titleOriginal=document.title;var flag=true;var tick=function(){document.title=(flag?'Pongy AI — ':titleOriginal);flag=!flag;};document.title=tr('Pongy AI — слушаю…','Pongy AI — listening…');titleTimer=setInterval(tick,900);setTimeout(function(){clearInterval(titleTimer);titleTimer=0;document.title=titleOriginal;},9000);}
function chime(){try{if(!audCtx)return;var at=audCtx.currentTime,g=audCtx.createGain();g.gain.value=0;g.connect(audCtx.destination);[[880,0],[1320,0.22]].forEach(function(pair){var o=audCtx.createOscillator();o.type='sine';o.frequency.value=pair[0];o.connect(g);o.start(at+pair[1]);o.stop(at+pair[1]+0.16);g.gain.setValueAtTime(0,at+pair[1]);g.gain.linearRampToValueAtTime(0.12,at+pair[1]+0.02);g.gain.linearRampToValueAtTime(0,at+pair[1]+0.16);});}catch(e){}}
function announce(){status('triggered');try{if(root.PongyAndroid?.showNotification)root.PongyAndroid.showNotification(JSON.stringify({id:'pongy-wake',text:tr('Скажите команду — вкладка Pongy AI открыта.','Say your command — the Pongy AI tab is open.')}));else if('Notification'in root&&Notification.permission==='granted'){var n=new Notification('Pongy AI',{body:tr('Говорите — я слушаю.','Say your command — I am listening.'),tag:'pongy-wake'});n.onclick=function(){try{n.close();root.focus()}catch(e){}};}}catch(e){}}
function trigger(){
 if(root.PongyAndroid?.bringToFront)try{root.PongyAndroid.bringToFront()}catch(e){}
 if(document.visibilityState==='visible'){stop();ctx?.startVoice?.();return;}
 pendingFocus=true;pendingAt=Date.now();flashTitle();chime();announce();
}
function langCode(){return ctx&&ctx.lang&&String(ctx.lang()).toLowerCase().indexOf('ru')===0?'ru':'en'}
function teardown(){++seq;clearTimeout(restartTimer);if(node)node.onaudioprocess=null;[source,node,mute].forEach(function(n){try{n&&n.disconnect()}catch(e){}});try{recognizer&&recognizer.remove&&recognizer.remove()}catch(e){}recognizer=null;try{stream&&stream.getTracks().forEach(function(t){t.stop()})}catch(e){}stream=null;source=node=mute=null;if(audCtx){try{audCtx.close().catch(function(){})}catch(e){}audCtx=null;}listening=false;starting=false;}
function stop(){if(listening||starting)teardown();}
function begin(model){
 var id=++seq,language=langCode();
 starting=true;
 var mic;try{if(!root.isSecureContext||!(root.AudioContext||root.webkitAudioContext)||!navigator.mediaDevices?.getUserMedia)throw Error('unsupported');mic=navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}})}catch(error){starting=false;status('denied');return}
 mic.then(function(value){
  if(id!==seq||!enabled()){value.getTracks().forEach(function(t){t.stop()});return}
  stream=value;var AC=root.AudioContext||root.webkitAudioContext;audCtx=new AC();
  return Promise.resolve(audCtx.resume()).then(function(){
   if(id!==seq||!enabled())return;var rec=new model.KaldiRecognizer(audCtx.sampleRate);recognizer=rec;
   rec.on('partialresult',function(message){if(id===seq)handleText(message.result?.partial||'')});
   rec.on('result',function(message){if(id===seq)handleText(message.result?.text||'')});
   rec.on('error',function(){if(id!==seq)return;failures++;teardown();status('error');scheduleRestart();});
   var src=audCtx.createMediaStreamSource(stream),proc=audCtx.createScriptProcessor(4096,1,1),quiet=audCtx.createGain();quiet.gain.value=0;
   src.connect(proc);proc.connect(quiet);quiet.connect(audCtx.destination);source=src;node=proc;mute=quiet;
   proc.onaudioprocess=function(event){if(id!==seq||!listening)return;try{rec.acceptWaveform(event.inputBuffer)}catch(e){failures++;teardown();status('error');scheduleRestart();}};
   listening=true;starting=false;failures=0;status('listening');
  });
 }).catch(function(){
  if(id!==seq)return;starting=false;teardown();status('denied');
 });
}
function scheduleRestart(){if(!enabled())return;var delay=Math.min(15000,2000*Math.pow(2,Math.min(failures,3)));clearTimeout(restartTimer);restartTimer=setTimeout(ensure,delay);}
function ensure(){
 clearTimeout(restartTimer);
 if(!enabled()||listening||starting)return;
 if(ctx&&ctx.voiceActive&&ctx.voiceActive())return;
 if(ctx&&ctx.ready&&!ctx.ready())return;
 var language=langCode(),model=root.PongyOfflineSpeech?.model&&root.PongyOfflineSpeech.model(language);
 if(!model){status('model');root.PongyOfflineSpeech?.preload?.(language).then(function(ok){if(ok)ensure();else status('error')});return;}
 begin(model);
}
function onVisible(){
 if(document.visibilityState!=='visible'||!pendingFocus)return;
 var fresh=Date.now()-pendingAt<60000;pendingFocus=false;if(!fresh)return;
 stop();ctx?.startVoice?.();
}
function watch(){
 clearInterval(watchTimer);
 watchTimer=setInterval(function(){
  if(!enabled()){if(listening||starting)stop();return;}
  var busy=ctx&&ctx.voiceActive&&ctx.voiceActive();
  if(busy&&listening)stop();
  else if(!busy&&!listening&&!starting)ensure();
 },1500);
}
function init(options){
 ctx=options||ctx;
 var box=$('wakeWordSetting');if(!box)return;
 var toggle=$('wakeWordToggle');
 var label=function(){var el=$('wakeWordLabel');if(el)el.textContent=tr('Голосовой триггер «Pongy»','Wake word “Pongy”')};
 label();status(enabled()?'listening':'');
 if(toggle){
  toggle.checked=enabled();
  toggle.addEventListener('change',function(){
   if(toggle.checked){setEnabled(true);status('model');ensure();}
   else{setEnabled(false);stop();pendingFocus=false;status('');}
  });
 }
 document.addEventListener('visibilitychange',onVisible);
 root.addEventListener('pagehide',function(){stop();});
 watch();
}
root.PongyWakeWord={init:init,isWake:hasWake,stop:stop,status:function(){return lastStatus}};
})(window);
