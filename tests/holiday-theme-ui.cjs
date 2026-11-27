'use strict';
const {launchBrowser}=require('./browser.cjs');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
(async()=>{
 const {createApp}=await import('../server.js'),{loadConfig}=await import('../lib/config.js');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pongy-holiday-ui-'));
 const runtime=createApp({config:loadConfig({DATA_DIR:dir,JWT_SECRET:'holiday-fixture-jwt-'.repeat(4),SESSION_SECRET:'holiday-fixture-session-'.repeat(4)},dir)});
 const server=await new Promise(r=>{const s=runtime.app.listen(0,'127.0.0.1',()=>r(s));});
 const browser=await launchBrowser(),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.locator('#guestLoginBtn').click();
  await page.waitForFunction(()=>document.body.classList.contains('guest-mode')&&!document.querySelector('#userInput').disabled);
  await page.locator('#settingsBtn').click();await page.locator('#settingsModal.open').waitFor();await page.locator('#settings-tab-interface').click();
  await page.locator('#themeDropdownTrigger').click();await page.locator('#themeDropdownMenu [role=option]').filter({hasText:'Holiday'}).click();
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='holiday');
  const controls=page.locator('#holidayEffectsControls');if(!await controls.isVisible())throw Error('holiday snow controls are not visible in settings');
  const snow=controls.locator('input[type=checkbox]');if(!await snow.isChecked())throw Error('snow should be enabled by default for the holiday theme');
  await page.waitForFunction(()=>{const c=document.getElementById('holidaySnowCanvas');return !!c&&!c.hidden&&c.width>0&&c.height>0;});
  await snow.uncheck();await page.waitForFunction(()=>document.getElementById('holidaySnowCanvas').hidden);
  const intensity=controls.locator('input[type=range]');await intensity.fill('85');if(await controls.locator('output').textContent()!=='85%')throw Error('snow intensity output did not update');
  await snow.check();await page.waitForFunction(()=>!document.getElementById('holidaySnowCanvas').hidden);
  await page.mouse.move(700,300);await page.waitForTimeout(120);await page.mouse.click(700,300);
  const model=await page.locator('#chatModelName').evaluate(el=>({bg:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderTopWidth,font:getComputedStyle(el).fontSize}));
  if(model.bg!=='rgba(0, 0, 0, 0)'||model.border!=='0px'||parseFloat(model.font)<14)throw Error('model selector is not a clean, enlarged clickable text label: '+JSON.stringify(model));
  const seam=await page.locator('#inputArea').evaluate(el=>getComputedStyle(el).borderTopWidth);if(seam!=='0px')throw Error('composer top border remains visible in holiday theme: '+seam);
  const sidebar=await page.locator('#sidebarSections').evaluate(el=>getComputedStyle(el).overflowY);if(!['auto','scroll'].includes(sidebar))throw Error('sidebar navigation is not scrollable');
  await page.locator('#closeSettings').click();await page.locator('#settingsModal').waitFor({state:'hidden'});
  await page.evaluate(()=>{const el=document.createElement('div');el.id='dismissFixture';el.setAttribute('data-dismissible','');el.textContent='Dismiss this notice';document.body.append(el);});await page.locator('#dismissFixture .pongy-dismiss').waitFor({state:'visible'});await page.locator('#dismissFixture .pongy-dismiss').click();if(!await page.locator('#dismissFixture').evaluate(el=>el.hidden))throw Error('guest cannot dismiss a dismissible notice');
  const logo=await page.locator('#logoTop').evaluate(el=>({bg:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderTopWidth}));if(logo.bg!=='rgba(0, 0, 0, 0)'||logo.border!=='0px')throw Error('logo still has a surrounding square');
  if(errors.length)throw Error('browser errors: '+errors.join('; '));
  console.log('Holiday theme UI passed: snow toggle/intensity, canvas, dismissible guest notice, clean model label, composer seam and scrollable sidebar.');
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));runtime.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});