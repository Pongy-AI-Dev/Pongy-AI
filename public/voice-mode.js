/* Voice conversation: one composer, private interim transcript, sentence-by-sentence playback. */
(function(root){'use strict';
var ctx,opened=false,phase='idle',generation=0,boundAccount='',boundChat=null,home,anchor,previousFocus,oldInert={},timer;
var replyRaw='',speechOffset=0,speechQueue=[],playing=false,replyComplete=false,resumeTimer;
var $=id=>document.getElementById(id),tr=(a,b)=>ctx.lang()==='ru'?a:b;
function active(){return opened;}
/* Never voice an unfinished code fence or link. Consume only stable sentence boundaries. */
function speechSlice(value,complete){
 var text=String(value||''),fence=false,inline=false,link=0,cut=0;
 for(var i=0;i<text.length;i++){
  if(text.slice(i,i+3)==='```'){fence=!fence;i+=2;continue;}
  if(fence)continue;
  if(text[i]==='`'){inline=!inline;continue;}
  if(inline)continue;
  if(text[i]==='[')link++;else if(text[i]===']')link=Math.max(0,link-1);
  if(link)continue;
  if(text[i]===']'&&text[i+1]==='('){var end=text.indexOf(')',i+2);if(end<0)break;i=end;continue;}
  if(/[.!?…]/.test(text[i])&&(/\s/.test(text[i+1]||'')||complete&&i===text.length-1)){
   var before=text.slice(0,i+1);if(/(?:\b[A-Za-zА-Яа-я]\.|\b(?:Mr|Mrs|Dr|e\.g|i\.e)\.)$/i.test(before))continue;
   cut=i+1;break;
  }
  if(i>=320&&/\s/.test(text[i])){cut=i+1;break;}
 }
 if(!cut&&complete&&!fence&&!inline&&!link)cut=text.length;
 return {text:text.slice(0,cut),rest:text.slice(cut),consumed:cut};
}
function labels(){
 if(!ctx)return;
 $('voiceModeBtn').title=$('voiceModeBtn').ariaLabel=opened?tr('Закрыть голосовой режим','Close voice mode'):tr('Голосовой режим Pongy','Pongy voice mode');
 $('voiceModeBtn').setAttribute('aria-expanded',String(opened));
 $('voiceModeClose').ariaLabel=tr('Закрыть голосовой режим','Close voice mode');
 $('voiceModeTitle').textContent=tr('Голосовой режим','Voice conversation');
 var orb=$('voiceModeOrb');orb.setAttribute('aria-label',phase==='paused'?tr('Продолжить разговор','Resume conversation'):tr('Поставить разговор на паузу','Pause conversation'));orb.setAttribute('aria-pressed',String(phase==='paused'));$('voiceModeHint').textContent=tr('Нажмите на круг — пауза / продолжение','Tap the orb to pause or resume');
}
function state(value,message){
 phase=value;$('voiceModeStage').dataset.state=value;labels();
 var map={connecting:tr('Подключаю микрофон…','Connecting microphone…'),listening:tr('Слушаю вас','Listening to you'),thinking:tr('Готовлю ответ','Preparing a reply'),speaking:tr('Pongy отвечает','Pongy is speaking'),paused:tr('На паузе','Paused')};
 $('voiceModeStatus').textContent=message||map[value]||'';
}
function clearReply(){clearTimeout(resumeTimer);speechQueue=[];playing=false;replyRaw='';speechOffset=0;replyComplete=false;}
function pause(message){if(!opened)return;++generation;clearReply();ctx.stopListening();ctx.stopSpeaking();level(0);state('paused',message);}
function canListen(){var s=ctx.snapshot();return opened&&s.ready&&!s.busy&&!s.draft&&!s.attachments&&!s.blocked&&document.visibilityState==='visible';}
function listen(){
 if(!opened)return;
 if(!canListen()){pause(tr('Отправьте или сохраните черновик, закройте другие окна и нажмите «Продолжить».','Send or keep your draft, close other dialogs, then press Continue.'));return;}
 var token=++generation;clearReply();ctx.stopSpeaking();state('connecting');ctx.startListening();
 setTimeout(function(){if(opened&&token===generation&&phase==='connecting'&&!ctx.snapshot().recording)pause(tr('Микрофон пока не запущен. Проверьте разрешение или сообщение под полем ввода.','The microphone has not started. Check its permission or the help below.'));},190000);
}
function close(){
 if(!opened)return;opened=false;++generation;clearReply();clearInterval(timer);ctx.closeMenu();ctx.stopListening();ctx.stopSpeaking();
 if(anchor?.parentNode)anchor.replaceWith($('inputArea'));else home?.appendChild($('inputArea'));
 $('voiceModeStage').hidden=true;document.body.classList.remove('voice-mode');
 for(var id of ['main','sidebar'])if($(id))$(id).inert=oldInert[id];labels();boundChat=null;boundAccount='';if(previousFocus?.isConnected)previousFocus.focus();
}
function open(){
 if(opened){close();return;}var s=ctx.snapshot();if(!s.ready)return;ctx.closeMenu();previousFocus=document.activeElement;boundAccount=s.account;boundChat=s.chatId;
 home=$('inputArea').parentNode;anchor=document.createComment('Pongy composer home');$('inputArea').before(anchor);$('voiceModeStage').appendChild($('inputArea'));
 for(var id of ['main','sidebar'])if($(id)){oldInert[id]=$(id).inert;$(id).inert=true;}
 opened=true;document.body.classList.add('voice-mode');$('voiceModeStage').hidden=false;labels();ctx.stopListening();ctx.stopSpeaking();$('voiceModeClose').focus();timer=setInterval(watch,150);listen();
}
function pending(chatId){
 if(!opened)return;if(boundChat&&boundChat!==chatId){close();return;}boundChat=chatId;++generation;clearReply();ctx.stopListening();ctx.stopSpeaking();level(0);state('thinking');
}
function current(){var s=ctx.snapshot();return opened&&s.ready&&s.account===boundAccount&&(!boundChat||s.chatId===boundChat);}
function playNext(){
 if(!current()||phase==='paused'||playing)return;
 if(ctx.snapshot().blocked){pause(tr('Подтвердите действие в открывшемся окне. Затем нажмите «Продолжить».','Review the action in the open dialog, then press Continue.'));return;}
 if(!speechQueue.length){
  if(replyComplete&&!ctx.snapshot().busy){var token=generation;clearTimeout(resumeTimer);resumeTimer=setTimeout(function(){if(current()&&token===generation&&phase!=='paused')listen();},120);}
  else state('thinking');return;
 }
 var text=speechQueue.shift(),token=generation;playing=true;state('speaking');ctx.stopListening();
 ctx.speak(text,function(error){
  if(!opened||token!==generation)return;playing=false;
  if(error){pause(tr('Озвучивание недоступно. Ответ сохранён в чате.','Speech playback is unavailable. The answer is saved in chat.'));return;}
  playNext();
 });
}
function collect(complete){
 var rest=replyRaw.slice(speechOffset),part;
 while(rest){part=speechSlice(rest,complete);if(!part.consumed)break;speechOffset+=part.consumed;rest=part.rest;var clean=ctx.cleanText(part.text);if(clean)speechQueue.push(clean);}
 playNext();
}
function chunk(result){
 if(!current()||result.chatId!==boundChat||phase==='paused')return;
 replyRaw=String(result.text||'');collect(false);
}
function answer(result){
 if(!opened||result.chatId!==boundChat)return;if(!current()){close();return;}
 if(result.error||result.interrupted||!result.text){pause(tr('Ответ не завершён. Проверьте чат перед продолжением.','The answer did not finish. Check the chat before continuing.'));return;}
 if(phase==='paused')return;
 replyRaw=String(result.text);replyComplete=true;collect(true);
}
function transcript(text){/* Transcript stays in the app turn buffer; never expose chat text on the orb screen. */}
function level(value){if(!opened)return;var n=Math.max(0,Math.min(1,Number(value)||0));$('voiceModeStage').style.setProperty('--voice-level',n.toFixed(3));}
function watch(){
 if(!opened)return;var s=ctx.snapshot();if(!current()){close();return;}
 if(s.blocked&&phase!=='paused'){pause(tr('Открыто другое окно. Завершите действие и нажмите «Продолжить».','Another dialog is open. Finish that action and press Continue.'));return;}
 if(phase==='connecting'&&s.recording)state('listening');else if(phase==='connecting'&&s.starting&&s.voiceProgress&&$('voiceModeStatus').textContent!==s.voiceProgress)state('connecting',s.voiceProgress);
 if(['connecting','listening'].includes(phase)&&s.voiceError)pause(s.voiceError);else if(phase==='listening'&&!s.recording&&!s.starting&&!s.busy)pause();
}
function init(options){
 ctx=options;var button=document.createElement('button');button.id='voiceModeBtn';button.type='button';button.setAttribute('aria-controls','voiceModeStage');
 var cross='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg>';
 button.innerHTML='<span class="voice-mode-dot" aria-hidden="true"><span class="voice-mode-exit">'+cross+'</span></span>';$('micBtn').before(button);button.onclick=open;
 var stage=document.createElement('section');stage.id='voiceModeStage';stage.hidden=true;stage.setAttribute('role','dialog');stage.setAttribute('aria-modal','true');stage.setAttribute('aria-labelledby','voiceModeTitle');
 stage.innerHTML='<header class="voice-mode-head"><div><strong>Pongy AI</strong><span id="voiceModeTitle"></span></div><button id="voiceModeClose" type="button">'+cross+'</button></header><div class="voice-mode-center"><button id="voiceModeOrb" type="button" class="voice-mode-orb"><span class="voice-orb-halo" aria-hidden="true"></span><span class="voice-orb-surface" aria-hidden="true"></span><i class="voice-orb-wave" aria-hidden="true"></i><i class="voice-orb-wave" aria-hidden="true"></i><i class="voice-orb-wave" aria-hidden="true"></i></button><h1 id="voiceModeStatus" role="status" aria-live="polite"></h1><p id="voiceModeHint"></p></div>';
 document.body.appendChild(stage);$('voiceModeClose').onclick=close;$('voiceModeOrb').onclick=function(){if(phase==='paused')listen();else pause();};
 $('userInput').addEventListener('beforeinput',function(e){if(opened&&e.isTrusted&&phase!=='paused')pause(tr('Можно написать сообщение. Для голоса нажмите «Продолжить».','You can type a message. Press Continue to use voice again.'));});
 $('attachBtn').addEventListener('click',function(){if(opened)pause();},true);
 document.addEventListener('visibilitychange',function(){if(opened&&document.visibilityState!=='visible')pause(tr('Вкладка скрыта — разговор на паузе.','This tab is hidden — conversation paused.'));});
 root.addEventListener('pagehide',close);
 document.addEventListener('keydown',function(e){
  if(!opened||ctx.snapshot().blocked)return;
  if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}
  if(e.key==='Tab'){var list=[...stage.querySelectorAll('button,textarea,input,select,a[href]')].filter(el=>!el.disabled&&el.getClientRects().length);if(!list.length)return;if(e.shiftKey&&document.activeElement===list[0]){e.preventDefault();list.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===list.at(-1)){e.preventDefault();list[0].focus();}}
 },true);labels();new MutationObserver(labels).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
}
root.PongyVoiceMode={init,active,close,pending,chunk,answer,pause,transcript,level,phase:function(){return phase}};
})(window);
