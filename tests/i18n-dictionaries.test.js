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
