/* Wake-word listener for the Pongy trigger words (Pongy, Понги, Понг, Понгери, Понджи…).
   Runs the local Vosk recognizer in the background while the tab is hidden; when the
   trigger word is heard it signals the tab (native apps can raise their window)
   and starts voice input. Wake detection is local; command dictation may use
   the browser speech service, with an offline fallback. */
(function(root){'use strict';var ctx=null,listening=false,starting=false,recognizer=null,stream=null,audCtx=null,source=null,node=null,mute=null,seq=0,refractory=0,restartTimer=0,watchTimer=0,failures=0,pendingFocus=false,pendingAt=0,titleTimer=0,titleOriginal='',lastStatus='',activeLanguage='',lastHeard='',candidate=null,lastLoudAt=0,learning=null;
var $=function(id){return document.getElementById(id)},tr=function(ru,en){return ctx&&ctx.lang&&ctx.lang()==='ru'?ru:en};
var acoustic=root.PongyWakeAcoustic?.create({onWake:function(){if(!listening||!enabled()||learning||Date.now()<refractory||ctx?.voiceActive?.())return;refractory=Date.now()+6000;trigger('');}});
var wakeTest=null;var permissionBlocked=false;var WAKE_KEY='pongy_wake_word';
function enabled(){try{return root.localStorage.getItem(WAKE_KEY)==='on'}catch(e){return false}}
function setEnabled(value){try{if(value)root.localStorage.setItem(WAKE_KEY,'on');else root.localStorage.removeItem(WAKE_KEY)}catch(e){}}
// Match a wake prefix, never a substring in an unrelated sentence. The Russian
// model lacks a reliable pronunciation for the product name. Known phonetic
// alternatives are accepted only alone or before an imperative command.
function normalizePhrase(value){return String(value||'').toLowerCase().replace(/ё/g,'е').match(/[\p{L}]+/gu)||[];}
function profile(){try{var all=JSON.parse(root.localStorage.getItem('pongy_wake_profile_v1')||'{}');return all[langCode()]||'';}catch(e){return '';}}
function customWake(text){var saved=normalizePhrase(profile());if(saved.length<2||saved.length>5)return null;var raw=String(text||''),words=Array.from(raw.matchAll(/[\p{L}]+/gu));if(words.length<saved.length)return null;for(var i=0;i<saved.length;i++)if(normalizePhrase(words[i][0])[0]!==saved[i])return null;var end=words[saved.length-1];return {remainder:raw.slice(end.index+end[0].length).replace(/^[\s,.:!?…]+/,''),ambiguous:true,personalized:true};}
function startCalibration(){if(!enabled()||!listening||ctx?.voiceActive?.())return false;candidate=null;lastHeard='';learning={until:Date.now()+15000,heard:'',language:langCode()};return true;}
function calibration(){return {active:!!learning&&Date.now()<learning.until,heard:learning?.heard||'',language:learning?.language||langCode()};}
function saveCalibration(value){if(learning&&learning.language!==langCode())return false;var words=normalizePhrase(value),ignored=['эй','привет','окей','hey','hello','okay','да','нет','пожалуйста','открой','найди','помоги','yes','no','please','open','help'];if(words.length<2||words.length>5||!['эй','привет','окей','hey','hello','okay'].includes(words[0])||words.slice(1).every(function(v){return ignored.includes(v)}))return false;try{var all=JSON.parse(root.localStorage.getItem('pongy_wake_profile_v1')||'{}');all[langCode()]=words.join(' ');root.localStorage.setItem('pongy_wake_profile_v1',JSON.stringify(all));learning=null;candidate=null;refractory=Date.now()+1500;if(listening){teardown(true);ensure();}return true;}catch(e){return false;}}
function resetCalibration(){try{var all=JSON.parse(root.localStorage.getItem('pongy_wake_profile_v1')||'{}');delete all[langCode()];root.localStorage.setItem('pongy_wake_profile_v1',JSON.stringify(all));}catch(e){}learning=null;candidate=null;}
function wakeMatch(text){
 var custom=customWake(text);if(custom)return custom;
 var raw=String(text||'').trim().replace(/^[\s,.:!?…]+/,'').replace(/^(?:(?:эй|привет|слушай|hey|hello)[\s,.:!?…]+){1,2}/iu,'');
 var match=/^(понгиай|понгери|понджи|понги|понг|pongery|pongy|pongi|pong)(?=[\s,.:!?…]|$)/iu.exec(raw),ambiguous=false;
 // Ordinary words/names are never built-in aliases; personal calibration is explicit.
 if(!match)return null;
 var rest=raw.slice(match[0].length).replace(/^[\s,.:!?…]+/,'').replace(/^(?:ai|аи|ии|эй ай)(?:[\s,.:!?…]+|$)/iu,'').trim();
 if(ambiguous&&rest&&!/^(?:открой|открыть|создай|создать|напомни|напомнить|покажи|расскажи|найди|напиши|скажи|включи|выключи|посчитай|сколько|как|что|почему|сделай|помоги|open|create|remind|show|find|write|tell|calculate)(?=\s|$)/iu.test(rest))return null;
 // Never rewrite punctuation or case in a dictated command (URLs/code/files).
 if(/\[unk\]/i.test(String(text)))rest='';
 return {remainder:rest,ambiguous:ambiguous};
}
function wakeRemainder(text){return wakeMatch(text)?.remainder||'';}
function hasWake(text){return !!wakeMatch(text);}
// Keep the full acoustic vocabulary. A constrained brand-name grammar was
// rejected after ordinary recorded Russian speech produced false wake phrases.
// Do not force unknown audio into a product name absent from the vocabulary.
function status(state){lastStatus=state;var el=$('wakeWordHint');if(!el)return;var map={model:tr('Загружаю офлайн-модель распознавания…','Loading the offline recognition model…'),denied:tr('Нет доступа к микрофону — разрешите его, чтобы активация голосом работала.','Microphone access is blocked — allow it so voice activation can hear you.'),error:tr('Активация голосом остановлена из-за ошибки. Включите переключатель снова.','Voice activation stopped after an error. Toggle it back on to retry.'),waiting:tr('Жду разрешения на запуск звука — коснитесь экрана, и слушание включится.','Waiting for the browser to allow audio — tap the page and listening starts.'),listening:tr('Позовите Pongy','Call Pongy'),triggered:tr('Активация голосом: «Pongy» распознан.','Voice activation: “Pongy” detected.')};el.textContent=enabled()?(map[state]||''):'';}
function handleText(text,final){if(!listening||!text)return;lastHeard=String(text).slice(0,500);var at=Date.now();if(acoustic?.info().learning)return;if(learning&&at<learning.until){learning.heard=lastHeard;return;}if(at<refractory){candidate=null;return;}var match=wakeMatch(text);if(!match){candidate=null;return;}if(!final){if(!candidate||candidate.text!==text)candidate={text:text,at:at};return;}candidate=null;refractory=at+6000;trigger(match.remainder);}
// Some engines hold a short brand-name approximation in partial results without
// emitting an endpoint. Confirm it only after stable text AND actual mic silence.
function checkSilence(buffer){try{var samples=buffer.getChannelData(0),sum=0;for(var i=0;i<samples.length;i++)sum+=samples[i]*samples[i];var at=Date.now();if(Math.sqrt(sum/Math.max(1,samples.length))>.012)lastLoudAt=at;if(candidate&&at-candidate.at>=1200&&at-lastLoudAt>=800)handleText(candidate.text,true);}catch(e){}}
function prepareAudio(){if(!audCtx||audCtx.state==='closed'){var AC=root.AudioContext||root.webkitAudioContext;if(!AC)return null;audCtx=new AC();}if(audCtx.state!=='running')Promise.resolve(audCtx.resume()).catch(function(){});return audCtx;}
function flashTitle(){if(titleTimer)return;titleOriginal=document.title;var flag=true;var tick=function(){document.title=(flag?'Pongy AI — ':titleOriginal);flag=!flag;};document.title=tr('Pongy AI — откройте вкладку','Pongy AI — open this tab');titleTimer=setInterval(tick,900);setTimeout(function(){clearInterval(titleTimer);titleTimer=0;document.title=titleOriginal;},9000);}
function chime(){try{if(!audCtx)return;var at=audCtx.currentTime,g=audCtx.createGain();g.gain.value=0;g.connect(audCtx.destination);[[880,0],[1320,0.22]].forEach(function(pair){var o=audCtx.createOscillator();o.type='sine';o.frequency.value=pair[0];o.connect(g);o.start(at+pair[1]);o.stop(at+pair[1]+0.16);g.gain.setValueAtTime(0,at+pair[1]);g.gain.linearRampToValueAtTime(0.12,at+pair[1]+0.02);g.gain.linearRampToValueAtTime(0,at+pair[1]+0.16);});}catch(e){}}
function announce(){status('triggered');var body=tr('Зов распознан. Нажмите, чтобы открыть Pongy и сказать команду.','Wake detected. Click to open Pongy and say your command.');try{if(root.PongyAndroid?.showNotification){root.PongyAndroid.showNotification(JSON.stringify({id:'pongy-wake',text:body}));return;}if(!('Notification'in root)||Notification.permission!=='granted')return;
 var fallback=function(){try{var n=new Notification('Pongy AI',{body:body,tag:'pongy-wake'});n.onclick=function(){try{n.close();root.focus();onVisible()}catch(e){}};}catch(e){}};
 if(navigator.serviceWorker?.getRegistration)navigator.serviceWorker.getRegistration().then(function(reg){if(reg?.active&&pendingFocus)reg.active.postMessage({type:'pongy-wake-notify',nonce:pendingNonce,body:body});else if(pendingFocus)fallback();}).catch(fallback);else fallback();}catch(e){} }
var pendingCommand='',pendingNonce='';
function trigger(seed){
 if(wakeTest){wakeTest.detectedAt=Date.now();status('listening');return;}
 pendingCommand=seed||'';
 // A wake grants no browser user activation. Both native and browser focus are best effort.
 pendingFocus=true;pendingAt=Date.now();pendingNonce=String(pendingAt)+'-'+Math.random().toString(36).slice(2);
 try{root.PongyDesktop?.bringToFront?.()}catch(e){}
 try{root.PongyAndroid?.bringToFront?.()}catch(e){}
 try{root.focus?.()}catch(e){}
 if(document.visibilityState!=='visible')try{root.PongyFocusBridge?.requestFocus?.().catch(function(){})}catch(e){}
 if(document.visibilityState==='visible'){onVisible();return;}
 flashTitle();chime();announce();
}
function langCode(){return ctx&&ctx.lang&&String(ctx.lang()).toLowerCase().indexOf('ru')===0?'ru':'en'}
function teardown(keepAudio){++seq;acoustic?.reset();candidate=null;activeLanguage='';clearTimeout(restartTimer);if(node)node.onaudioprocess=null;[source,node,mute].forEach(function(n){try{n&&n.disconnect()}catch(e){}});try{recognizer&&recognizer.remove&&recognizer.remove()}catch(e){}recognizer=null;try{stream&&stream.getTracks().forEach(function(t){t.stop()})}catch(e){}stream=null;source=node=mute=null;if(audCtx&&!keepAudio){try{audCtx.close().catch(function(){})}catch(e){}audCtx=null;}listening=false;starting=false;}
var WAKE_AUDIO={audio:{channelCount:{ideal:1},echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false};
// Autoplay policies keep an AudioContext suspended until a user gesture; the watcher
// keeps retrying, and the first tap/key resumes it immediately.
function gestureResume(event){if(!enabled()||permissionBlocked||ctx?.voiceActive?.())return;try{prepareAudio();}catch(e){return;}if(!listening&&!starting&&(!event||!['pointerdown','touchstart'].includes(event.type)))ensure();}
function begin(model){
 var id=++seq;
 starting=true;
 var mic;try{if(!root.isSecureContext||!(root.AudioContext||root.webkitAudioContext)||!navigator.mediaDevices?.getUserMedia)throw Error('unsupported');mic=navigator.mediaDevices.getUserMedia(WAKE_AUDIO).catch(function(error){if(error&&/^(NotAllowedError|SecurityError|NotFoundError|NotReadableError)$/.test(error.name))throw error;return navigator.mediaDevices.getUserMedia({audio:true})})}catch(error){starting=false;status('denied');return}
 mic.then(function(value){
  if(id!==seq||!enabled()){value.getTracks().forEach(function(t){t.stop()});return}
  stream=value;prepareAudio();
  var resumeTimer;return Promise.race([Promise.resolve(audCtx.resume()),new Promise(function(resolve,reject){resumeTimer=setTimeout(function(){reject(Error('audio-capture'))},2500)})]).catch(function(error){throw Object.assign(Error('audio-capture'),{cause:error});}).finally(function(){clearTimeout(resumeTimer)}).then(function(){
   if(id!==seq||!enabled())return;
   if(!audCtx||audCtx.state!=='running'){starting=false;teardown(true);status('waiting');scheduleRestart();return;}
   var rec=model?new model.KaldiRecognizer(audCtx.sampleRate):null;recognizer=rec;
   if(rec)rec.on('partialresult',function(message){if(id===seq)handleText(message.result?.partial||'')});
   if(rec)rec.on('result',function(message){if(id===seq)handleText(message.result?.text||'',true)});
   if(rec)rec.on('error',function(){if(id!==seq)return;failures++;teardown();status('error');scheduleRestart();});
   var src=audCtx.createMediaStreamSource(stream),proc=audCtx.createScriptProcessor(2048,1,1),quiet=audCtx.createGain();quiet.gain.value=0;
   src.connect(proc);proc.connect(quiet);quiet.connect(audCtx.destination);source=src;node=proc;mute=quiet;
   proc.onaudioprocess=function(event){if(id!==seq||!listening)return;try{acoustic?.push(event.inputBuffer.getChannelData(0),audCtx.sampleRate);checkSilence(event.inputBuffer);if(id===seq&&listening&&rec)rec.acceptWaveform(event.inputBuffer)}catch(e){failures++;teardown();status('error');scheduleRestart();}};
   listening=true;starting=false;activeLanguage=langCode();lastLoudAt=Date.now();failures=0;status('listening');stream.getAudioTracks().forEach(function(track){track.addEventListener('ended',function(){if(id!==seq)return;teardown(true);status('error');scheduleRestart();},{once:true});});
  });
 }).catch(function(error){
  if(id!==seq)return;starting=false;teardown(true);
  if(error&&error.message==='audio-capture'){status('waiting');clearTimeout(restartTimer);restartTimer=setTimeout(ensure,5000);return;}
  permissionBlocked=!!(error&&/^(NotAllowedError|SecurityError)$/.test(error.name));if(permissionBlocked){teardown();status('denied');}else{status('error');scheduleRestart();}
 });
}
// Reuse an unlocked, microphone-free context between wake commands. Explicit
// disable/pagehide still closes it; recreating it after every command loses the gesture.
function stop(keepAudio){if(keepAudio!==true){wakeTest=null;learning=null;acoustic?.cancel();}if(listening||starting||audCtx||stream)teardown(keepAudio===true);}
function ensure(){
 clearTimeout(restartTimer);
 if(!enabled()||permissionBlocked||listening||starting)return;
 if(ctx&&ctx.voiceActive&&ctx.voiceActive())return;
 if(ctx&&ctx.ready&&!ctx.ready())return;
 if(acoustic&&(acoustic.info().enrolled||acoustic.info().learning)){begin(null);return;}
 var language=langCode(),model=root.PongyOfflineSpeech?.model&&root.PongyOfflineSpeech.model(language);
 if(!model){status('model');root.PongyOfflineSpeech?.preload?.(language).then(function(ok){if(ok)ensure();else status('error')});return;}
 begin(model);
}
function scheduleRestart(){if(!enabled())return;var delay=Math.min(15000,2000*Math.pow(2,Math.min(failures,3)));clearTimeout(restartTimer);restartTimer=setTimeout(ensure,delay);}
function onVisible(){
 if(document.visibilityState!=='visible'||!pendingFocus)return;
 var fresh=Date.now()-pendingAt<60000;pendingFocus=false;pendingNonce='';if(!fresh||!enabled()||(ctx?.ready&&!ctx.ready())){pendingCommand='';return;}status('triggered');
 stop(true);ctx?.startVoice?.(pendingCommand);pendingCommand='';
}
function watch(){
 clearInterval(watchTimer);
 watchTimer=setInterval(function(){
  if(!enabled()||(ctx&&ctx.ready&&!ctx.ready())){if(listening||starting||audCtx||stream)stop();pendingFocus=false;pendingCommand='';ctx?.cancelWake?.();return;}
  if(listening&&audCtx&&audCtx.state!=='running'){if(audCtx.state==='closed'){teardown();status('waiting');scheduleRestart();return;}try{prepareAudio();}catch(e){}if(audCtx.state!=='running'){teardown(true);status('waiting');scheduleRestart();}return;}
  if(listening&&activeLanguage!==langCode()){teardown(true);ensure();return;}var busy=ctx&&ctx.voiceActive&&ctx.voiceActive();if(pendingFocus&&Date.now()-pendingAt>=60000){pendingFocus=false;pendingCommand='';}
  if(busy&&listening)stop(true);
  else if(!busy&&!listening&&!starting)ensure();
 },1500);
}
function init(options){
 ctx=options||ctx;
 var box=$('wakeWordSetting');if(!box)return;
 var toggle=$('wakeWordToggle');
 var label=function(){var el=$('wakeWordLabel');if(el)el.textContent=tr('Активация голосом','Voice activation')};
 label();status(enabled()?'model':'');new MutationObserver(function(){label();status(lastStatus);}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 if(toggle){
  toggle.checked=enabled();
  toggle.addEventListener('change',function(){
   if(toggle.checked){permissionBlocked=false;setEnabled(true);status('model');try{prepareAudio();}catch(e){}ensure();}
   else{setEnabled(false);stop();ctx?.cancelWake?.();pendingFocus=false;pendingCommand='';status('');}
  });
 }
 ['pointerdown','keydown','touchstart','click'].forEach(function(type){document.addEventListener(type,gestureResume,{capture:true,passive:true});});document.addEventListener('visibilitychange',onVisible);if(navigator.serviceWorker?.addEventListener)navigator.serviceWorker.addEventListener('message',function(e){if(e.data?.type==='pongy-wake-focus'&&pendingFocus&&e.data.nonce===pendingNonce)onVisible();});
 root.addEventListener('pagehide',function(){stop();});
 watch();
}
root.PongyWakeWord={init:init,startWakeTest:function(){if(!enabled()||!acoustic?.info().enrolled||ctx?.voiceActive?.())return false;wakeTest={startedAt:Date.now(),detectedAt:0,segments:acoustic.info().segments||0};refractory=0;if(acoustic.rearm)acoustic.rearm();else acoustic.reset();ensure();return true;},endWakeTest:function(){wakeTest=null;},startAcousticCalibration:function(){if(!enabled()||permissionBlocked||ctx?.voiceActive?.()||!acoustic||ctx&&ctx.ready&&!ctx.ready())return false;learning=null;candidate=null;acoustic.start();try{prepareAudio();}catch(e){}if(!listening&&!starting)ensure();return true;},saveAcousticCalibration:function(){var saved=acoustic?.save()||false;if(saved&&listening){teardown(true);ensure();}return saved;},cancelAcousticCalibration:function(){var wasLearning=acoustic?.info().learning;acoustic?.cancel();if(wasLearning&&listening&&!recognizer&&!acoustic?.info().enrolled){teardown(true);ensure();}},resetAcousticCalibration:function(){acoustic?.clear();if(listening&&!recognizer){teardown(true);ensure();}},acousticStatus:function(){return acoustic?.info()||{enrolled:false,learning:false,count:0};},startCalibration:startCalibration,calibration:calibration,saveCalibration:saveCalibration,resetCalibration:resetCalibration,cancelCalibration:function(){if(!learning)return;learning=null;candidate=null;if(listening){teardown(true);ensure();}},profile:profile,isWake:hasWake,match:wakeMatch,stop:stop,status:function(){return lastStatus},diagnostics:function(){return{wakeTest:wakeTest?{...wakeTest}:null,enabled:enabled(),listening:listening,starting:starting,language:activeLanguage||langCode(),audioState:audCtx?.state||'closed',microphoneLive:!!stream?.getAudioTracks().some(function(t){return t.readyState==='live'}),lastHeard:lastHeard,acoustic:acoustic?.info(),permissionBlocked:permissionBlocked}}};
})(window);
