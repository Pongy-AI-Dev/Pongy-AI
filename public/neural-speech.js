(function(root){'use strict';let available=false,active=null,generation=0;
const base=((root.PONGY_CONFIG&&root.PONGY_CONFIG.apiUrl)||location.origin).replace(/\/+$/,'');
function volume(){try{const raw=root.localStorage.getItem('pongy_volume');if(raw===null||raw==='')return 1;const n=Number(raw);return Number.isFinite(n)?Math.max(0,Math.min(1,n/100)):1}catch{return 1}}
root.addEventListener('pongy-volume-change',()=>{if(active?.audio)active.audio.volume=volume()});
function stop(){generation++;if(active){active.controller.abort();active.audio?.pause();if(active.url)URL.revokeObjectURL(active.url);active=null;}}
function configure(value){available=value===true;root.PongySpeechChoice?.refresh();}
function enabled(locale){let saved='';try{saved=localStorage.getItem('pongy_tts_voice:'+locale)||'';}catch{}return locale==='ru'&&available&&saved==='piper-denis';}
async function speak(text,done){stop();const token=generation,controller=new AbortController();active={controller};try{const r=await fetch(base+'/api/speech',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({text}),signal:controller.signal});if(!r.ok)throw Error('SPEECH_ENGINE');const blob=await r.blob();if(token!==generation)return;const url=URL.createObjectURL(blob),audio=new Audio(url);audio.volume=volume();active={controller,audio,url};let ended=false;function finish(error){if(ended||token!==generation)return;ended=true;stop();done(error);}audio.onended=()=>finish();audio.onerror=()=>finish(Error('SPEECH_PLAYBACK'));await audio.play();}catch(e){if(token===generation){stop();done(e);}}}
root.PongyNeuralSpeech={configure,enabled,speak,stop,available:()=>available};
const auth=document.getElementById('authScreen');let lastShown=auth?.classList.contains('show');if(auth)new MutationObserver(()=>{const shown=auth.classList.contains('show');if(shown===lastShown)return;lastShown=shown;if(shown)stop();}).observe(auth,{attributes:true,attributeFilter:['class']});
})(window);
