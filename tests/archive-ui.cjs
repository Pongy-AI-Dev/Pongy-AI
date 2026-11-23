'use strict';
const {launchBrowser}=require('./browser.cjs');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
(async()=>{
 const {createApp}=await import('../server.js'),{loadConfig}=await import('../lib/config.js'),bcrypt=(await import('bcryptjs')).default;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pongy-archive-ui-'));
 const runtime=createApp({config:loadConfig({DATA_DIR:dir,JWT_SECRET:'archive-ui-jwt-'.repeat(4),SESSION_SECRET:'archive-ui-session-'.repeat(4)},dir)});
 runtime.db.prepare('INSERT INTO users(email,password,email_verified) VALUES(?,?,1)').run('archive@example.test',bcrypt.hashSync('fixture-password',4));
 const server=await new Promise(resolve=>{const s=runtime.app.listen(0,'127.0.0.1',()=>resolve(s))});
 const base='http://127.0.0.1:'+server.address().port,browser=await launchBrowser(),context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
 let count=0;const check=(v,m)=>{if(!v)throw Error(m);count++};
 const chatId='archive-ui-chat';
 async function login(){await page.locator('#authScreen.show').waitFor();await page.locator('#authEmail').fill('archive@example.test');await page.locator('#authPassword').fill('fixture-password');await page.locator('#authBtn').click();await page.waitForFunction(()=>!document.querySelector('#userInput').disabled)}
 async function serverArchived(expected){await page.waitForFunction(async({chatId,expected})=>{const r=await fetch('/api/chats');if(!r.ok)return false;const rows=await r.json(),chat=rows.find(c=>c.id===chatId);return !!chat&&((Number(chat.archived_at||chat.archivedAt)||0)>0)===expected},{chatId,expected},{timeout:10000})}
 try{
  await page.goto(base);await login();
  const seeded=await page.evaluate(async id=>{const r=await fetch('/api/chats/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Archive test conversation',messages:[],pinned:false,projectId:null})});return r.ok},chatId);
  check(seeded,'could not seed chat through authenticated API');
  await page.reload();await page.waitForFunction(()=>!document.querySelector('#userInput').disabled);
  const row=page.locator('#chatList .chat-item[data-chat-id="'+chatId+'"]');await row.waitFor();
  check(await page.locator('#archiveChatsBtn').isVisible(),'archive navigation missing');
  await row.hover();await row.locator('.archive-icon').click();
  await row.waitFor({state:'detached'});await serverArchived(true);
  await page.locator('#archiveChatsBtn').click();
  const archivedRow=page.locator('#chatList .chat-item[data-chat-id="'+chatId+'"]');await archivedRow.waitFor();
  check((await archivedRow.locator('.archive-icon').getAttribute('title')).toLowerCase().includes('restore'),'archive action does not offer restore');
  await page.reload();await page.waitForFunction(()=>!document.querySelector('#userInput').disabled);
  await page.locator('#archiveChatsBtn').click();
  const persisted=page.locator('#chatList .chat-item[data-chat-id="'+chatId+'"]');await persisted.waitFor();
  await persisted.hover();await persisted.locator('.archive-icon').click();await serverArchived(false);
  await page.locator('#archiveChatsBtn').click();
  await page.locator('#chatList .chat-item[data-chat-id="'+chatId+'"]').waitFor();
  check(await page.locator('#chatList .chat-item[data-chat-id="'+chatId+'"]').isVisible(),'restored chat is not back in active history');
  check(await page.locator('#chatList .chat-item[data-chat-id="'+chatId+'"]').count()===1,'chat duplicated during archive/restore');
  const activeId='archive-active-chat';
  const activeSeed=await page.evaluate(async id=>{const r=await fetch('/api/chats/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Active archive test',messages:[],pinned:false,projectId:null})});return r.ok},activeId);
  check(activeSeed,'could not seed active-chat test');await page.reload();await page.waitForFunction(()=>!document.querySelector('#userInput').disabled);
  const activeRow=page.locator('#chatList .chat-item[data-chat-id="'+activeId+'"]');await activeRow.waitFor();await activeRow.locator('.chat-title').click();
  check((await page.locator('#topbarTitle').textContent()).includes('Active archive test'),'could not open active chat');
  await activeRow.hover();await activeRow.locator('.archive-icon').click();await activeRow.waitFor({state:'detached'});await serverArchived(true);
  check((await page.locator('#topbarTitle').textContent()).includes('Archive test conversation'),'archiving the active chat did not switch to a live chat');
  await page.reload();await page.waitForFunction(()=>!document.querySelector('#userInput').disabled);
  check((await page.locator('#topbarTitle').textContent()).includes('Archive test conversation'),'reload restored an archived chat as active');
  const lastLive=page.locator('#chatList .chat-item[data-chat-id="'+chatId+'"]');await lastLive.waitFor();await lastLive.locator('.chat-title').click();await lastLive.hover();await lastLive.locator('.archive-icon').click();await lastLive.waitFor({state:'detached'});await serverArchived(true);
  check(!(await page.locator('#topbarTitle').textContent()).includes('Archive test conversation'),'archiving the last live chat left an archived conversation active');
  const activeAfterAllArchived=await page.evaluate(()=>localStorage.getItem('pongy_activeId:archive@example.test'));
  check(activeAfterAllArchived!==chatId&&activeAfterAllArchived!==activeId,'last archive did not create a fresh active chat');
  await page.reload();await page.waitForFunction(()=>!document.querySelector('#userInput').disabled);
  check(!(await page.locator('#topbarTitle').textContent()).includes('Archive test conversation'),'all-archived reload selected an archived chat');
  console.log('Archive/restore/persistence/active-chat UI assertions passed:',count);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));runtime.close();fs.rmSync(dir,{recursive:true,force:true})}
})().catch(error=>{console.error(error);process.exitCode=1});
