'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {launchBrowser}=require('./browser.cjs');
(async()=>{
 const {createApp}=await import('../server.js');
 const {loadConfig}=await import('../lib/config.js');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pongy-support-ui-'));
 const runtime=createApp({config:loadConfig({DATA_DIR:dir,JWT_SECRET:'support-ui-jwt-'.repeat(4),SESSION_SECRET:'support-ui-session-'.repeat(4),FRONTEND_URL:'http://127.0.0.1:3187',PONGY_LOCAL_DEV_AUTH:'true',NODE_ENV:'development',OPENROUTER_API_KEY:''},dir)});
 const server=await new Promise(resolve=>{const instance=runtime.app.listen(0,'127.0.0.1',()=>resolve(instance));});
 const browser=await launchBrowser(),page=await browser.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  await page.goto(base,{waitUntil:'domcontentloaded'});
  const login=await page.evaluate(async()=>{const r=await fetch('/api/local-developer/session',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:'{}'});return r.status});
  if(login!==200)throw Error('local developer test login failed: '+login);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(async()=>{try{return (await fetch('/api/me',{credentials:'include'})).ok}catch{return false}},{timeout:10000});
  await page.locator('#directSupportLauncher').click();
  await page.waitForFunction(()=>!document.querySelector('#directSupportPanel').hidden);
  await page.waitForFunction(()=>document.querySelectorAll('#directSupportMessages article').length>=1,{timeout:10000});
  let messages=await page.locator('#directSupportMessages').innerText();
  if(!messages.includes('Здравствуйте, здесь вы можете оставить прямое обращение'))throw Error('support welcome message is missing');
  await page.locator('#directSupportInput').fill('Проверка чата прямой связи');
  await page.locator('#directSupportSend').click();
  await page.waitForFunction(()=>document.querySelector('#directSupportMessages')?.innerText.includes('Ожидайте, поддержка может ответить вам в течение 72 часов'),{timeout:10000});
  await page.locator('#directSupportModes [data-mode="developer"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('#directSupportList button').length>0,{timeout:10000});
  await page.locator('#directSupportList button').first().click();
  await page.waitForFunction(()=>!document.querySelector('#directSupportChat').hidden);
  await page.locator('#directSupportInput').fill('Ответ агента Pongy AI');
  await page.locator('#directSupportSend').click();
  await page.waitForFunction(()=>document.querySelector('#directSupportMessages')?.innerText.includes('Ответ агента Pongy AI'),{timeout:10000});
  await page.locator('#directSupportModes [data-mode="user"]').click();
  await page.waitForFunction(()=>document.querySelector('#directSupportMessages')?.innerText.includes('Ответ агента Pongy AI'),{timeout:10000});
  if(errors.length)throw Error('browser errors: '+errors.join('; '));
  console.log('Direct Support browser integration passed: user welcome, user submission, 72-hour acknowledgement, developer inbox, agent reply and user-side reply delivery.');
 }finally{
  await browser.close();server.closeAllConnections?.();await new Promise(resolve=>server.close(resolve));runtime.close();fs.rmSync(dir,{recursive:true,force:true});
 }
})().catch(error=>{console.error(error);process.exitCode=1});
