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
    check(await page.locator('.settings-tabs [role=tab]').count()===11,'tabs missing');
    await page.locator('#settings-tab-usage').click();
    await page.waitForFunction(()=>document.querySelector('#usagePercent').textContent==='0%');
    check(await page.locator('#usageProgress').evaluate(e=>e.value)===0,'usage bar does not start empty');
    check(!(await page.locator('#settings-panel-usage').innerText()).includes('150'),'internal per-chat limit shown to user');

    await page.locator('#settings-tab-tools').click();
    await page.waitForFunction(()=>!!document.querySelector('#apiKeyStatus').textContent.trim());
    const apiKeyInitialStatus=await page.locator('#apiKeyStatus').textContent();
    const apiKeyCreateResponse=page.waitForResponse(response=>response.url().endsWith('/api/api-key')&&response.request().method()==='POST');
    await page.locator('#apiKeyCreate').click();
    const apiKeyResponse=await apiKeyCreateResponse;
    check(apiKeyResponse.ok(),'personal API Key creation failed with HTTP '+apiKeyResponse.status());
    await page.waitForFunction(previous=>document.querySelector('#apiKeyStatus').textContent!==previous,apiKeyInitialStatus);
    check(/Ключ создан|Key created/.test(await page.locator('#apiKeyStatus').textContent()),'personal API Key creation returned: '+await page.locator('#apiKeyStatus').textContent());
    check((await page.locator('#apiKeyValue').textContent()).startsWith('pongy_api_'),'personal API Key was not shown');
    check((await page.locator('#apiKeyEndpoint').textContent()).endsWith('/v1/chat/completions'),'OpenAI-compatible API endpoint was not shown');
    await page.locator('#apiKeyRevoke').click();
    await page.waitForFunction(()=>/API Key отозван\.|API Key revoked\./.test(document.querySelector('#apiKeyStatus').textContent));
    await page.locator('#mcpTokenStatus').waitFor();
    await page.locator('#mcpCreateToken').click();
    await page.waitForFunction(()=>/Токен создан|Token created/.test(document.querySelector('#mcpTokenStatus').textContent));
    const mcpConfig=JSON.parse(await page.locator('#mcpConfig').textContent());
    check(mcpConfig.mcpServers.pongy.url.endsWith('/mcp')&&mcpConfig.mcpServers.pongy.headers.Authorization.startsWith('Bearer pongy_'),'MCP configuration was not generated');
    await page.locator('#mcpRevokeToken').click();
    await page.waitForFunction(()=>/Токен отозван\.|Token revoked\./.test(document.querySelector('#mcpTokenStatus').textContent));
    await page.waitForFunction(()=>document.querySelector('#personalApiProvider option[value="openai"]'));
    check(await page.locator('#personalApiProvider option').count()>=15,'provider catalog not populated');
    await page.locator('#personalApiProvider').selectOption('openai');
    await page.locator('#personalApiKey').fill('fixture-key-private-long-enough');
    const modelsResponse=page.waitForResponse(response=>response.url().endsWith('/api/user-api/models')&&response.request().method()==='POST');
    await page.locator('#personalApiLoadModels').click();
    const loadedModels=await modelsResponse;
    check(loadedModels.ok(),'loading provider models failed with HTTP '+loadedModels.status()+': '+await loadedModels.text());
    const modelData=await loadedModels.json();
    check(modelData.models?.some(item=>item.id==='gpt-fixture'),'fixture provider model missing from response: '+JSON.stringify(modelData));
    await page.waitForFunction(()=>!['Requesting the provider model list…','Запрашиваем список моделей у провайдера…'].includes(document.querySelector('#personalApiStatus').textContent));
    const modelState=await page.evaluate(()=>{const select=document.querySelector('#personalApiModel');return {present:!!select,options:[...select?.options||[]].map(option=>option.value),status:document.querySelector('#personalApiStatus')?.textContent};});
    check(modelState.options.includes('gpt-fixture'),'loaded model was not added to the selector: '+JSON.stringify(modelState));
    check((await page.locator('#personalApiModelOwner').textContent()).includes('Fixture AI Lab'),'provider-reported model developer missing');
    await page.locator('#personalApiConsent').check();
    await page.locator('#personalApiSave').click();
    await page.waitForFunction(()=>document.documentElement.dataset.userApi==='true');
    check(await page.locator('#personalApiKey').inputValue()==='fixture-key-private-long-enough','connect flow cleared the API key field');
    check(await page.locator('#personalApiKey').getAttribute('type')==='password','API key is not masked by default');
    await page.locator('#personalApiToggle').click();
    check(await page.locator('#personalApiKey').getAttribute('type')==='text','eye control did not reveal the key');
    await page.waitForTimeout(3400);
    check(await page.locator('#personalApiKey').getAttribute('type')==='password','revealed key did not hide itself after three seconds');
    await page.locator('#settings-tab-usage').click();
    check(/personal API|личный API/i.test(await page.locator('#usageHint').textContent()),'own quota warning not shown');
    check(await page.locator('#settings-panel-usage').getAttribute('data-state')==='normal','own quota state wrong');
    check(await page.locator('#usageProgress').evaluate(e=>e.value)===0,'own quota bar is not empty');
    check(await page.locator('#usageProgress').getAttribute('aria-disabled')!=='true','own quota bar stayed disabled');

    await page.locator('#closeSettings').click();
    check(await page.locator('#agentBtn').isDisabled()&&await page.locator('#smartBtn').isDisabled(),'model/thinking controls not locked');
    check(await page.locator('#searchBtn').isDisabled(),'search control not locked with a personal API');
    check(await page.locator('#pinChatBtn').isVisible(),'topbar pin absent');
    await page.locator('#pinChatBtn').click();
    check(await page.locator('#pinChatBtn').getAttribute('aria-pressed')==='true','topbar pin did not persist');
    await page.reload();
    await page.waitForFunction(()=>!document.querySelector('#userInput').disabled);
    await page.waitForFunction(()=>document.documentElement.dataset.userApi==='true');
    check(await page.locator('#searchBtn').isDisabled(),'search control unlocked after reload');
    await openSettings();
    await page.locator('#settings-tab-tools').click();
    await page.waitForFunction(()=>document.querySelector('#personalApiKey').value.length>0);
    check(await page.locator('#personalApiKey').inputValue()==='fixture-key-private-long-enough','API key lost after reload');
    await page.locator('#settings-tab-usage').click();
    check(await page.locator('#usageProgress').getAttribute('aria-disabled')!=='true','usage bar lost its enabled state after reload');
    await page.locator('#settings-tab-tools').click();
    check(await page.locator('#personalApiConsent').isChecked(),'consent checkbox not retained after connecting');
    await page.locator('#closeSettings').click();
    if(await page.evaluate(()=>PongyDisplay.mobile()&&!document.querySelector('#sidebar').classList.contains('open')))await page.locator('#menuBtn').click();
    await page.locator('#newChatBtn').click();
    await page.waitForTimeout(600);
    await openSettings();
    await page.locator('#settings-tab-tools').click();
    check(await page.locator('#personalApiKey').inputValue()==='fixture-key-private-long-enough','API key lost after creating a chat');
    check(await page.locator('#personalApiConsent').isChecked(),'consent lost after creating a chat');
    await page.locator('#closeSettings').click();
    await openSettings();
    await page.locator('#settings-tab-tools').click();
    check(await page.locator('#personalApiKey').inputValue()==='fixture-key-private-long-enough','API key lost after closing settings');
    const savedStatus=await page.evaluate(async()=>await(await fetch('/api/user-api')).json());
    check(savedStatus.consent===true&&savedStatus.models.some(m=>m.id==='gpt-fixture'),'server lost safe API preferences');
    check(!JSON.stringify(savedStatus).includes('fixture-key-private-long-enough'),'server returned a secret API key');
    await page.evaluate(()=>{for(const k of Object.keys(localStorage))if(k.startsWith('pongy_api_'))localStorage.removeItem(k);});
    await page.reload();await page.waitForFunction(()=>!document.querySelector('#userInput').disabled);await openSettings();await page.locator('#settings-tab-tools').click();
    await page.waitForFunction(()=>document.querySelector('#personalApiModel').value==='gpt-fixture');
    check(await page.locator('#personalApiConsent').isChecked(),'server consent did not restore');
    check(await page.locator('#personalApiKey').inputValue()==='','server secret was copied to browser');
    check(/saved|сохранён/i.test(await page.locator('#personalApiKey').getAttribute('placeholder')),'missing saved-key status');
    await page.locator('#personalApiRemove').click();
    await page.waitForFunction(()=>document.documentElement.dataset.userApi==='false');
    await page.locator('#settings-tab-interface').click();
    await page.locator('#betaFunctions').check();
    await page.waitForFunction(async()=>!!(await(await fetch('/api/preferences')).json()).betaFunctions);
    check(await page.locator('#settings-tab-beta').isVisible(),'beta section did not appear when beta mode was enabled');
    check(['Здесь появятся новые функции для тестирования','New features for testing will appear here'].includes((await page.locator('#settings-panel-beta').innerText()).trim()),'beta section placeholder text is incorrect');
    check(await page.locator('#settings-tab-beta').getAttribute('aria-selected')==='true','beta section did not open after enabling beta mode');

    await page.locator('#settings-tab-developer').click();
    await page.locator('#adminCheckButton').click();
    await page.locator('#adminCheckDialog[open]').waitFor();
    await page.locator('#adminCheckDialog button').filter({hasText:'Standard test'}).click();
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
    await page.waitForFunction(()=>document.querySelectorAll('#adminBlacklist .admin-block-row').length===0&&!document.getElementById('adminBlockButton').disabled);
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
    await page.locator('#settings-tab-interface').click();
    await page.locator('#motionPreference').selectOption('reduced');
    await page.waitForFunction(async()=>{const p=await(await fetch('/api/preferences')).json();return p.motion==='reduced'});
    await page.locator('#closeSettings').click();
    await page.reload();
    await page.waitForFunction(()=>!document.querySelector('#userInput').disabled);
    await openSettings();
    check(await page.locator('#betaFunctions').isChecked(),'beta setting lost on reload');
    await page.locator('#settings-tab-interface').click();
    check(await page.locator('#motionPreference').inputValue()==='reduced','smooth animations preference lost on reload');
    check(await page.locator('html').getAttribute('data-motion')==='reduced','restored motion preference was not applied');
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
