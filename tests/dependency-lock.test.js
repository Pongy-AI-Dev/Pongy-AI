import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('application version changes do not replace the independent oauth package version',()=>{
 const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
 const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
 assert.equal(lock.version,pkg.version);
 assert.equal(lock.packages[''].version,pkg.version);
 const oauth=lock.packages['node_modules/oauth'];
 // This transitive dependency belongs to passport-oauth1, not to Pongy AI.
 // Update this reviewed tuple only when intentionally upgrading that dependency.
 assert.equal(oauth.version,'0.10.2');
 assert.equal(oauth.resolved,'https://registry.npmjs.org/oauth/-/oauth-0.10.2.tgz');
 assert.equal(oauth.integrity,'sha512-JtFnB+8nxDEXgNyniwz573xxbKSOu3R8D40xQKqcjwJ2CDkYqUDI53o6IuzDJBx60Z8VKCm271+t8iFjakrl8Q==');
});

test('send keeps its reviewed published release independently of the application version',()=>{
 const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
 const send=lock.packages['node_modules/send'];
 assert.equal(send.version,'0.19.2');
 assert.equal(send.resolved,'https://registry.npmjs.org/send/-/send-0.19.2.tgz');
 assert.equal(send.integrity,'sha512-VMbMxbDeehAxpOtWJXlcUS5E8iXh6QmN+BkRX1GARS3wRaXEEgzCcB10gTQazO42tpNIya8xIyNx8fll1OFPrg==');
 assert.equal(lock.packages['node_modules/express'].dependencies.send,'~0.19.0');
 assert.equal(lock.packages['node_modules/serve-static'].dependencies.send,'~0.19.1');
});

test('installed dependency versions match their lockfile records',()=>{
 const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
 let checked=0;
 for(const [dir,entry]of Object.entries(lock.packages)){
  if(!dir||!fs.existsSync(dir+'/package.json'))continue;
  const actual=JSON.parse(fs.readFileSync(dir+'/package.json','utf8'));
  assert.equal(entry.version,actual.version,dir+' version');
  for(const field of ['dependencies','optionalDependencies'])for(const [name,range]of Object.entries(actual[field]||{}))assert.equal(entry[field]?.[name],range,dir+' '+field+'.'+name);
  checked++;
 }
 assert(checked>0,'Install dependencies with npm ci before running tests');
});
