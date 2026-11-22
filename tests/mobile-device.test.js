import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../public/mobile-device.js',import.meta.url),'utf8');
function fixture({permission='granted',confirmations=[true]}={}){
 const actions=[],confirms=[];
 const android={contactPermission:()=>permission,requestContacts:()=>actions.push('requestContacts'),findContacts:query=>actions.push(['findContacts',query]),findContactsV2:query=>actions.push(['findContactsV2',query]),findApps:query=>actions.push(['findApps',query])};
 const context={window:{PongyNative:{platform:'android'},PongyAndroid:android},document:{documentElement:{lang:'ru'}},JSON,Number,Array,Set,Map,String,RegExp,confirm:text=>{confirms.push(text);return confirmations.shift()??false;}};
 vm.runInNewContext(source,context);return {handle:context.window.PongyMobileDevice.handle,actions,confirms,android};
}
test('contact access explains local processing before requesting permission, and denial reads nothing',()=>{const f=fixture({permission:'denied',confirmations:[false]});f.handle('Позвони Саше');assert.match(f.confirms[0],/не отправляется ИИ или на сервер/);assert.deepEqual(f.actions,[]);const g=fixture({permission:'denied'});g.handle('Позвони Саше');assert.deepEqual(g.actions,['requestContacts']);});
test('ambiguous nickname and surname remain local search criteria instead of choosing one person',()=>{const f=fixture();f.handle('Позвони Саше Иванову');const [method,payload]=f.actions.at(-1);assert.equal(method,'findContactsV2');assert.deepEqual(JSON.parse(payload),{first:['саше','александр','александра'],remaining:['иванову']});assert(!f.actions.some(a=>Array.isArray(a)&&a[0]==='openDialer'));});
test('older Android bridge still receives its supported plain contact query',()=>{const f=fixture();delete f.android.findContactsV2;f.handle('Позвони Саше');assert.deepEqual(Array.from(f.actions.at(-1)),['findContacts','александр']);});
test('app query uses native chooser rather than exposing installed apps to JavaScript',()=>{const f=fixture();f.handle('Открой приложение Discord');assert.deepEqual(Array.from(f.actions.at(-1)),['findApps','discord']);assert(!f.actions.some(a=>Array.isArray(a)&&a[0]==='launchApp'));});
test('unrelated text and ordinary browser never perform native actions',()=>{const f=fixture();assert.equal(f.handle('Расскажи о контактах'),null);assert.deepEqual(f.actions,[]);const context={window:{},document:{documentElement:{lang:'ru'}},JSON,Number,Array,Set,Map,String,RegExp};vm.runInNewContext(source,context);assert.equal(context.window.PongyMobileDevice.handle('Позвони маме'),null);});
