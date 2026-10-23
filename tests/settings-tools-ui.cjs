'use strict';

const {launchBrowser}=require('./browser.cjs');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');

(async()=>{
  const {createApp}=await import('../server.js');
  const {loadConfig}=await import('../lib/config.js');
  const bcrypt=(await import('bcryptjs')).default;
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pongy-tools-settings-'));
  const runtime=createApp({
    config:loadConfig({
      DATA_DIR:dir,
      JWT_SECRET:'settings-test-jwt-'.repeat(4),
      SESSION_SECRET:'settings-test-session-'.repeat(4)
    },dir),
    fetchImpl:async()=>Response.json({data:[{id:'gpt-fixture',owned_by:'Fixture AI Lab'}]})
  });
  runtime.db.prepare('INSERT INTO users(email,password,email_verified) VALUES(?,?,1)')
    .run('sergiv1609@gmail.com',bcrypt.hashSync('fixture-password',4));
  const server=await new Promise(resolve=>{
    const s=runtime.app.listen(0,'127.0.0.1',()=>resolve(s));
  });
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await launchBrowser();
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  let count=0;
  const check=(value,message)=>{
    if(!value)throw Error(message);
    count++;
  };
  async function openSettings(){
    if(await page.evaluate(()=>PongyDisplay.mobile()&&!document.querySelector('#sidebar').classList.contains('open')))
      await page.locator('#menuBtn').click();
    await page.locator('#settingsBtn').click();
    await page.locator('#settingsModal.open').waitFor();
  }

  try{
    await page.goto(base);
    await page.locator('#authEmail').fill('sergiv1609@gmail.com');
    await page.locator('#authPassword').fill('fixture-password');
    await page.locator('#authBtn').click();
    await page.waitForFunction(()=>!document.querySelector('#userInput').disabled);
    await openSettings();
    check(await page.locator('.settings-tabs [role=tab]').count()===8,'tabs missing');
    await page.locator('#settings-tab-usage').click();
    await page.waitForFunction(()=>document.querySelector('#usagePercent').textContent==='100%');
    check(await page.locator('#usageProgress').evaluate(e=>e.value)===100,'remaining shared allowance percentage wrong');
    check(!(await page.locator('#settings-panel-usage').innerText()).includes('150'),'internal per-chat limit shown to user');

    await page.locator('#settings-tab-tools').click();
    await page.locator('#mcpTokenStatus').waitFor();
    await page.locator('#mcpCreateToken').click();
    await page.waitForFunction(()=>document.querySelector('#mcpTokenStatus').textContent.includes('Токен создан'));
    const mcpConfig=JSON.parse(await page.locator('#mcpConfig').textContent());
    check(mcpConfig.mcpServers.pongy.url.endsWith('/mcp')&&mcpConfig.mcpServers.pongy.headers.Authorization.startsWith('Bearer pongy_'),'MCP configuration was not generated');
    await page.locator('#mcpRevokeToken').click();
    await page.waitForFunction(()=>document.querySelector('#mcpTokenStatus').textContent==='Токен отозван.');
    await page.locator('#personalApiProvider option[value=openai]').waitFor();
    check(await page.locator('#personalApiProvider option').count()>=15,'provider catalog not populated');
    await page.locator('#personalApiProvider').selectOption('openai');
    await page.locator('#personalApiKey').fill('fixture-key-private-long-enough');
    await page.locator('#personalApiLoadModels').click();
    await page.waitForFunction(()=>document.querySelector('#personalApiModel option[value="gpt-fixture"]'));
    check((await page.locator('#personalApiModelOwner').textContent()).includes('Fixture AI Lab'),'provider-reported model developer missing');
    await page.locator('#personalApiConsent').check();
    await page.locator('#personalApiSave').click();
    await page.waitForFunction(()=>document.documentElement.dataset.userApi==='true');
    check(await page.locator('#personalApiKey').inputValue()==='','secret retained in input');
    await page.locator('#settings-tab-usage').click();
    check((await page.locator('#usageHint').textContent()).includes('third-party API'),'own quota warning not shown');
    check(await page.locator('#settings-panel-usage').getAttribute('data-state')==='own','own quota state wrong');
    check(await page.locator('#usageProgress').getAttribute('aria-disabled')==='true','own quota bar is not marked inactive');

    await page.locator('#closeSettings').click();
    check(await page.locator('#agentBtn').isDisabled()&&await page.locator('#smartBtn').isDisabled(),'model/thinking controls not locked');
    check(await page.locator('#pinChatBtn').isVisible(),'topbar pin absent');
    await page.locator('#pinChatBtn').click();
    check(await page.locator('#pinChatBtn').getAttribute('aria-pressed')==='true','topbar pin did not persist');
    await openSettings();
    await page.locator('#settings-tab-tools').click();
    await page.locator('#personalApiRemove').click();
    await page.waitForFunction(()=>document.documentElement.dataset.userApi==='false');
    await page.locator('#settings-tab-interface').click();
    await page.locator('#betaFunctions').check();
    await page.waitForFunction(async()=>!!(await(await fetch('/api/preferences')).json()).betaFunctions);
    check(await page.locator('#settings-tab-beta').isVisible(),'beta section did not appear when beta mode was enabled');
    check((await page.locator('#settings-panel-beta').innerText()).trim()==='Здесь появятся новые функции для тестирования','beta section placeholder text is incorrect');
    check(await page.locator('#settings-tab-beta').getAttribute('aria-selected')==='true','beta section did not open after enabling beta mode');

    await page.locator('#settings-tab-developer').click();
    await page.locator('#settings-panel-developer button').filter({hasText:'Standard test'}).click();
    await page.waitForFunction(()=>document.querySelector('#settingsModal').dataset.scanning!=='true');
    await page.locator('#adminReports details').first().waitFor();
    check((await page.locator('#adminScanCount').textContent()).includes('/ 7'),'real diagnostic progress absent');
    await page.locator('#adminReports summary').first().click();
    check((await page.locator('#adminReports code').first().textContent()).includes('Database integrity'),'real diagnostic logs absent');
    await page.locator('#adminBlockEmail').fill('blocked@example.test');
    await page.locator('#settings-panel-developer button').filter({hasText:/^Block$/}).click();
    await page.locator('#adminBlacklist').waitFor({state:'attached'});
    await page.waitForFunction(()=>document.querySelector('#adminBlacklist').textContent.includes('blocked@example.test'));
    await page.locator('#adminBlacklist').evaluate(n=>n.closest('details').open=true);
    await page.locator('#adminBlacklist button').click();
    await page.waitForFunction(()=>document.querySelector('#adminBlacklist').textContent==='');
    check(true,'blacklist editing failed');

    await page.locator('#settings-tab-interface').click();
    await page.locator('#langGrid button').filter({hasText:'Русский'}).click();
    await page.waitForFunction(()=>document.querySelector('#settings-tab-tools').textContent==='API и MCP');
    check(true,'settings tabs did not translate');
    for(const width of [320,390,768]){
      await page.setViewportSize({width,height:640});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      check(await page.locator('#settingsModal .modal-box').evaluate(n=>{
        const r=n.getBoundingClientRect();
        return r.left>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&n.scrollWidth<=n.clientWidth+1;
      }),'settings overflow '+width);
    }
    await page.locator('#closeSettings').click();
    await page.reload();
    await page.waitForFunction(()=>!document.querySelector('#userInput').disabled);
    await openSettings();
    check(await page.locator('#betaFunctions').isChecked(),'beta setting lost on reload');
    check(errors.length===0,'browser errors: '+errors.join(';'));
    console.log('Tabbed settings/BYOK/admin/mobile UI assertions passed:',count);
  }finally{
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
    runtime.close();
    fs.rmSync(dir,{recursive:true,force:true});
  }
})().catch(error=>{
  console.error(error);
  process.exitCode=1;
});
