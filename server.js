import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import rateLimit from 'express-rate-limit';
import { Passport } from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import session from 'express-session';
import FileStore from 'session-file-store';
import dns from 'node:dns';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import { loadConfig } from './lib/config.js';
import { Codes } from './lib/codes.js';
import { FreeAI } from './lib/ai.js';
const moduleRoot=path.dirname(fileURLToPath(import.meta.url));
const asyncRoute=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const emailValue=value=>typeof value==='string'&&value.trim().length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())?value.trim().toLowerCase():null;
const validPassword=value=>typeof value==='string'&&value.length>=8&&Buffer.byteLength(value,'utf8')<=72;
const publicUser=u=>({id:u.id,email:u.email,nickname:u.nickname||'',avatar:u.avatar||'',subscription_until:u.subscription_until||0});
export function createApp({config=loadConfig(process.env,moduleRoot),fetchImpl=fetch,now=Date.now,checkMx=async email=>{try{return (await dns.promises.resolveMx(email.split('@')[1])).length>0;}catch{return false;}}}={}){
 fs.mkdirSync(path.dirname(config.databasePath),{recursive:true,mode:0o700});
 const db=new Database(config.databasePath);db.pragma('journal_mode = WAL');db.pragma('foreign_keys = ON');db.pragma('busy_timeout = 5000');
 db.exec(`CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,email TEXT UNIQUE NOT NULL,password TEXT,nickname TEXT DEFAULT '',avatar TEXT DEFAULT '',subscription_until INTEGER DEFAULT 0,google_id TEXT DEFAULT '',email_verified INTEGER DEFAULT 0,token_version INTEGER DEFAULT 0,created_at INTEGER DEFAULT (strftime('%s','now')*1000));
 CREATE TABLE IF NOT EXISTS chats(id TEXT NOT NULL,user_id INTEGER NOT NULL,title TEXT DEFAULT '',messages TEXT DEFAULT '[]',updated_at INTEGER,pinned INTEGER DEFAULT 0,PRIMARY KEY(id,user_id),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
 CREATE INDEX IF NOT EXISTS idx_chats_user ON chats(user_id);`);
 if(!db.prepare('PRAGMA table_info(users)').all().some(c=>c.name==='token_version'))db.exec('ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 0');
 db.exec('DROP TABLE IF EXISTS reset_codes; DROP TABLE IF EXISTS verify_codes;');
 const codes=new Codes(db,config.jwtSecret,now),ai=new FreeAI(config,fetchImpl,now),app=express();
 app.disable('x-powered-by');if(config.trustProxy!==false){if(!Number.isInteger(config.trustProxy)||config.trustProxy<1)throw new Error('TRUST_PROXY must be a trusted hop count');app.set('trust proxy',config.trustProxy);}
 app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],scriptSrcAttr:["'none'"],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'",'data:','https:'],connectSrc:["'self'",...config.allowedOrigins,...(config.publicApiOrigin?[config.publicApiOrigin]:[])],fontSrc:["'self'"],objectSrc:["'none'"],frameAncestors:["'none'"],baseUri:["'none'"],formAction:["'self'"],upgradeInsecureRequests:config.production?[]:null}},strictTransportSecurity:config.production?undefined:false,referrerPolicy:{policy:'no-referrer'}}));
 const ownOrigin=req=>req.protocol+'://'+req.get('host');
 const allowed=(origin,req)=>!origin||config.allowedOrigins.has(origin)||origin===ownOrigin(req);
 app.use((req,res,next)=>{const origin=req.get('origin');if(!allowed(origin,req))return res.status(403).json({error:'Недопустимый источник запроса'});next();});
 app.use(cors({origin:(origin,cb)=>cb(null,!origin||config.allowedOrigins.has(origin)),credentials:true,exposedHeaders:['Retry-After']}));
 app.use(rateLimit({windowMs:60000,max:200,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Слишком много запросов. Попробуйте позже.'}}));
 app.use(express.json({limit:'256kb',strict:true}));app.use(cookieParser());
 const dummyHash=bcrypt.hashSync(crypto.randomBytes(32).toString('hex'),12);
 const cookieOptions={httpOnly:true,secure:config.cookieSecure,sameSite:config.cookieSameSite,path:'/',maxAge:7*86400000};
 if(cookieOptions.sameSite==='none'&&!cookieOptions.secure)throw new Error('SameSite=None requires HTTPS');
 app.use((req,res,next)=>{if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.cookies.pongy_session&&!req.get('authorization')&&!req.get('origin'))return res.status(403).json({error:'Отсутствует источник запроса'});next();});
 const authLimit=rateLimit({windowMs:15*60000,max:30,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Слишком много попыток. Попробуйте позже.'}});
 const mailLimit=rateLimit({windowMs:3600000,max:8,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Лимит отправки писем. Попробуйте позже.'}});
 const chatLimit=rateLimit({windowMs:60000,max:20,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Лимит запросов к ИИ. Попробуйте позже.'}});
 function issueSession(res,user){const token=jwt.sign({id:user.id,v:user.token_version||0},config.jwtSecret,{algorithm:'HS256',issuer:'pongy-server',audience:'pongy-web',expiresIn:'7d'});res.cookie('pongy_session',token,cookieOptions);}
 function auth(req,res,next){
  const header=req.get('authorization'),token=header?(header.startsWith('Bearer ')?header.slice(7):''):req.cookies.pongy_session;
  if(!token)return res.status(401).json({error:'Войдите в аккаунт'});
  try{const claim=jwt.verify(token,config.jwtSecret,{algorithms:['HS256'],issuer:'pongy-server',audience:'pongy-web'});if(!Number.isSafeInteger(claim.id))throw new Error();const user=db.prepare('SELECT * FROM users WHERE id=?').get(claim.id);if(!user||claim.v!==user.token_version)throw new Error();req.user=user;res.set('Cache-Control','no-store');next();}catch{return res.status(401).json({error:'Сеанс завершён. Войдите снова.'});}
 }
 async function mail(to,subject,code){
  if(!config.resendKey||!config.mailFrom)throw Object.assign(new Error('Отправка почты не настроена владельцем сервера.'),{status:503});
  const response=await fetchImpl('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.resendKey},body:JSON.stringify({from:config.mailFrom,to:[to],subject,html:'<p>Pongy AI</p><p>Ваш код: <strong>'+code+'</strong></p><p>Действует 10 минут. Никому не сообщайте код.</p>'})});
  if(!response.ok)throw Object.assign(new Error('Не удалось отправить письмо. Попробуйте позже.'),{status:503});
 }
 const registrationEmailLimit=new Map();
 function sendCooldown(email){const until=registrationEmailLimit.get(email)||0;if(until>now())return false;if(registrationEmailLimit.size>=10000)for(const [key,time]of registrationEmailLimit)if(time<=now())registrationEmailLimit.delete(key);if(registrationEmailLimit.size>=10000)return false;registrationEmailLimit.set(email,now()+60000);return true;}
 app.get('/api/config',(_req,res)=>res.set('Cache-Control','no-store').json({aiConfigured:!!config.openrouterKey,emailConfigured:!!(config.resendKey&&config.mailFrom),googleEnabled:!!(config.googleId&&config.googleSecret),paymentsEnabled:false,plusPrice:190,currency:'RUB'}));
 app.get('/healthz',(_req,res)=>res.json({status:'ok'}));
 app.post('/api/register/send-code',authLimit,mailLimit,asyncRoute(async(req,res)=>{
  const email=emailValue(req.body?.email);if(!email)return res.status(400).json({error:'Укажите корректную почту'});
  if(!config.resendKey||!config.mailFrom)return res.status(503).json({error:'Отправка почты ещё не настроена.'});
  if(!sendCooldown(email))return res.status(429).json({error:'Подождите минуту перед повторной отправкой'});
  if(db.prepare('SELECT id FROM users WHERE email=?').get(email))return res.json({ok:true});
  if(!await checkMx(email))return res.status(400).json({error:'Не удалось проверить почтовый домен'});
  const code=codes.issue('register',email);if(!code)return res.status(429).json({error:'Подождите минуту'});
  try{await mail(email,'Pongy AI — подтверждение почты',code);}catch(e){codes.consume('register',email);throw e;}res.json({ok:true});
 }));
 app.post('/api/register',authLimit,asyncRoute(async(req,res)=>{
  const email=emailValue(req.body?.email),password=req.body?.password,code=req.body?.code;
  if(!email||!validPassword(password)||typeof code!=='string'||!/^\d{6}$/.test(code))return res.status(400).json({error:'Проверьте почту, код и пароль: минимум 8 символов, максимум 72 байта'});
  if(!codes.verify('register',email,code))return res.status(400).json({error:'Код неверен, просрочен или исчерпан лимит попыток'});
  const hash=await bcrypt.hash(password,12);
  try{const user=db.transaction(()=>{const info=db.prepare('INSERT INTO users(email,password,email_verified) VALUES(?,?,1)').run(email,hash);codes.consume('register',email);return db.prepare('SELECT * FROM users WHERE id=?').get(info.lastInsertRowid);})();issueSession(res,user);res.json({authenticated:true,user:publicUser(user)});}catch(e){if(e.code==='SQLITE_CONSTRAINT_UNIQUE')return res.status(409).json({error:'Не удалось создать аккаунт. Попробуйте войти.'});throw e;}
 }));
 app.post('/api/login',authLimit,asyncRoute(async(req,res)=>{
  const email=emailValue(req.body?.email),password=req.body?.password;if(!email||typeof password!=='string'||Buffer.byteLength(password)>72)return res.status(400).json({error:'Некорректные данные входа'});
  const user=db.prepare('SELECT * FROM users WHERE email=?').get(email);
  const match=await bcrypt.compare(password,user?.password||dummyHash);if(!user?.password||!match)return res.status(401).json({error:'Неверная почта или пароль'});issueSession(res,user);res.json({authenticated:true,user:publicUser(user)});
 }));
 app.post('/api/logout',auth,(req,res)=>{db.prepare('UPDATE users SET token_version=token_version+1 WHERE id=?').run(req.user.id);res.clearCookie('pongy_session',{...cookieOptions,maxAge:undefined});res.json({ok:true});});
 app.get('/api/me',auth,(req,res)=>res.json(publicUser(req.user)));
 app.put('/api/me',auth,(req,res)=>{const nickname=req.body?.nickname;if(typeof nickname!=='string'||nickname.length>32)return res.status(400).json({error:'Никнейм должен содержать не более 32 символов'});db.prepare('UPDATE users SET nickname=? WHERE id=?').run(nickname,req.user.id);res.json({ok:true});});
 app.post('/api/password/send-code',authLimit,mailLimit,asyncRoute(async(req,res)=>{
  const email=emailValue(req.body?.email);if(!email)return res.status(400).json({error:'Укажите корректную почту'});
  if(!config.resendKey||!config.mailFrom)return res.status(503).json({error:'Отправка почты ещё не настроена.'});
  if(!sendCooldown(email))return res.status(429).json({error:'Подождите минуту перед повторной отправкой'});
  if(db.prepare('SELECT id FROM users WHERE email=?').get(email)){const code=codes.issue('reset',email);if(!code)return res.status(429).json({error:'Подождите минуту'});try{await mail(email,'Pongy AI — восстановление пароля',code);}catch(e){codes.consume('reset',email);throw e;}}
  res.json({ok:true});
 }));
 app.post('/api/password/verify-code',authLimit,(req,res)=>{const email=emailValue(req.body?.email),code=req.body?.code;if(!email||typeof code!=='string'||!/^\d{6}$/.test(code)||!codes.verify('reset',email,code))return res.status(400).json({error:'Код неверен, просрочен или исчерпан лимит попыток'});res.json({ok:true});});
 app.post('/api/password/reset',authLimit,asyncRoute(async(req,res)=>{
  const email=emailValue(req.body?.email),code=req.body?.code,password=req.body?.newPassword;
  if(!email||!validPassword(password)||typeof code!=='string'||!/^\d{6}$/.test(code))return res.status(400).json({error:'Проверьте почту, код и новый пароль'});
  if(!db.transaction(()=>{if(!codes.verify('reset',email,code))return false;codes.consume('reset',email);return true;})())return res.status(400).json({error:'Код неверен, просрочен или исчерпан лимит попыток'});
  const hash=await bcrypt.hash(password,12);db.transaction(()=>{db.prepare('UPDATE users SET password=?,token_version=token_version+1 WHERE email=?').run(hash,email);codes.consume('reset',email);})();res.clearCookie('pongy_session',{...cookieOptions,maxAge:undefined});res.json({ok:true});
 }));
 app.get('/api/chats',auth,(req,res)=>res.json(db.prepare('SELECT id,title,messages,updated_at,pinned FROM chats WHERE user_id=? ORDER BY pinned DESC,updated_at DESC LIMIT 500').all(req.user.id).map(r=>({...r,messages:JSON.parse(r.messages),pinned:!!r.pinned}))));
 app.put('/api/chats/:id',auth,(req,res)=>{
  const {title,messages,pinned}=req.body||{},id=req.params.id;
  if(!/^[\w-]{1,64}$/.test(id)||typeof title!=='string'||title.length>200||!Array.isArray(messages)||messages.length>200||typeof pinned!=='boolean'||messages.some(m=>!m||!['user','assistant'].includes(m.role)||typeof m.text!=='string'||m.text.length>60000))return res.status(400).json({error:'Некорректный формат чата'});
  if(!db.prepare('SELECT 1 FROM chats WHERE id=? AND user_id=?').get(id,req.user.id)&&db.prepare('SELECT COUNT(*) AS n FROM chats WHERE user_id=?').get(req.user.id).n>=500)return res.status(429).json({error:'Лимит сохранённых чатов'});
  const clean=messages.map(m=>({role:m.role,text:m.text,...(m.meta&&typeof m.meta==='object'?{meta:{id:String(m.meta.id||'').slice(0,64),smart:!!m.meta.smart,search:false,chars:m.text.length,retries:Math.max(0,Math.min(8,Number(m.meta.retries)||0)),startTime:Number(m.meta.startTime)||now(),endTime:Number(m.meta.endTime)||now()}}:{})}));
  db.prepare('INSERT INTO chats VALUES(?,?,?,?,?,?) ON CONFLICT(id,user_id) DO UPDATE SET title=excluded.title,messages=excluded.messages,updated_at=excluded.updated_at,pinned=excluded.pinned').run(id,req.user.id,title,JSON.stringify(clean),now(),pinned?1:0);res.json({ok:true});
 });
 app.delete('/api/chats/:id',auth,(req,res)=>{db.prepare('DELETE FROM chats WHERE id=? AND user_id=?').run(req.params.id,req.user.id);res.json({ok:true});});
 app.post('/api/pay/create',auth,(_req,res)=>res.status(503).json({error:'Оплата СБП ещё не подключена. Дождитесь настройки банка или платёжного провайдера.',code:'PAYMENT_NOT_CONFIGURED'}));
 app.post('/api/chat',auth,chatLimit,asyncRoute(async(req,res)=>{
  const input=req.body?.messages;if(!Array.isArray(input)||!input.length||input.length>100)return res.status(400).json({error:'Некорректная история сообщений'});
  const messages=[];let size=0;
  for(const m of input){if(!m||!['user','assistant','system'].includes(m.role))return res.status(400).json({error:'Некорректная роль сообщения'});if(m.role==='system')continue;const content=m.content??m.text;if(typeof content!=='string'||!content.trim()||content.length>30000)return res.status(400).json({error:'Некорректный текст сообщения'});size+=content.length;if(size>100000)return res.status(400).json({error:'Слишком длинная история'});messages.push({role:m.role,content});}
  if(!messages.length||messages.at(-1).role!=='user')return res.status(400).json({error:'Добавьте сообщение пользователя'});
  messages.unshift({role:'system',content:'You are Pongy, a helpful and honest personal AI assistant. Reply in the user language. Do not claim live web access or invent sources. '+(req.body.smart?'Give a carefully checked answer with a concise explanation.':'Be concise.')});
  await ai.respond(req,res,messages);
 }));
 // OAuth uses state nonce + signed session; JWT never appears in a redirect URL.
 const passport=new Passport(),SessionStore=FileStore(session);
 if(config.googleId&&config.googleSecret){
  app.use('/auth/google',session({store:new SessionStore({path:path.join(config.dataDir,'oauth-sessions'),retries:0,logFn(){}}),secret:config.sessionSecret,resave:false,saveUninitialized:false,cookie:{httpOnly:true,secure:config.cookieSecure,sameSite:'lax',maxAge:600000}}),passport.initialize());
  passport.use(new GoogleStrategy({clientID:config.googleId,clientSecret:config.googleSecret,callbackURL:config.googleCallback,state:true},(_access,_refresh,profile,done)=>{
   try{const email=emailValue(profile.emails?.[0]?.value);if(!email||!(profile._json?.email_verified===true||profile.emails?.[0]?.verified===true))return done(new Error('Google email must be verified'));
    let user=db.prepare('SELECT * FROM users WHERE google_id=?').get(profile.id)||db.prepare('SELECT * FROM users WHERE email=?').get(email);
    if(user?.google_id&&user.google_id!==profile.id)return done(new Error('Account link conflict'));
    if(!user){const info=db.prepare('INSERT INTO users(email,google_id,nickname,email_verified) VALUES(?,?,?,1)').run(email,profile.id,String(profile.displayName||'').slice(0,32));user=db.prepare('SELECT * FROM users WHERE id=?').get(info.lastInsertRowid);}
    else if(!user.google_id){db.prepare('UPDATE users SET google_id=?,email_verified=1 WHERE id=?').run(profile.id,user.id);user.google_id=profile.id;}
    done(null,user);
   }catch(e){done(e);}
  }));
  app.get('/auth/google',passport.authenticate('google',{scope:['profile','email'],session:false}));
  app.get('/auth/google/callback',(req,res,next)=>passport.authenticate('google',{session:false},(err,user)=>{if(err||!user)return res.redirect(config.frontendUrl+'/?google_error=login_failed');issueSession(res,user);req.session.destroy(()=>res.redirect(config.frontendUrl+'/?google_login=success'));})(req,res,next));
 }else app.get(['/auth/google','/auth/google/callback'],(_req,res)=>res.status(503).json({error:'Вход через Google ещё не настроен.'}));
 app.get('/app-config.js',(_req,res)=>res.type('application/javascript').set('Cache-Control','no-store').send('window.PONGY_CONFIG='+JSON.stringify({apiUrl:config.publicApiOrigin}).replace(/</g,'\\u003c')+';'));
 app.use(express.static(path.join(moduleRoot,'public'),{dotfiles:'deny',index:'index.html',fallthrough:true,setHeaders(res,p){if(p.endsWith('.html'))res.setHeader('Cache-Control','no-cache');}}));
 app.use((_req,res)=>res.status(404).json({error:'Не найдено'}));
 app.use((err,_req,res,_next)=>{if(res.headersSent){res.end();return;}const status=err.type==='entity.too.large'?413:err instanceof SyntaxError?400:err.status||500;res.status(status).json({error:status>=500?'Сервис временно недоступен. Проверьте настройки сервера.':status===413?'Слишком большой запрос':status===400?'Некорректный запрос':err.message});});
 return {app,db,ai,codes,close(){db.close();}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const config=loadConfig(process.env,moduleRoot),runtime=createApp({config});const server=runtime.app.listen(config.port,()=>{console.log('Pongy server listening on port '+config.port);console.log('AI: '+(config.openrouterKey?'configured (provider availability not guaranteed)':'not configured — set OPENROUTER_API_KEY on the server'));console.log('SBP payments: not configured');if(config.openrouterKey){const controller=new AbortController();runtime.ai.models(controller.signal).catch(()=>{});}});
 const shutdown=()=>{server.close(()=>{runtime.close();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();};process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
}
