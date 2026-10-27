'use strict';
const {launchBrowser}=require('./browser.cjs');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
// The suite drives a silent microphone through Chromium's fake media stack; other
// engines have no equivalent headless flag, so they skip instead of failing.
if((process.env.BROWSER_ENGINE||'chromium')!=='chromium'){
 console.log('Wake word suite runs on the Chromium engine only (fake media stack).');
 process.exit(0);
}
process.env.PONGY_FAKE_MEDIA='1'; // silent fake microphone so the wake listener can start
// Minimal Vosk stand-in: the model "loads" instantly and the recognizer exposes an
// emitter the test drives instead of real audio, exercising the module's own pipeline.
const VOSK_STUB=`(function(){
 var recognizers=[];
 function FakeModel(url,sampleRate){this.worker={terminate:function(){},addEventListener:function(){}};}
 FakeModel.prototype.on=function(ev,cb){if(ev==='load')setTimeout(function(){cb({result:true})},10);};
 FakeModel.prototype.KaldiRecognizer=function(sampleRate,grammar){window.__wakeGrammar=grammar||null;
  var events={};
  var rec={on:function(name,cb){events[name]=cb;},acceptWaveform:function(){},remove:function(){}};
  rec.__emit=function(name,message){(events[name]||function(){})(message);};
  recognizers.push(rec);window.__pongyFakeRecognizer=rec;
  window.__pongyFakeRecognizerSerial=(window.__pongyFakeRecognizerSerial||0)+1;
  return rec;
 };
 window.Vosk={Model:FakeModel};
})();`;
(async()=>{
 const browser=await launchBrowser(),{createApp}=await import('../server.js'),{loadConfig}=await import('../lib/config.js'),bcrypt=(await import('bcryptjs')).default;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pongy-wake-word-')),runtime=createApp({config:loadConfig({DATA_DIR:dir,JWT_SECRET:'wake-word-jwt-'.repeat(4),SESSION_SECRET:'wake-word-session-'.repeat(4)},dir)});
 runtime.db.prepare('INSERT INTO users(email,password,email_verified) VALUES(?,?,1)').run('wake@example.test',bcrypt.hashSync('fixture-password',4));
 const server=await new Promise(resolve=>{const value=runtime.app.listen(0,'127.0.0.1',()=>resolve(value));}),page=await browser.newPage({viewport:{width:1280,height:800}});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 let count=0;const check=(value,message)=>{if(!value)throw Error(message);count++};
 try{
  await page.route('**/vendor/vosk/api.js',route=>route.fulfill({contentType:'text/javascript',body:VOSK_STUB}));
  await page.addInitScript(()=>{window.SpeechRecognition=class{start(){window.__browserSpeechStarts=(window.__browserSpeechStarts||0)+1;setTimeout(()=>this.onerror?.({error:'network'}),0)}abort(){}};window.webkitSpeechRecognition=undefined;});
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.locator('#authEmail').fill('wake@example.test');await page.locator('#authPassword').fill('fixture-password');await page.locator('#authBtn').click();await page.waitForFunction(()=>!document.querySelector('#userInput').disabled);
  await page.locator('#settingsBtn').click();await page.locator('#settingsModal.open').waitFor();
  await page.locator('#settings-tab-interface').click();check(await page.locator('#wakeWordSetting').isVisible(),'wake word setting row absent');
  check(/Активация голосом|Voice activation/.test(await page.locator('#wakeWordLabel').textContent()),'wake word label missing');
  check(!(await page.locator('#wakeWordToggle').isChecked()),'wake word enabled by default');
  await page.locator('#wakeWordToggle').click();
  await page.waitForFunction(()=>window.PongyWakeWord.status()==='listening'&&/^(Позовите Pongy|Call Pongy)$/.test(document.getElementById('wakeWordHint').textContent),null,{timeout:20000});
  check(true,'wake listener did not reach the listening state');check(await page.evaluate(()=>window.__wakeGrammar===null),'wake recognizer forces ordinary speech into a wake phrase');
  await page.locator('#closeSettings').click();await page.waitForTimeout(350);
  await page.waitForFunction(()=>!!window.__pongyFakeRecognizer,null,{timeout:20000});
  // Visible-tab trigger: the wake word starts voice input immediately.
  await page.evaluate(()=>window.__pongyFakeRecognizer.__emit('partialresult',{result:{partial:'эй понги'}}));
  await page.waitForFunction(()=>document.getElementById('micBtn').classList.contains('recording'),null,{timeout:20000});
  check(true,'wake word did not start voice input while the tab was visible');
  await page.locator('#micBtn').click();await page.waitForFunction(()=>!document.getElementById('micBtn').classList.contains('recording'),null,{timeout:20000});
  // Irrelevant speech must not trigger anything: wait until the background
  // listener is re-armed, then feed a decoy phrase into the live recognizer.
  const serialAfterVoice=await page.evaluate(()=>window.__pongyFakeRecognizerSerial||0);
  await page.waitForFunction(s=>(window.__pongyFakeRecognizerSerial||0)>s,serialAfterVoice,{timeout:20000});
  await page.evaluate(()=>window.__pongyFakeRecognizer.__emit('partialresult',{result:{partial:'понедельник начинается совсем иначе'}}));
  await page.waitForFunction(()=>!document.getElementById('micBtn').classList.contains('recording'),null,{timeout:3000});
  check(true,'unrelated speech started voice input');
  await page.evaluate(()=>window.__pongyFakeRecognizer.__emit('partialresult',{result:{partial:'ольге'}}));await page.waitForTimeout(150);check(!(await page.locator('#micBtn').evaluate(e=>e.classList.contains('recording'))),'ambiguous partial name triggered capture');await page.evaluate(()=>window.__pongyFakeRecognizer.__emit('result',{result:{text:'Ольге отправили документы'}}));
  // Hidden-tab trigger: the tab is raised with a signal and voice input starts on return.
  await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:function(){return 'hidden'}});document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForFunction(()=>!!window.__pongyFakeRecognizer,null,{timeout:20000}); // the background listener stays armed while hidden
  await page.waitForTimeout(6200);const titleBefore=await page.title();
  await page.evaluate(()=>window.__pongyFakeRecognizer.__emit('result',{result:{text:'он ге'}}));
  await page.waitForFunction(title=>document.title!==title,titleBefore,{timeout:5000});
  check(true,'hidden-tab trigger gave no raise signal');
  await page.waitForTimeout(800);
  check(!(await page.locator('#micBtn').evaluate(el=>el.classList.contains('recording'))),'voice input started while the tab was hidden');
  await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:function(){return 'visible'}});document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForFunction(()=>document.getElementById('micBtn').classList.contains('recording'),null,{timeout:20000});
  check(true,'returning to the raised tab did not start voice input');
  await page.evaluate(()=>window.__pongyFakeRecognizer.__emit('partialresult',{result:{partial:'просто добавь воды в суп'}}));
  await page.evaluate(()=>window.__pongyFakeRecognizer.__emit('result',{result:{text:'Как тебя зовут'}}));
  await page.waitForFunction(()=>[...document.querySelectorAll('.msg.user')].some(n=>n.textContent.includes('Как тебя зовут')),null,{timeout:10000});
  await page.waitForFunction(()=>!document.getElementById('micBtn').classList.contains('recording'));
  check(true,'wake command was not automatically sent');
  await page.waitForTimeout(6200);
  await page.evaluate(()=>{document.getElementById('userInput').value='';window.__pongyFakeRecognizer.__emit('partialresult',{result:{partial:'Понги'}})});
  await page.waitForFunction(()=>document.getElementById('micBtn').classList.contains('recording'),null,{timeout:20000});
  await page.waitForTimeout(10500);
  check(!(await page.locator('#micBtn').evaluate(el=>el.classList.contains('recording'))),'wake command capture did not stop after silence');
  check(await page.evaluate(()=>window.__browserSpeechStarts>0),'browser-to-offline fallback not exercised');check(errors.length===0,'browser errors: '+errors.join('; '));
  console.log('Wake word trigger, guard words and tab raise assertions passed:',count);
 }catch(error){console.error('WAKE DEBUG',await page.evaluate(()=>({input:document.getElementById('userInput').value,hint:document.getElementById('wakeWordHint').textContent,status:document.getElementById('voiceStatus').textContent,help:document.getElementById('voiceHelpText').textContent,toast:document.getElementById('toast').textContent,visibility:document.visibilityState,mic:document.getElementById('micBtn').className,serial:window.__pongyFakeRecognizerSerial})));try{fs.mkdirSync('tests/artifacts',{recursive:true});await page.screenshot({path:'tests/artifacts/wake-word-failure.png'})}catch(captureError){console.error('Failure screenshot unavailable:',captureError.message)}throw error}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));runtime.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1});
