'use strict';
const {launchBrowser}=require('./browser.cjs');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
(async()=>{
 const {createApp}=await import('../server.js'),{loadConfig}=await import('../lib/config.js'),bcrypt=(await import('bcryptjs')).default;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pongy-library-ui-'));
 const runtime=createApp({config:loadConfig({DATA_DIR:dir,JWT_SECRET:'library-ui-jwt-'.repeat(4),SESSION_SECRET:'library-ui-session-'.repeat(4)},dir)});
 runtime.db.prepare('INSERT INTO users(email,password,email_verified) VALUES(?,?,1)').run('library@example.test',bcrypt.hashSync('fixture-password',4));
 const now=Date.now(),files=[
  {id:'library-alpha',name:'Algebra notes.txt',mime:'text/plain',bytes:1200,text:'quadratic equations and roots',base64:Buffer.from('quadratic equations and roots').toString('base64'),analysisKind:'text',analysisComplete:true,editable:true,updated_at:now-3000},
  {id:'library-beta',name:'Beta design.pdf',mime:'application/pdf',bytes:5000,text:'wireframe and design system',base64:Buffer.from('fixture pdf').toString('base64'),analysisKind:'document',analysisComplete:true,editable:false,updated_at:now-2000},
  {id:'library-gamma',name:'Gamma science.txt',mime:'text/plain',bytes:900,text:'science experiment notes',base64:Buffer.from('science experiment notes').toString('base64'),analysisKind:'text',analysisComplete:true,editable:true,updated_at:now-1000},
  {id:'old-unused',name:'Old unused notes.txt',mime:'text/plain',bytes:128,text:'old unused',base64:Buffer.from('old unused').toString('base64'),analysisKind:'text',analysisComplete:true,editable:true,updated_at:now-120*86400000}
 ];
 for(const f of files)runtime.db.prepare('INSERT INTO files VALUES(?,?,?)').run(f.id,1,JSON.stringify(f));
 const server=await new Promise(resolve=>{const s=runtime.app.listen(0,'127.0.0.1',()=>resolve(s))});
 const base='http://127.0.0.1:'+server.address().port,browser=await launchBrowser(),context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();let count=0;
 const check=(v,m)=>{if(!v)throw Error(m);count++};
 async function login(){await page.locator('#authScreen.show').waitFor();await page.locator('#authEmail').fill('library@example.test');await page.locator('#authPassword').fill('fixture-password');await page.locator('#authBtn').click();await page.waitForFunction(()=>!document.querySelector('#userInput').disabled)}
 try{
  await page.goto(base);await login();
  for(const [fileId,name,description,folder,tags] of [
   ['library-alpha','Algebra reference','Quadratic equations','Research',['math','algebra']],
   ['library-beta','Beta design','Wireframe','Design',['ui','prototype']],
   ['library-gamma','Gamma science','Experiment notes','Research',['science','lab']]
  ]){const r=await page.evaluate(async data=>{const response=await fetch('/api/library',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});return response.ok},{fileId,name,description,folder,tags});check(r,'library item seed failed: '+name)}
  await page.locator('#sectionLibrary').click();await page.locator('#workspaceModal.open').waitFor();await page.locator('#workspaceLibrarySearch').waitFor();
  check(await page.locator('.workspace-card').count()===3,'all library records should render');
  await page.locator('#workspaceLibrarySearch').fill('quadratic');
  check(await page.locator('.workspace-card').count()===1,'search should match descriptions and file context');
  check((await page.locator('.workspace-card').innerText()).includes('Algebra reference'),'search returned wrong record');
  await page.locator('#workspaceLibrarySearch').fill('');
  await page.locator('#workspaceLibraryFolder').selectOption('Research');
  check(await page.locator('.workspace-card').count()===2,'category filter should show only Research');
  await page.locator('#workspaceLibraryFolder').selectOption('all');
  await page.locator('#workspaceLibrarySort').selectOption('name');
  const sorted=await page.locator('.workspace-card strong').allTextContents();
  check(sorted.join('|')==='Algebra reference|Beta design|Gamma science','alphabetical sorting order is incorrect');
  await page.locator('#workspaceLibrarySort').selectOption('size');
  const sizeSorted=await page.locator('.workspace-card strong').allTextContents();
  check(sizeSorted[0]==='Beta design','file-size sorting order is incorrect');
  const beta=page.locator('.workspace-card').filter({hasText:'Beta design'});
  await beta.locator('button').filter({hasText:'Edit'}).click();
  const form=page.locator('#workspaceContent .workspace-create');
  await form.locator('input').nth(0).fill('Beta design updated');
  await form.locator('textarea').fill('Updated description');
  await form.locator('input').nth(1).fill('Archive');
  await form.locator('input').nth(2).fill('updated, reviewed');
  await form.locator('button[type=submit]').click();
  await page.waitForFunction(async()=>{const r=await fetch('/api/library');const d=await r.json();return d.items.some(x=>x.name==='Beta design updated'&&x.folder==='Archive'&&x.tags.includes('reviewed'))});
  const updatedCard=page.locator('.workspace-card').filter({hasText:'Beta design updated'});
  await updatedCard.waitFor();
  check(await updatedCard.count()===1,'edited library item not rendered');
  await updatedCard.locator('button').filter({hasText:'Remove from Library'}).click();
  await updatedCard.waitFor({state:'detached'});
  const remaining=await page.evaluate(async()=>{const r=await fetch('/api/library');const d=await r.json();return d.items.length});
  check(remaining===2,'remove from Library failed');
  const original=await page.evaluate(async()=>{const r=await fetch('/api/files/library-beta');return r.status});
  check(original===200,'removing a library entry must preserve the original uploaded file');
  check(await page.locator('.workspace-card').count()===2,'removed item still shown in Library');
  await page.setViewportSize({width:390,height:844});
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Library controls overflow on mobile');
  await page.setViewportSize({width:1280,height:900});
  await page.locator('#workspaceCleanupReview').click();
  const candidate=page.locator('.workspace-cleanup-item').filter({hasText:'Old unused notes.txt'});
  await candidate.waitFor();
  check(await page.locator('.workspace-cleanup-item').count()===1,'cleanup review should show only the old unreferenced upload');
  page.once('dialog',dialog=>dialog.accept());
  await candidate.locator('button').filter({hasText:'Move to Trash'}).click();
  await candidate.waitFor({state:'detached'});
  const hidden=await page.evaluate(async()=>{const r=await fetch('/api/files');const d=await r.json();return !d.files.some(f=>f.id==='old-unused')});
  check(hidden,'trashed file should leave the active file list');
  await page.locator('#workspaceCleanupTrash').click();
  const trashed=page.locator('.workspace-cleanup-item').filter({hasText:'Old unused notes.txt'});
  await trashed.waitFor();
  await trashed.locator('button').filter({hasText:'Restore'}).click();
  await trashed.waitFor({state:'detached'});
  const restored=await page.evaluate(async()=>{const r=await fetch('/api/files');const d=await r.json();return d.files.some(f=>f.id==='old-unused')});
  check(restored,'restored file should return to active uploads');
  console.log('Library search/category/sort/edit/safe-remove/cleanup UI assertions passed:',count);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));runtime.close();fs.rmSync(dir,{recursive:true,force:true})}
})().catch(error=>{console.error(error);process.exitCode=1});
