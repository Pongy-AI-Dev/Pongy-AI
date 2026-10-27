'use strict';
const {launchBrowser}=require('./browser.cjs');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
(async()=>{
 const {createApp}=await import('../server.js'),{loadConfig}=await import('../lib/config.js'),bcrypt=(await import('bcryptjs')).default;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pongy-settings-nav-'));
 const runtime=createApp({config:loadConfig({DATA_DIR:dir,JWT_SECRET:'navigation-jwt-'.repeat(4),SESSION_SECRET:'navigation-session-'.repeat(4)},dir)});
 runtime.db.prepare('INSERT INTO users(email,password,email_verified) VALUES(?,?,1)').run('pongy.support@gmail.com',bcrypt.hashSync('fixture-password',4));
 const server=await new Promise(resolve=>{const s=runtime.app.listen(0,'127.0.0.1',()=>resolve(s))});
 const browser=await launchBrowser(),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));const out=path.resolve('tests/artifacts');fs.mkdirSync(out,{recursive:true});let checks=0;
 function check(value,message){if(!value)throw Error(message);checks++;}
 async function visibleTab(id){return page.locator('#settings-tab-'+id).evaluate(el=>{const r=el.getBoundingClientRect(),rail=el.closest('.settings-tabs').getBoundingClientRect();return r.width>0&&r.left>=rail.left-1&&r.right<=rail.right+1;});}
 try{
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.locator('#authEmail').fill('pongy.support@gmail.com');await page.locator('#authPassword').fill('fixture-password');await page.locator('#authBtn').click();
  await page.waitForFunction(()=>!document.getElementById('userInput').disabled);
  await page.locator('#settingsBtn').click();await page.locator('#settings-tab-interface').click();
  await page.locator('#langGrid button').filter({hasText:'Русский'}).click();await page.locator('#betaFunctions').check();
  check(await page.locator('#settings-panel-beta').isVisible(),'beta panel not selected');
  for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844],['landscape',844,390]]){
   await page.setViewportSize({width,height});await page.locator('.settings-tabs [aria-selected=true]').focus();await page.keyboard.press('Home');
   await page.waitForFunction(()=>document.querySelector('.settings-tabs').scrollLeft<2);
   check(await visibleTab('main'),name+': keyboard Home leaves the first tab clipped');
   check(await page.locator('.settings-tabs-next').isVisible()&&await page.locator('.settings-tabs-next').isEnabled(),name+': missing forward navigation');
   const rail=await page.locator('.settings-tabs').boundingBox();await page.mouse.move(rail.x+rail.width/2,rail.y+rail.height/2);await page.mouse.wheel(0,3000);
   await page.waitForFunction(()=>{const s=document.querySelector('.settings-tabs');return s.scrollLeft+s.clientWidth>=s.scrollWidth-2;});
   check(await visibleTab('developer'),name+': mouse wheel does not expose Developer');
   check(await page.locator('.settings-tabs-next').isDisabled(),name+': forward arrow not disabled at the end');
   await page.locator('#settings-tab-developer').click();check(await page.locator('#settings-panel-developer').isVisible(),name+': Developer cannot be opened');
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+': page overflows horizontally');
   const body=page.locator('#settingsModal .modal-body');
   if(await body.evaluate(e=>e.scrollHeight>e.clientHeight+2)){
    const rect=await body.boundingBox();await page.mouse.move(rect.x+rect.width-20,rect.y+rect.height/2);await page.mouse.wheel(0,900);
    await page.waitForFunction(()=>document.querySelector('#settingsModal .modal-body').scrollTop>0);
    check(true,name+': settings content did not scroll');
   }
   await page.waitForFunction(()=>{const i=document.querySelector('.settings-tab-indicator').getBoundingClientRect(),t=document.querySelector('.settings-tabs [aria-selected=true]').getBoundingClientRect();return Math.abs(i.left-t.left)<2&&Math.abs(i.width-t.width)<2;});
   check(true,name+': floating indicator does not align with the selected tab');
   await page.screenshot({path:out+'/settings-navigation-tabs-'+name+'.png'});
   await page.locator('#adminCheckButton').click();
   await page.waitForFunction(()=>{const e=document.getElementById('adminCheckDialog'),r=e.getBoundingClientRect();return e.open&&Math.abs(r.x+r.width/2-innerWidth/2)<2&&Math.abs(r.y+r.height/2-innerHeight/2)<2;});
   check(await page.locator('#adminCheckDialog').evaluate(e=>e.parentElement===document.body&&e.matches(':modal')),name+': check selector is not in the modal top layer');
   check(await page.locator('#adminCheckDialog').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;}),name+': check dialog escapes viewport');
   await page.evaluate(()=>{const e=document.createElement('div');e.id='fixtureMaximumOverlay';Object.assign(e.style,{position:'fixed',inset:'0',zIndex:'2147483647'});document.body.append(e);});
   check(await page.locator('#adminCheckDialog').evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),name+': ordinary overlay covers the check dialog');
   await page.locator('#fixtureMaximumOverlay').evaluate(e=>e.remove());
   for(let i=0;i<5;i++)await page.keyboard.press('Tab');
   check(await page.locator('#adminCheckDialog').evaluate(e=>e.contains(document.activeElement)),name+': keyboard focus escapes modal');
   await page.screenshot({path:out+'/settings-navigation-check-'+name+'.png'});
   if(name==='mobile')fs.writeFileSync(out+'/settings-navigation-preview.html',(await page.content()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/(href|src)="\/(?!\/)/g,'$1="file://'+path.resolve('public')+'/'));
   await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.getElementById('adminCheckDialog').open);
   check(await page.locator('#adminCheckButton').evaluate(e=>e===document.activeElement),name+': focus not restored to Check');
   const before=await page.locator('.settings-tabs').evaluate(e=>e.scrollLeft);await page.locator('.settings-tabs-prev').click();
   await page.waitForFunction(x=>document.querySelector('.settings-tabs').scrollLeft<x,before);
   check(true,name+': back arrow does not move the strip');
   await page.locator('.settings-tabs [aria-selected=true]').focus();await page.keyboard.press('Home');await page.keyboard.press('End');
   await page.waitForFunction(()=>document.getElementById('settings-tab-developer').getAttribute('aria-selected')==='true');
   check(await visibleTab('developer'),name+': keyboard End does not reveal Developer');
  }
  check(errors.length===0,'browser errors: '+errors.join('; '));console.log('Settings navigation and centered top-layer check UI assertions passed:',checks);
 }catch(e){console.error('navigation diagnostics',await page.locator('.settings-tabs').evaluate(e=>({scroll:e.scrollLeft,width:e.clientWidth,total:e.scrollWidth,tabs:[...e.querySelectorAll('[role=tab]')].map(t=>({id:t.id,left:t.offsetLeft,selected:t.getAttribute('aria-selected')}))})));await page.screenshot({path:out+'/settings-navigation-failure.png'}).catch(()=>{});throw e;}
 finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));runtime.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
