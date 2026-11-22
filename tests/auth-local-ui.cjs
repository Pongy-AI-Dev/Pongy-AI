'use strict';
const {launchBrowser}=require('./browser.cjs');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
(async()=>{
 const {createApp}=await import('../server.js');
 const {loadConfig}=await import('../lib/config.js');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pongy-auth-local-ui-'));
 const runtime=createApp({config:loadConfig({DATA_DIR:dir,JWT_SECRET:'auth-local-ui-jwt-'.repeat(4),SESSION_SECRET:'auth-local-ui-session-'.repeat(4),PONGY_LOCAL_DEV_AUTH:'true',NODE_ENV:'development'},dir)});
 const server=await new Promise(resolve=>{const instance=runtime.app.listen(0,'127.0.0.1',()=>resolve(instance));});
 const browser=await launchBrowser(),errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.waitForFunction(()=>!document.querySelector('#userInput').disabled&&window.PongyAppSession?.user()?.developer===true,{timeout:15000});
  if(!await page.locator('#authScreen').isHidden())throw Error('local developer sign-in left the login screen visible');
  if(await page.locator('#guestLoginHint').count())throw Error('obsolete guest hint is still rendered');
  await page.locator('#settingsBtn').click();
  await page.locator('#settingsModal.open').waitFor();
  await page.locator('#settings-tab-developer:not([hidden])').waitFor();
  await page.reload();
  await page.waitForFunction(()=>!document.querySelector('#userInput').disabled&&window.PongyAppSession?.user()?.developer===true,{timeout:15000});
  if(errors.length)throw Error('browser errors: '+errors.join('; '));
  console.log('Local auth UI passed: automatic loopback developer session, developer settings, and automatic session restoration.');
 }finally{await browser.close();await new Promise(resolve=>{server.closeAllConnections();server.close(resolve)});runtime.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
