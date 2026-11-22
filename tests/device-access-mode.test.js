import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('public/index.html'),app=read('public/app.js'),smart=read('public/smart-pc-panel.js'),native=read('native/windows/launcher.cpp'),site=read('lib/site-context.js');

test('desktop-only composer access control is placed next to attachments and exposes exactly three modes',()=>{
 const plus=html.indexOf('id="attachBtn"'),mode=html.indexOf('id="deviceAccessModeBtn"'),menu=html.indexOf('id="deviceAccessModeMenu"');
 assert.ok(plus>=0&&mode>plus&&menu>mode);
 assert.match(html,/data-access-mode="ask"/);
 assert.match(html,/data-access-mode="allow"/);
 assert.match(html,/data-access-mode="full"/);
 assert.match(app,/window\.PongyNative\?\.platform==='windows'/);
 assert.match(app,/pongy_device_access_mode:/);
});
test('access mode changes native action behavior and is sent as context',()=>{
 assert.match(app,/deviceAccessMode:deviceAccessMode/);
 assert.match(app,/deviceAccessMode==='full'\|\|deviceAccessMode==='allow'&&value\.app!=='explorer'/);
 assert.match(app,/showConfirm\(authText\('Действие Windows'/);
});
test('Smart PC asks for consent on each actual native action in ask mode, not for ordinary AI chat',()=>{
 const send=smart.slice(smart.indexOf('async function send('),smart.indexOf('function listen('));
 assert.ok(send.indexOf("api('/api/smart-pc/command'")<send.indexOf("bridgeWait('smart-consent'"));
 assert.match(send,/if\(mode==='ask'\|\|!consent\)/);
 assert.match(send,/if\(accessMode\(\)==='ask'\)consent=false/);
});
test('Smart PC shares the live model and reasoning choice and falls back when Plus expires',()=>{
 assert.ok(smart.includes('function modelContext()'));
 assert.ok(smart.includes("localStorage.getItem('pongy_settings_ui')"));
 assert.ok(smart.includes("if(selectedModel==='extra')selectedModel='standard'"));
 assert.ok(smart.includes("if(reasoningLevel==='extra')reasoningLevel='high'"));
 assert.ok(smart.includes('siteContext:{nativeApp:true,...modelContext()}'));
});

test('Smart PC receives immediate account product changes across windows and coalesces refreshes',()=>{
 assert.ok(app.includes("localStorage.setItem('pongy_products_revision'"));
 assert.ok(smart.includes("addEventListener('storage',e=>{if(e.key==='pongy_products_revision')void refresh();})"));
 assert.ok(smart.includes('if(refreshing){refreshAgain=true;return;}'));
 assert.ok(smart.includes('if(refreshAgain){refreshAgain=false;void refresh();}'));
});

test('native permission prompt distinguishes ask, allow and full while keeping the built-in action boundary',()=>{
 assert.match(native,/message\.rfind\(consentPrefix,0\)==0/);
 assert.match(native,/mode==L":ask"/);
 assert.match(native,/mode==L":full"/);
 assert.match(native,/unrestricted disk access/);
 assert.match(site,/wholeDeviceAccess:false,commandsAllowed:false/);
 assert.match(site,/arbitrary shell commands/);
});
