import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import {DeviceLinks} from '../lib/device-link.js';

test('native login challenge survives service instances, encrypts session token, is secret-bound, confirmed once and expires',()=>{
 let now=0;const db=new Database(':memory:');
 try{
  const key='device-link-test-encryption-key-'.repeat(2),first=new DeviceLinks(db,key,()=>now),a=first.start(),b=first.start();
  assert.equal(first.poll(a.id,a.secret).pending,true);assert.equal(first.poll(a.id,b.secret).expired,true);
  assert.equal(first.approve(a.id,'000000','token'),false);assert.deepEqual(first.info(a.id),{code:a.code});
  const restarted=new DeviceLinks(db,key,()=>now);assert.equal(restarted.approve(a.id,a.code,'token'),true);
  const stored=db.prepare('SELECT token FROM device_login_links WHERE id=?').get(a.id).token;assert.ok(Buffer.isBuffer(stored));assert.notEqual(stored.toString(),'token');
  assert.equal(first.approve(a.id,a.code,'replacement'),false);assert.equal(restarted.poll(a.id,a.secret).token,'token');assert.equal(first.poll(a.id,a.secret).expired,true);
  now=300001;assert.equal(restarted.info(b.id),null);assert.equal(restarted.approve(b.id,b.code,'late'),false);assert.equal(restarted.poll(b.id,b.secret).expired,true);
  assert.throws(()=>new DeviceLinks(db,'short',()=>now));
 }finally{db.close();}
});