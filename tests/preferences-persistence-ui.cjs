'use strict';
const {launchBrowser}=require('./browser.cjs');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
(async()=>{
 const {createApp}=await import('../server.js'),{loadConfig}=await import('../lib/config.js'),bcrypt=(await import('bcryptjs')).default;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pongy-prefs-persist-')),runtime=createApp({config:loadConfig({DATA_DIR:dir,JWT_SECRET:'persist-jwt-'.repeat(4),SESSION_SECRET:'persist-session-'.repeat(4)},dir)});
 const uid=runtime.db.prepare('INSERT INTO users(email,password,email_verified) VALUES(?,?,1)').run('persist@example.test',bcrypt.hashSync('fixture-password',4)).lastInsertRowid;
 runtime.db.prepare('INSERT INTO users(email,password,email_verified) VALUES(?,?,1)').run('other@example.test',bcrypt.hashSync('fixture-password',4));
 runtime.reminders.enqueueNotification(uid,'ready','en','persist-notice',false);
 const noticeId=runtime.reminders.notifications(uid)[0].id;
 const server=await new Promise(r=>{const s=runtime.app.listen(0,'127.0.0.1',()=>r(s))}),base='http://127.0.0.1:'+server.address().port,browser=await launchBrowser();let checks=0;const errors=[];
 function check(v,m){if(!v)throw Error(m);checks++;}
 async function login(p,email='persist@example.test'){p.on('pageerror',e=>errors.push(e.message));await p.goto(base);await p.locator('#authEmail').fill(email);await p.locator('#authPassword').fill('fixture-password');await p.locator('#authBtn').click();await p.waitForFunction(()=>!document.getElementById('userInput').disabled);}
 async function settings(p,tab){if(await p.evaluate(()=>PongyDisplay.mobile()&&!document.getElementById('sidebar').classList.contains('open')))await p.locator('#menuBtn').click();await p.locator('#settingsBtn').click();await p.locator('#settings-tab-'+tab).click();}
 const context=await browser.newContext(),page=await context.newPage();
 try{
  await login(page);await settings(page,'interface');const saved=page.waitForResponse(r=>r.url().endsWith('/api/preferences')&&r.request().method()==='PUT');await page.locator('#motionPreference').selectOption('reduced');await saved;
  await page.waitForFunction(async()=>{const p=await(await fetch('/api/preferences')).json();return p.motion==='reduced';});
  const remote=await page.evaluate(async()=> (await fetch('/api/preferences')).json());check(remote.motion==='reduced','server dropped the motion preference: '+JSON.stringify({remote,local:await page.evaluate(()=>localStorage.getItem('pongy_settings_ui:persist@example.test'))}));
  await page.locator('#popupNotifications').uncheck();await page.locator('#voiceGender').selectOption('female');await page.locator('#betaFunctions').check();await page.locator('#settings-tab-main').click();await page.locator('#memoryToggle').check();
  await page.locator('#settings-tab-account').click();await page.evaluate(()=>{PongyReminders.enablePush=async()=>false;});await page.locator('#answerNotifications').check();
  await page.waitForFunction(()=>!localStorage.getItem('pongy_preferences_pending:persist@example.test'));
  await page.reload();await page.waitForFunction(()=>!document.getElementById('userInput').disabled);await settings(page,'interface');
  check(!(await page.locator('#popupNotifications').isChecked()),'popup notification setting lost on reload');check(await page.locator('#betaFunctions').isChecked(),'beta checkbox lost on reload');check(await page.locator('#voiceGender').inputValue()==='female','voice selection lost on reload');check(await page.locator('#motionPreference').inputValue()==='reduced','motion lost on reload');
  await page.locator('#settings-tab-main').click();check(await page.locator('#memoryToggle').isChecked(),'memory checkbox lost on reload');await page.locator('#settings-tab-account').click();check(await page.locator('#answerNotifications').isChecked(),'notification opt-in lost on reload');
  // A change followed by logout before the debounce timer must reach the server.
  await page.locator('#answerNotifications').uncheck();await page.locator('#logoutBtnSettings').click();await page.locator('#confirmYes').click();await page.waitForFunction(()=>document.getElementById('authScreen').style.display!=='none'&&!document.getElementById('authEmail').disabled);
  const fresh=await browser.newContext(),second=await fresh.newPage();await second.route('**/api/preferences',async r=>{if(r.request().method()==='GET')await second.evaluate(()=>PongySettings.refresh());await r.continue();});await login(second);await settings(second,'account');check(!(await second.locator('#answerNotifications').isChecked()),'immediate logout lost notification opt-out on another browser');
  await second.locator('#settings-tab-interface').click();check(await second.locator('#motionPreference').inputValue()==='reduced','fresh browser did not restore motion');check(await second.locator('#betaFunctions').isChecked(),'fresh browser did not restore beta checkbox');check(await second.locator('#voiceGender').inputValue()==='female','fresh browser did not restore voice');await fresh.close();
  await page.locator('#authEmail').fill('persist@example.test');await page.locator('#authPassword').fill('fixture-password');await page.locator('#authBtn').click();await page.waitForFunction(()=>!document.getElementById('userInput').disabled);
  await page.locator('#notificationsBtn').click();await page.locator('.notification-row[data-id="'+noticeId+'"]').waitFor();
  await page.locator('#notificationsFilterBtn').click();await page.locator('#noticeSort-asc').click();await page.locator('#notificationsClose').click();await page.reload();await page.waitForFunction(()=>!document.getElementById('userInput').disabled);await page.locator('#notificationsBtn').click();await page.locator('#notificationsFilterBtn').click();check(await page.locator('#noticeSort-asc').getAttribute('aria-pressed')==='true','notification sort choice was not saved');await page.locator('#notificationsFilterBtn').click();
  // Reading while offline is a durable action, replayed after connectivity returns.
  runtime.reminders.enqueueNotification(uid,'error','en','offline-read',false);const offlineId=runtime.reminders.notifications(uid).find(e=>e.kind==='error').id;await page.evaluate(()=>PongyNotifications.poll());
  await page.route('**/api/notifications/read',r=>r.abort());await page.evaluate(()=>{localStorage.removeItem('pongy_notification_reads:persist@example.test')});
  await page.locator('.notification-row[data-id="'+offlineId+'"]').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('pongy_notification_reads:persist@example.test')||'[]').length>0);
  check(!(await page.locator('.notification-row[data-id="'+offlineId+'"] .notice-unread').count()),'offline read did not update local state');await page.unroute('**/api/notifications/read');await page.reload();await page.waitForFunction(()=>!document.getElementById('userInput').disabled);await page.evaluate(()=>PongyNotifications.poll());
  await page.waitForFunction(async id=>{const v=await(await fetch('/api/notifications')).json();return v.notifications.find(e=>e.id===id)?.readAt>0;},offlineId);check(true,'offline read was not replayed');
  await page.route('**/api/notifications',r=>r.fulfill({json:{notifications:[]}}));await page.reload();await page.waitForFunction(()=>!document.getElementById('userInput').disabled);await page.locator('#notificationsBtn').click();check(await page.locator('.notification-row[data-id="'+noticeId+'"]').count()===1,'empty server snapshot erased saved notifications');await page.unroute('**/api/notifications');
  const isolated=await browser.newContext(),other=await isolated.newPage();await login(other,'other@example.test');await other.locator('#notificationsBtn').click();check(await other.locator('.notification-row').count()===0,'notifications leaked between accounts');await settings(other,'main');check(!(await other.locator('#memoryToggle').isChecked()),'memory leaked between accounts');await isolated.close();
  // A failed preference write stays queued through a reload and is not
  // acknowledged merely because the network request finished.
  await settings(page,'main');await page.route('**/api/preferences',r=>r.request().method()==='PUT'?r.fulfill({status:503,json:{error:'Fixture write unavailable'}}):r.continue());
  const failedSave=page.waitForResponse(r=>r.url().endsWith('/api/preferences')&&r.request().method()==='PUT');await page.locator('#memoryToggle').uncheck();check((await failedSave).status()===503,'write failure fixture did not run');
  check(await page.evaluate(()=>!!localStorage.getItem('pongy_preferences_pending:persist@example.test')),'failed preference write was removed from the outbox');
  await page.reload();await page.waitForFunction(()=>!document.getElementById('userInput').disabled);await settings(page,'main');check(!(await page.locator('#memoryToggle').isChecked()),'pending checkbox value was lost on reload');
  await page.locator('#settings-tab-account').click();await page.locator('#logoutBtnSettings').click();await page.locator('#confirmYes').click();
  await page.waitForFunction(()=>document.getElementById('footerText').textContent.includes('not been confirmed'));
  check(await page.locator('#authScreen').isHidden(),'failed settings save silently logged the user out');
  await page.unroute('**/api/preferences');const replay=page.waitForResponse(r=>r.url().endsWith('/api/preferences')&&r.request().method()==='PUT');await page.evaluate(()=>window.dispatchEvent(new Event('online')));check((await replay).status()===200,'pending preferences were not retried');
  await page.locator('#logoutBtnSettings').click();await page.locator('#confirmYes').click();await page.locator('#authBtn').waitFor();
  await page.locator('#authEmail').fill('other@example.test');await page.locator('#authPassword').fill('fixture-password');await page.locator('#authBtn').click();await page.waitForFunction(()=>!document.getElementById('userInput').disabled);
  await page.locator('#notificationsBtn').click();check(await page.locator('.notification-row').count()===0,'cached notifications leaked after switching accounts in the same browser');await settings(page,'interface');check(!(await page.locator('#betaFunctions').isChecked()),'cached beta checkbox leaked after switching accounts');
  check(errors.length===0,'browser errors: '+errors.join('; '));console.log('Preference and notification persistence UI assertions passed:',checks);
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));runtime.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
