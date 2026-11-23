import crypto from 'node:crypto';

const COOKIE = 'pongy_google_state';
const MAX_AGE = 10 * 60 * 1000;

export function createGoogleOAuthStateStore({ db, secure = true, now = Date.now }) {
  db.exec('CREATE TABLE IF NOT EXISTS oauth_states(state_hash TEXT PRIMARY KEY,provider TEXT NOT NULL,expires_at INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS idx_oauth_states_expiry ON oauth_states(expires_at);');
  const insert = db.prepare('INSERT INTO oauth_states(state_hash,provider,expires_at) VALUES(?,?,?)');
  const consume = db.prepare('DELETE FROM oauth_states WHERE state_hash=? AND provider=? AND expires_at>=?');

  function clearCookie(res) {
    res.clearCookie(COOKIE, { httpOnly: true, secure, sameSite: 'lax', path: '/auth/google' });
  }

  return {
    store(req, callback) {
      try {
        const state = crypto.randomBytes(32).toString('base64url');
        const hash = crypto.createHash('sha256').update(state).digest('hex');
        db.prepare('DELETE FROM oauth_states WHERE expires_at<?').run(now());
        insert.run(hash, 'google', now() + MAX_AGE);
        req.res.cookie(COOKIE, state, {
          httpOnly: true,
          secure,
          sameSite: 'lax',
          path: '/auth/google',
          maxAge: MAX_AGE,
        });
        callback(null, state);
      } catch (error) {
        callback(error);
      }
    },

    verify(req, providedState, callback) {
      try {
        const browserState = String(req.cookies?.[COOKIE] || '');
        const supplied = typeof providedState === 'string' ? providedState : '';
        let matches = browserState.length === 43 && supplied.length === 43;
        if (matches) {
          const a = Buffer.from(browserState);
          const b = Buffer.from(supplied);
          matches = a.length === b.length && crypto.timingSafeEqual(a, b);
        }
        if (!matches) {
          clearCookie(req.res);
          return callback(null, false, { message: 'Unable to verify authorization request state.' });
        }

        const hash = crypto.createHash('sha256').update(supplied).digest('hex');
        const valid = consume.run(hash, 'google', now()).changes === 1;
        clearCookie(req.res);
        callback(null, valid, valid ? undefined : { message: 'Unable to verify authorization request state.' });
      } catch (error) {
        callback(error);
      }
    },
  };
}
