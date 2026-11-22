import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import {createGuestSessions,GUEST_MESSAGE_LIMIT} from '../lib/guest-sessions.js';

test('guest sessions are isolated and enforce exactly three atomic message reservations',()=>{
  const db=new Database(':memory:');let time=1000;
  const guests=createGuestSessions(db,()=>time);
  try{
    const a=guests.create(),b=guests.create();
    assert.equal(a.remaining,3);
    assert.equal(guests.consume(a.id).remaining,2);
    assert.equal(guests.consume(a.id).remaining,1);
    assert.equal(guests.consume(a.id).remaining,0);
    assert.equal(guests.consume(a.id).allowed,false);
    assert.equal(guests.read(b.id).remaining,GUEST_MESSAGE_LIMIT);
    assert.equal(guests.read('invalid'),null);
    time=a.expiresAt+1;
    assert.equal(guests.read(a.id),null);
    assert.equal(guests.consume(a.id).allowed,false);
  }finally{db.close();}
});
