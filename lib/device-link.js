import crypto from 'node:crypto';

const digest=value=>crypto.createHash('sha256').update(value).digest();
const same=(a,b)=>{const left=Buffer.isBuffer(a)?a:Buffer.from(a||[]),right=Buffer.isBuffer(b)?b:Buffer.from(b||[]);return left.length===right.length&&crypto.timingSafeEqual(left,right);};

export class DeviceLinks {
 constructor(db,encryptionSecret,now=Date.now){
  if(!db||typeof db.prepare!=='function')throw new TypeError('A durable SQLite database is required');
  if(typeof encryptionSecret!=='string'||encryptionSecret.length<32)throw new TypeError('A stable encryption secret is required');
  this.db=db;this.now=now;this.encryptionKey=digest(encryptionSecret);
  db.exec(`CREATE TABLE IF NOT EXISTS device_login_links(id TEXT PRIMARY KEY,secret_hash BLOB NOT NULL,code_hash BLOB NOT NULL,code TEXT NOT NULL,expires_at INTEGER NOT NULL,token BLOB,created_at INTEGER NOT NULL);CREATE INDEX IF NOT EXISTS idx_device_login_expiry ON device_login_links(expires_at);`);
  this.prune();
 }
 prune(){this.db.prepare('DELETE FROM device_login_links WHERE expires_at<=?').run(this.now());}
 seal(value){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',this.encryptionKey,iv),body=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),body]);}
 open(value){const data=Buffer.from(value);if(data.length<29)throw new Error('Invalid device login token');const decipher=crypto.createDecipheriv('aes-256-gcm',this.encryptionKey,data.subarray(0,12));decipher.setAuthTag(data.subarray(12,28));return Buffer.concat([decipher.update(data.subarray(28)),decipher.final()]).toString('utf8');}
 start(){
  this.prune();if(this.db.prepare('SELECT COUNT(*) AS n FROM device_login_links').get().n>=500)throw Object.assign(Error('Please retry later'),{status:429});
  const id=crypto.randomUUID(),secret=crypto.randomBytes(32).toString('base64url'),code=String(crypto.randomInt(100000,1000000)),expires=this.now()+300000;
  this.db.prepare('INSERT INTO device_login_links(id,secret_hash,code_hash,code,expires_at,created_at) VALUES(?,?,?,?,?,?)').run(id,digest(secret),digest(code),code,expires,this.now());
  return{id,secret,code,expiresIn:300};
 }
 info(id){this.prune();if(typeof id!=='string'||id.length>64)return null;const row=this.db.prepare('SELECT code FROM device_login_links WHERE id=? AND token IS NULL AND expires_at>?').get(id,this.now());return row?{code:row.code}:null;}
 approve(id,code,token){
  this.prune();if(typeof id!=='string'||typeof code!=='string'||!/^\d{6}$/.test(code)||typeof token!=='string'||!token.length||token.length>8192)return false;
  const row=this.db.prepare('SELECT code_hash,token FROM device_login_links WHERE id=? AND expires_at>?').get(id,this.now());if(!row||row.token||!same(row.code_hash,digest(code)))return false;
  return this.db.prepare('UPDATE device_login_links SET token=? WHERE id=? AND token IS NULL AND expires_at>?').run(this.seal(token),id,this.now()).changes===1;
 }
 poll(id,secret){
  this.prune();if(typeof id!=='string'||typeof secret!=='string'||secret.length>100)return{expired:true};
  const row=this.db.prepare('SELECT secret_hash,token FROM device_login_links WHERE id=? AND expires_at>?').get(id,this.now());if(!row||!same(row.secret_hash,digest(secret)))return{expired:true};
  if(!row.token)return{pending:true};
  const removed=this.db.prepare('DELETE FROM device_login_links WHERE id=? AND secret_hash=? AND token IS NOT NULL').run(id,row.secret_hash);
  if(removed.changes!==1)return{expired:true};try{return{token:this.open(row.token)};}catch{return{expired:true};}
 }
}