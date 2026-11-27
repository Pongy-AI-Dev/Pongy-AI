'use strict';
const {launchBrowser}=require('./browser.cjs');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');

(async()=>{
 const {createApp}=await import('../server.js');
 const {loadConfig}=await import('../lib/config.js');
 const bcrypt=(await import('bcryptjs')).default;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pongy-beta-features-'));
 const runtime=createApp({config:loadConfig({DATA_DIR:dir,JWT_SECRET:'fixture-beta-jwt-'.repeat(4),SESSION_SECRET:'fixture-beta-session-'.repeat(4)},dir)});
 runtime.db.prepare('INSERT INTO users(email,password,email_verified) VALUES(?,?,1)').run('beta@example.test',bcrypt.hashSync('fixture-password',4));
 const server=await new Promise(resolve=>{const instance=runtime.app.listen(0,'127.0.0.1',()=>resolve(instance));});
 const browser=await launchBrowser();
 const page=await browser.newPage({viewport:{width:1024,height:768}});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{const native=window.setInterval.bind(window);window.setInterval=(callback,delay,...args)=>native(callback,delay===120000?250:delay,...args);});
 try{
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.locator('#authEmail').fill('beta@example.test');
  await page.locator('#authPassword').fill('fixture-password');
  await page.locator('#authBtn').click();
  await page.waitForFunction(()=>!document.querySelector('#userInput').disabled);
  if(await page.evaluate(()=>PongyDisplay.mobile()&&!document.querySelector('#sidebar').classList.contains('open')))await page.locator('#menuBtn').click();
  await page.locator('#settingsBtn').click();
  await page.locator('#settingsModal.open').waitFor();
  if(await page.locator('#settings-tab-beta').isVisible())throw Error('Beta features section remains visible while disabled');if(await page.locator('#settings-tab-beta').getAttribute('aria-selected')==='true')throw Error('Beta features section opened without selection');
  await page.locator('#settings-tab-interface').click();
  await page.locator('#languageDropdownTrigger').click();await page.locator('#languageDropdownMenu button').filter({hasText:'Русский'}).click();
  await page.locator('#betaFunctions').check();
  await page.locator('#settings-tab-beta').waitFor({state:'visible'});
  await page.waitForFunction(async()=>!!(await(await fetch('/api/preferences')).json()).betaFunctions);
  if(await page.locator('#settings-tab-beta').getAttribute('aria-selected')!=='true')throw Error('beta section did not open after enabling beta mode');
  for(const key of ['earlyAccess','developerFeatures']){
    if(await page.locator('#betaFeature-'+key).count()!==1)throw Error('beta feature switch missing: '+key);
  }
  if(!(await page.locator('#settings-panel-beta').innerText()).includes('Ранний доступ'))throw Error('early access description missing');
  if(await page.locator('.security-beta-scene, #betaScenarioButton').count())throw Error('legacy simulation controls remain');
  await page.locator('#settings-tab-interface').click();
  await page.locator('#betaFunctions').uncheck();
  await page.locator('#settings-tab-beta').waitFor({state:'hidden'});if(await page.locator('#settings-panel-beta').isVisible())throw Error('beta panel stayed open after disabling beta mode');
  if(await page.locator('#settings-tab-interface').getAttribute('aria-selected')!=='true')throw Error('turning beta mode off changed the selected settings section');
  await page.waitForFunction(async()=>!(await(await fetch('/api/preferences')).json()).betaFunctions);
  if(errors.length)throw Error('browser errors: '+errors.join(';'));
  console.log('Beta features settings UI assertions passed: 6');
 }finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
  runtime.close();
  fs.rmSync(dir,{recursive:true,force:true});
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
