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
