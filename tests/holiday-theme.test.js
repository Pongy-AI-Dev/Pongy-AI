import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(p)=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const app=read('public/app.js'),css=read('public/app.css'),refresh=read('public/chat-refresh.css'),html=read('public/index.html'),snow=read('public/holiday-effects.js');
test('holiday theme has dedicated snow controls with persisted on/off and intensity',()=>{
  assert.match(app,/holidayEffectsControls/);assert.match(app,/settings\.holidaySnow!==false/);assert.match(app,/settings\.holidaySnowIntensity/);assert.match(app,/range\.type='range'/);assert.match(app,/PongyHolidayEffects\?\.configure/);
});
test('holiday theme renders confectionery, gift, candy-cane and stocking details',()=>{
  assert.match(css,/welcome-inner::before/);assert.match(css,/newChatBtn::after/);assert.match(css,/chat-model-bar::before/);assert.match(css,/sb-bottom::after/);assert.match(css,/chat-item\.active::before/);
});
test('snow layer simulates falling, button collisions, cursor drift and scatter',()=>{
  assert.match(snow,/requestAnimationFrame\(frame\)/);assert.match(snow,/refreshTargets/);assert.match(snow,/accum\.set/);assert.match(snow,/pointermove/);assert.match(snow,/function scatter/);assert.match(snow,/pointerdown/);
});
test('guest users can dismiss generated suggestions without applying them',()=>{
  assert.match(app,/proposal\.dismissed\|\|!siteActionLabel/);assert.match(app,/proposal\.dismissed=true;var chat=chats\.find/);assert.match(app,/site-proposal-dismiss/);assert.match(css,/body\.guest-mode :is\(\.pongy-dismiss,\.site-proposal-dismiss\)/);
});
test('composer seams, sidebar overflow, model text and API checkboxes are aligned',()=>{
  assert.match(css,/#inputArea:has\(#slowdownNotice/);assert.match(css,/#sidebarSections,.sb-sections\{flex:1 1 auto/);assert.match(css,/#chatModelName:hover,#chatModelName\[aria-expanded=true\]\{background:transparent/);assert.match(css,/#settingsModal \.settings-section input\[type=checkbox\]:not\(\.display-switch\)/);
});
test('holiday assets are loaded before the app and use refreshed cache keys',()=>{
  assert.ok(html.indexOf('holiday-effects.js')<html.indexOf('/app.js?'));assert.match(html,/app\.css\?v=0\.30\.5-holiday1/);assert.match(html,/app\.js\?v=0\.30\.5-holiday1/);
});
test('all brand placements use the same original mark without a square tile',()=>{
  assert.match(css,/mask:url\('\/app-logo-192\.png'\)/);assert.match(refresh,/#logoTop\{width:32px!important;height:32px!important/);assert.match(refresh,/#authLogo img,.big-logo \.welcome-icon\{opacity:1!important/);assert.match(refresh,/box-shadow:none!important/);
});
