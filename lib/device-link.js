import crypto from 'node:crypto';
const hash=s=>crypto.createHash('sha256').update(s).digest();
export class DeviceLinks{
 constructor(now=Date.now){this.now=now;this.entries=new Map();}
 prune(){for(const [id,e]of this.entries)if(e.expires<=this.now())this.entries.delete(id);}
 start(){this.prune();if(this.entries.size>=500)throw Object.assign(Error('Please retry later'),{status:429});const id=crypto.randomUUID(),secret=crypto.randomBytes(32).toString('base64url'),code=String(crypto.randomInt(100000,1000000));this.entries.set(id,{hash:hash(secret),code,expires:this.now()+300000,token:null});return {id,secret,code,expiresIn:300};}
 info(id){this.prune();const e=this.entries.get(id);return e?{code:e.code}:null;}
 approve(id,code,token){this.prune();const e=this.entries.get(id);if(!e||e.code!==code||e.token||typeof token!=='string')return false;e.token=token;return true;}
 poll(id,secret){this.prune();const e=this.entries.get(id);if(!e||typeof secret!=='string'||secret.length>100||!crypto.timingSafeEqual(hash(secret),e.hash))return {expired:true};if(!e.token)return {pending:true};this.entries.delete(id);return {token:e.token};}
}
