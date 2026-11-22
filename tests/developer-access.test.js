import test from 'node:test';
import assert from 'node:assert/strict';
import {DEVELOPER_ACCOUNTS,isDeveloper} from '../lib/product.js';

test('developer whitelist recognizes the newly approved verified address only',()=>{
  assert(DEVELOPER_ACCOUNTS.includes('notion.app.login@gmail.com'));
  assert.equal(isDeveloper({email:'notion.app.login@gmail.com',email_verified:1}),true);
  assert.equal(isDeveloper({email:'NOTION.APP.LOGIN@gmail.com',email_verified:1}),true);
  assert.equal(isDeveloper({email:'notion.app.login@gmail.com',email_verified:0}),false);
  assert.equal(isDeveloper({email:'notion.app.login@gmail.com',email_verified:1,developer:false}),true);
  assert.equal(isDeveloper({email:'ordinary@example.test',email_verified:1}),false);
});
