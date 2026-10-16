import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
const fail=(message,status=503,code='FIREBASE_UNAVAILABLE')=>Object.assign(new Error(message),{status,code});
export class FirebaseAuth {
 constructor(config,fetchImpl=fetch){this.config=config;this.fetch=fetchImpl;this.enabled=!!(config.firebaseKey&&config.firebaseProject);this.sessionChecks=new Map();this.secret=crypto.createHash('sha256').update(config.jwtSecret).digest();}
 seal(value,uid){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',this.secret,iv);cipher.setAAD(Buffer.from(uid));return Buffer.concat([iv,cipher.update(value,'utf8'),cipher.final(),cipher.getAuthTag()]).toString('base64url');}
 open(value,uid){const b=Buffer.from(value,'base64url');if(b.length<29)throw fail('Сеанс завершён. Войдите снова.',401,'SESSION_EXPIRED');const decipher=crypto.createDecipheriv('aes-256-gcm',this.secret,b.subarray(0,12));decipher.setAAD(Buffer.from(uid));decipher.setAuthTag(b.subarray(-16));return Buffer.concat([decipher.update(b.subarray(12,-16)),decipher.final()]).toString('utf8');}
 async request(action,body,{refresh=false,locale='ru'}={}){
  if(!this.enabled)throw fail('Firebase ещё не настроен.',503,'FIREBASE_NOT_CONFIGURED');
  const url=(refresh?'https://securetoken.googleapis.com/v1/token':'https://identitytoolkit.googleapis.com/v1/accounts:'+action)+'?key='+encodeURIComponent(this.config.firebaseKey);
  let response,data;try{response=await this.fetch(url,{method:'POST',signal:AbortSignal.timeout(12000),headers:{'Content-Type':refresh?'application/x-www-form-urlencoded':'application/json','X-Firebase-Locale':locale==='en'?'en':'ru'},body:refresh?new URLSearchParams(body).toString():JSON.stringify(body)});data=await response.json();}catch{throw fail('Firebase временно недоступен. Попробуйте позже.');}
  if(!response.ok||data.error){const code=String(data.error?.message||'').split(' : ')[0];
   if(code==='EMAIL_NOT_FOUND'&&action==='signInWithPassword')throw fail('Аккаунт не найден.',401,'ACCOUNT_NOT_FOUND');
   if(['INVALID_PASSWORD','INVALID_LOGIN_CREDENTIALS','EMAIL_NOT_FOUND'].includes(code))throw fail('Неверная почта или пароль.',401,'INVALID_CREDENTIALS');
   if(['INVALID_REFRESH_TOKEN','TOKEN_EXPIRED','INVALID_ID_TOKEN','USER_NOT_FOUND','USER_DISABLED'].includes(code))throw fail('Сеанс завершён. Войдите снова.',401,'SESSION_EXPIRED');
   if(code==='EMAIL_EXISTS')throw fail('Этот адрес уже зарегистрирован. Войдите или восстановите пароль.',409,'EMAIL_EXISTS');
   if(code==='INVALID_EMAIL')throw fail('Укажите корректную почту.',400,'INVALID_EMAIL');
   if(code.startsWith('WEAK_PASSWORD'))throw fail('Пароль не соответствует требованиям Firebase.',400,'WEAK_PASSWORD');
   if(['TOO_MANY_ATTEMPTS_TRY_LATER','QUOTA_EXCEEDED','RESET_PASSWORD_EXCEED_LIMIT'].includes(code))throw fail('Лимит Firebase исчерпан. Попробуйте позже.',429,'FIREBASE_RATE_LIMIT');
   if(['OPERATION_NOT_ALLOWED','API_KEY_INVALID','INVALID_API_KEY','PROJECT_NUMBER_MISMATCH','CONFIGURATION_NOT_FOUND','INVALID_OAUTH_CLIENT_ID','UNAUTHORIZED_DOMAIN'].includes(code)||response.status===403)throw fail('Проверьте настройки Firebase на сервере и включение Email/Password.',503,'FIREBASE_CONFIGURATION');
   throw fail('Не удалось выполнить запрос Firebase. Попробуйте позже.');
  }return data;
 }
 async signup(email,password,locale){const session=await this.request('signUp',{email,password,returnSecureToken:true});const user=await this.lookup(session.idToken,email);await this.request('sendOobCode',{requestType:'VERIFY_EMAIL',idToken:session.idToken},{locale});if(typeof session.refreshToken!=='string'||session.refreshToken.length>1024)throw fail('Некорректный ответ Firebase.');return {...session,user};}
 async signIn(email,password){const session=await this.request('signInWithPassword',{email,password,returnSecureToken:true});const user=await this.lookup(session.idToken,email);if(typeof session.refreshToken!=='string'||session.refreshToken.length>1024)throw fail('Некорректный ответ Firebase.');return {...session,user};}
 async lookup(idToken,email){if(typeof idToken!=='string')throw fail('Некорректный ответ Firebase.');const data=await this.request('lookup',{idToken}),user=data.users?.[0],claim=jwt.decode(idToken); // Google validates the token before any decoded claims are used.
  if(!user||typeof user.localId!=='string'||!user.localId||user.localId.length>128||typeof user.email!=='string'||user.disabled||claim?.aud!==this.config.firebaseProject||claim?.iss!=='https://securetoken.google.com/'+this.config.firebaseProject||claim?.sub!==user.localId||(email&&user.email.toLowerCase()!==email))throw fail('Не удалось проверить аккаунт Firebase.',503,'FIREBASE_CONFIGURATION');return user;
 }
 async pendingSession(refreshToken,uid,email){const tokens=await this.request('',{grant_type:'refresh_token',refresh_token:refreshToken},{refresh:true});const user=await this.lookup(tokens.id_token,email);if(user.localId!==uid||typeof tokens.refresh_token!=='string'||tokens.refresh_token.length>1024)throw fail('Сеанс завершён.',401,'SESSION_EXPIRED');return {idToken:tokens.id_token,refreshToken:tokens.refresh_token,user};}
 async checkSession(encrypted,uid,email){let refreshToken;try{refreshToken=this.open(encrypted,uid);}catch{throw fail('Сеанс завершён. Войдите снова.',401,'SESSION_EXPIRED');}
  const key=crypto.createHash('sha256').update(encrypted+'\0'+uid+'\0'+email).digest('hex');if(this.sessionChecks.has(key))return this.sessionChecks.get(key);
  // Share only concurrent verification. No cached verdict survives completion, so revocation is checked on the next request.
  const task=Promise.resolve().then(()=>this.verifySession(refreshToken,uid,email));if(this.sessionChecks.size>=200)return task;
  this.sessionChecks.set(key,task);try{return await task;}finally{if(this.sessionChecks.get(key)===task)this.sessionChecks.delete(key);}
 }
 async verifySession(refreshToken,uid,email){const tokens=await this.request('',{grant_type:'refresh_token',refresh_token:refreshToken},{refresh:true});const user=await this.lookup(tokens.id_token,email);if(user.localId!==uid||user.emailVerified!==true)throw fail('Сеанс завершён. Войдите снова.',401,'SESSION_EXPIRED');const refreshed=tokens.refresh_token||refreshToken;if(typeof refreshed!=='string'||refreshed.length>1024)throw fail('Некорректный ответ Firebase.');return {refreshToken:refreshed,previous:refreshToken,idToken:tokens.id_token};}
 async resend(email,password,locale){const session=await this.signIn(email,password);if(session.user.emailVerified===true)return {alreadyVerified:true};await this.request('sendOobCode',{requestType:'VERIFY_EMAIL',idToken:session.idToken},{locale});return {verificationRequired:true,session};}
 async google(accessToken){const session=await this.request('signInWithIdp',{requestUri:this.config.frontendUrl,postBody:new URLSearchParams({access_token:accessToken,providerId:'google.com'}).toString(),returnSecureToken:true});if(typeof session.refreshToken!=='string'||session.refreshToken.length>1024)throw fail('Некорректный ответ Firebase.');const user=await this.lookup(session.idToken);if(user.emailVerified!==true)throw fail('Подтвердите почту Google.',403,'EMAIL_NOT_VERIFIED');return {...session,user};}
 async reset(email,locale){try{await this.request('sendOobCode',{requestType:'PASSWORD_RESET',email},{locale});}catch(error){if(error.code!=='INVALID_CREDENTIALS')throw error;}return {ok:true};}
}
