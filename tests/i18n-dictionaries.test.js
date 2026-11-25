import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
function evaluate(source){const context={};vm.runInNewContext(source,context,{timeout:1000});return context;}
function dictionaries(){
 const baseStart=source.indexOf('var T={'),baseEnd=source.indexOf('\nvar LANGS=',baseStart);
 assert.ok(baseStart>=0&&baseEnd>baseStart,'base dictionaries must exist');
 const base=evaluate(source.slice(baseStart,baseEnd).replace(/^var T=/,'T=')).T;
 const packStart=source.indexOf('Object.assign(T,'),extraStart=source.indexOf('\nvar EXTRA_TRANSLATIONS=',packStart);
 assert.ok(packStart>=0&&extraStart>packStart,'initial locale packs must exist');
 const packs=evaluate(source.slice(packStart,extraStart).replace(/^Object.assign\(T,/,'T=').replace(/\);\s*$/,'')).T;
 Object.assign(base,packs);
 const extraEnd=source.indexOf('\nObject.keys(EXTRA_TRANSLATIONS)',extraStart);
 assert.ok(extraStart>=0&&extraEnd>extraStart,'complete locale packs must exist');
 const extra=evaluate(source.slice(extraStart,extraEnd)+';T=EXTRA_TRANSLATIONS;').T;
 for(const [code,values] of Object.entries(extra))Object.assign(base[code],values);
 return base;
}

test('all six interface dictionaries contain every base key and a localized greeting',()=>{
 const all=dictionaries(),base=all.en;
 assert.deepEqual(Object.keys(all).sort(),['de','en','es','fr','nl','ru']);
 for(const code of ['es','de','fr','nl']){
  assert.deepEqual(Object.keys(all[code]).sort(),Object.keys(base).sort(),code+' dictionary must cover every interface string');
  assert.equal(typeof all[code].greetN,'function');
  assert.ok(all[code].greetN('Alex').includes('Alex'));
  for(const key of ['siteDescription','siteTitle','language','theme','signOut','attach','send','stop','voice','guideIntro','guide1','guide2','guide3','guide4','searchPh'])assert.ok(typeof all[code][key]==='string'&&all[code][key].trim(),code+' is missing '+key);
 }
});

const serverSource=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');

test('public config distinguishes translated UI locales from speech recognition locales',()=>{
 const uiBlock=source.match(/var LANGS=\[([\s\S]*?)\];/);
 const speechBlock=source.match(/var SPEECH_LANGS=\{([^}]+)\}/);
 const apiUi=serverSource.match(/interfaceLanguages:\[([^\]]*)\]/);
 const apiSpeech=serverSource.match(/speechLanguages:\[([^\]]*)\]/);
 assert.ok(uiBlock&&speechBlock&&apiUi&&apiSpeech,'UI and speech locale declarations must exist');
 const ui=[...uiBlock[1].matchAll(/code:'([^']+)'/g)].map(x=>x[1]);
 const speech=[...speechBlock[1].matchAll(/(?:^|,)\s*(?:'([^']+)'|([A-Za-z][\w-]*)):/g)].map(x=>x[1]||x[2]);
 const configUi=[...apiUi[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
 const configSpeech=[...apiSpeech[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
 assert.deepEqual(ui,['en','ru','es','de','fr','nl']);
 assert.deepEqual(configUi,ui,'API must advertise only fully translated UI locales');
 assert.deepEqual([...configSpeech].sort(),[...speech].sort(),'API speech locales must match browser speech locales');
 assert.equal(new Set(configSpeech).size,configSpeech.length,'speech locale list must not contain duplicates');
 assert.equal(configSpeech.length,38,'all 38 configured speech locales must remain available');
});
