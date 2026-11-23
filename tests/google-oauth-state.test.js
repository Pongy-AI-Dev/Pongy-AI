import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { createGoogleOAuthStateStore } from '../lib/google-oauth-state.js';

function fixture() {
  const db = new Database(':memory:');
  db.exec('CREATE TABLE oauth_states(state_hash TEXT PRIMARY KEY,provider TEXT NOT NULL,expires_at INTEGER NOT NULL)');
  let time = 1_800_000_000_000;
  const store = createGoogleOAuthStateStore({ db, secure: true, now: () => time });
  const cookies = {};
  const response = {
    cookie(name, value, options) { cookies[name] = value; response.lastCookieOptions = options; },
    clearCookie(name) { delete cookies[name]; },
  };
  const req = { cookies, res: response };
  return { db, store, req, cookies, response, advance(ms) { time += ms; } };
}

function storeState(f) {
  return new Promise((resolve, reject) => f.store.store(f.req, (error, state) => error ? reject(error) : resolve(state)));
}
function verifyState(f, state) {
  return new Promise((resolve, reject) => f.store.verify(f.req, state, (error, ok, info) => error ? reject(error) : resolve({ ok, info })));
}

test('Google OAuth state is persisted and bound to a secure, HttpOnly, Lax cookie', async () => {
  const f = fixture();
  const state = await storeState(f);
  assert.equal(state.length, 43);
  assert.equal(f.cookies.pongy_google_state, state);
  assert.equal(f.response.lastCookieOptions.httpOnly, true);
  assert.equal(f.response.lastCookieOptions.secure, true);
  assert.equal(f.response.lastCookieOptions.sameSite, 'lax');
  assert.equal(f.response.lastCookieOptions.path, '/auth/google');
  assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM oauth_states').get().count, 1);
  f.db.close();
});

test('Google OAuth state verifies once and cannot be replayed', async () => {
  const f = fixture();
  const state = await storeState(f);
  assert.deepEqual(await verifyState(f, state), { ok: true, info: undefined });
  assert.equal(f.cookies.pongy_google_state, undefined);
  assert.equal((await verifyState(f, state)).ok, false);
  f.db.close();
});

test('Google OAuth state rejects a different browser cookie and expired records', async () => {
  const f = fixture();
  const state = await storeState(f);
  f.cookies.pongy_google_state = 'x'.repeat(43);
  assert.equal((await verifyState(f, state)).ok, false);
  const expired = await storeState(f);
  f.advance(10 * 60 * 1000 + 1);
  assert.equal((await verifyState(f, expired)).ok, false);
  f.db.close();
});
