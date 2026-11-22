'use strict';
const {launchBrowser}=require('./browser.cjs');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
(async()=>{
 const {createApp}=await import('../server.js'),{loadConfig}=await import('../lib/config.js'),bcrypt=(await import('bcryptjs')).default;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pongy-slowdown-ui-'));
 const runtime=createApp({config:loadConfig({DATA_DIR:dir,JWT_SECRET:'slowdown-test-jwt-'.repeat(4),SESSION_SECRET:'slowdown-test-session-'.repeat(4)},dir)});
 runtime.db.prepare('INSERT INTO users(email,password,email_verified) VALUES(?,?,1)').run('slowdown@example.test',bcrypt.hashSync('fixture-password',4));
 const server=await new Promise(resolve=>{const s=runtime.app.listen(0,'127.0.0.1',()=>resolve(s));});
 const browser=await launchBrowser(),context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[];
 let checks=0;const check=(v,m)=>{if(!v)throw Error(m);checks++;};
 page.on('pageerror',e=>errors.push(e.message));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  await page.goto(base);await page.locator('#authScreen.show').waitFor();
  check(await page.locator('#slowdownNotice').count()===1,'slowdown notice missing from initial document');
  check((await page.locator('#slowdownNoticeText').textContent()).trim()==='Pongy AI работает на 10% мощности','Russian notice copy changed');
  await page.locator('#authEmail').fill('slowdown@example.test');await page.locator('#authPassword').fill('fixture-password');await page.locator('#authBtn').click();
  await page.waitForFunction(()=>!document.querySelector('#userInput').disabled);
  check(await page.locator('#slowdownNotice').isVisible(),'notice is not visible after sign-in');
  check(await page.evaluate(()=>{const n=document.querySelector('#slowdownNotice').getBoundingClientRect(),i=document.querySelector('.input-box').getBoundingClientRect();return n.bottom<=i.top+1&&n.left>=0&&n.right<=innerWidth+1;}),'notice is not directly above the composer');
  check(await page.locator('#slowdownNotice').isVisible(),'capacity notice is not independent from service-state warnings');
  await page.locator('#slowdownNoticeClose').click();check(await page.locator('#slowdownNotice').isHidden(),'close button did not dismiss notice');
  await page.reload();await page.waitForFunction(()=>!document.querySelector('#userInput').disabled);
  check(await page.locator('#slowdownNotice').isVisible(),'notice dismissal persisted across a fresh visit');
  await page.setViewportSize({width:320,height:568});
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'notice causes horizontal overflow on a narrow phone');
  check(await page.locator('#slowdownNoticeClose').isVisible(),'close control is clipped on a narrow phone');
  check(errors.length===0,'browser errors: '+errors.join(';'));
  console.log('Slowdown notice UI assertions passed:',checks);
 }finally{await context.close();await browser.close();server.closeAllConnections?.();await new Promise(r=>server.close(r));runtime.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
