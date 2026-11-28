import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {DEVELOPER_ACCOUNTS,isDeveloper} from '../lib/product.js';

test('developer whitelist recognizes verified server-owned addresses only',()=>{
  assert(DEVELOPER_ACCOUNTS.includes('notion.app.login@gmail.com'));
  assert.equal(isDeveloper({email:'notion.app.login@gmail.com',email_verified:1}),true);
  assert.equal(isDeveloper({email:'NOTION.APP.LOGIN@gmail.com',email_verified:1}),true);
  assert.equal(isDeveloper({email:'notion.app.login@gmail.com',email_verified:0}),false);
  assert.equal(isDeveloper({email:'notion.app.login@gmail.com',email_verified:1,developer:false}),true);
  assert.equal(isDeveloper({email:'ordinary@example.test',email_verified:1}),false);
});

test('private Render environment variable can extend the developer allowlist without exposing it in public config',()=>{
  const script="import {isDeveloper,DEVELOPER_ACCOUNTS} from './lib/product.js';console.log(JSON.stringify({verified:isDeveloper({email:'PRIVATE@example.test',email_verified:1}),unverified:isDeveloper({email:'private@example.test',email_verified:0}),second:DEVELOPER_ACCOUNTS.includes('second@example.test'),invalid:DEVELOPER_ACCOUNTS.includes('not-an-email')}));";
  const result=spawnSync(process.execPath,['--input-type=module','-e',script],{cwd:process.cwd(),encoding:'utf8',env:{...process.env,PONGY_DEVELOPER_EMAILS:' Private@example.test ; second@example.test ; not-an-email '}});
  assert.equal(result.status,0,result.stderr);
  assert.deepEqual(JSON.parse(result.stdout.trim()),{verified:true,unverified:false,second:true,invalid:false});
});
