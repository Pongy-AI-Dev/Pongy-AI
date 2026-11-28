import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const app=read('public/app.js'),css=read('public/app.css'),html=read('public/index.html');

test('mobile eye button opens and closes the sidebar and synchronizes overlay, icon and inert state',()=>{
 assert.match(app,/if\(mobile\)\{var opening=!\$\('sidebar'\)\.classList\.contains\('open'\)/);
 assert.match(app,/classList\.toggle\('open',opening\)/);
 assert.match(app,/classList\.toggle\('show',opening\)/);
 assert.match(app,/isHidden=mobile\?!\$\('sidebar'\)\.classList\.contains\('open'\)/);
 assert.match(app,/sidebar\.inert=!sessionValidated\|\|\(mobile&&!open\)/);
});
test('brand logo ignores repeat clicks while its animation is active',()=>{
 assert.match(html,/id="logoTop"/);
 assert.match(app,/\$\('logoTop'\)\.onclick=animateBrand/);
 assert.match(app,/if\(brandBusy\)return;/);assert.doesNotMatch(app,/if\(brandBusy\)stopBrandAnimation\(\)/);
 assert.match(app,/brand-logo-fallback/);
 assert.match(css,/@keyframes brand-logo-fallback/);
});
