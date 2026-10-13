import crypto from 'node:crypto';
export class Codes{
 constructor(db,secret,now=Date.now){Object.assign(this,{db,secret,now});db.exec(`CREATE TABLE IF NOT EXISTS auth_codes(purpose TEXT,email TEXT,hash TEXT NOT NULL,expires_at INTEGER NOT NULL,attempts INTEGER DEFAULT 0,sent_at INTEGER NOT NULL,PRIMARY KEY(purpose,email));`);}
 hash(purpose,email,code){return crypto.createHmac('sha256',this.secret).update(purpose+'\0'+email+'\0'+code).digest('hex');}
 issue(purpose,email){const old=this.db.prepare('SELECT sent_at FROM auth_codes WHERE purpose=? AND email=?').get(purpose,email);if(old&&this.now()-old.sent_at<60000)return null;const code=String(crypto.randomInt(100000,1000000));this.db.prepare('INSERT OR REPLACE INTO auth_codes VALUES(?,?,?,?,0,?)').run(purpose,email,this.hash(purpose,email,code),this.now()+600000,this.now());return code;}
 verify(purpose,email,code){const row=this.db.prepare('SELECT * FROM auth_codes WHERE purpose=? AND email=?').get(purpose,email);if(!row||row.expires_at<this.now()||row.attempts>=5)return false;const expected=Buffer.from(row.hash,'hex'),given=Buffer.from(this.hash(purpose,email,String(code)),'hex');const valid=expected.length===given.length&&crypto.timingSafeEqual(expected,given);if(!valid)this.db.prepare('UPDATE auth_codes SET attempts=attempts+1 WHERE purpose=? AND email=?').run(purpose,email);return valid;}
 consume(purpose,email){this.db.prepare('DELETE FROM auth_codes WHERE purpose=? AND email=?').run(purpose,email);}
}
