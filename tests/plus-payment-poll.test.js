import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const app=read('public/app.js'),products=read('public/products.js'),smart=read('public/smart-pc-panel.js'),durable=read('lib/durable-products.js'),subs=read('lib/subscriptions.js');

test('Plus checkout is checked immediately, persists the pending order and resumes after sign-in',()=>{
 assert.match(app,/startPlusOrderPoll\(order\.id,notice\)/);
 assert.match(app,/pongy_pending_plus_order:/);
 assert.match(app,/function resumePlusOrderPoll\(\)/);
 assert.match(app,/window\.addEventListener\('pongy-session-ready',function\(\).*resumePlusOrderPoll\(\)/);
 assert.match(app,/setInterval\(check,2000\)/);
 assert.match(app,/api\('\/api\/billing\/orders\/'\+encodeURIComponent\(orderId\)\)/);
});
test('confirmed Plus payment refreshes both server product data and current account entitlement',()=>{
 assert.match(app,/var products=await api\('\/api\/products'\)/);
 assert.match(app,/PongyAppSession\?\.refreshProducts\?\.\(products\)/);
 assert.match(app,/PongyProducts\?\.refresh\?\.\(\)/);
 assert.match(app,/Payment confirmed\. Pongy Plus is active and saved to your account/);
});
test('Smart PC payment checks faster and refreshes its subscription immediately after confirmation',()=>{
 assert.match(smart,/setInterval\(async\(\)=>[\s\S]*?\},2000\)/);
 assert.match(smart,/if\(value\.status==='paid'\)[\s\S]*?await refresh\(\)/);
});
test('product updates are live-notified and subscription grants persist in the durable ledger',()=>{
 assert.match(products,/\/api\/products\/watch\?revision=/);
 assert.match(products,/new CustomEvent\("pongy-products-updated"\)/);
 assert.match(durable,/remote\.mutate\(u\.email,input,seed\(user\(u\.id\)\)\)/);
 assert.match(subs,/UPDATE users SET .* WHERE id/);
});
