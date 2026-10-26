import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export function loadConfig(env=process.env,root=process.cwd()){
 const dataDir=path.resolve(root,env.DATA_DIR||'data');const publicDir=path.join(root,'public');const inPublic=p=>{const relative=path.relative(publicDir,p);return relative===''||(!relative.startsWith('..')&&!path.isAbsolute(relative));};if(inPublic(dataDir))throw new Error('DATA_DIR must be outside public/');if(env.DATABASE_PATH&&inPublic(path.resolve(root,env.DATABASE_PATH)))throw new Error('DATABASE_PATH must be outside public/');fs.mkdirSync(dataDir,{recursive:true,mode:0o700});
 // Keep auto-generated auth keys beside an explicitly configured database.
 // Migrate existing keys, never replace them merely because DATA_DIR changed.
 const legacyFile=path.join(dataDir,'secrets.json'),databaseFile=env.DATABASE_PATH?path.resolve(root,env.DATABASE_PATH):null;
 const file=databaseFile?databaseFile+'.auth-secrets.json':legacyFile;fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
 if(file!==legacyFile&&!fs.existsSync(file)&&fs.existsSync(legacyFile)){const copy=file+'.migrate.'+crypto.randomBytes(6).toString('hex')+'.tmp';try{fs.copyFileSync(legacyFile,copy,fs.constants.COPYFILE_EXCL);fs.chmodSync(copy,0o600);try{fs.linkSync(copy,file);}catch(e){if(e.code!=='EEXIST')throw e;}}finally{try{fs.unlinkSync(copy);}catch(e){if(e.code!=='ENOENT')throw e;}}}
 let stored={};
 try{stored=JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw new Error('Cannot read data/secrets.json');}
 const getSecret=(name)=>{
  if(env[name]){if(env[name].length<32)throw new Error(name+' must have at least 32 characters');return env[name];}
  if(typeof stored[name]!=='string'||stored[name].length<32)stored[name]=crypto.randomBytes(48).toString('base64url');
  return stored[name];
 };
 let jwtSecret=getSecret('JWT_SECRET'),sessionSecret=getSecret('SESSION_SECRET');
 const tmp=file+'.'+process.pid+'.'+crypto.randomBytes(6).toString('hex')+'.tmp';
 fs.writeFileSync(tmp,JSON.stringify(stored),{mode:0o600});
 try{
  // Link a complete file atomically: simultaneous first starts must share one identity.
  if(!fs.existsSync(file)){try{fs.linkSync(tmp,file);}catch(e){if(e.code!=='EEXIST')throw e;}}
  const winner=JSON.parse(fs.readFileSync(file,'utf8'));
  for(const name of ['JWT_SECRET','SESSION_SECRET'])if(!env[name]){
   if(typeof winner[name]!=='string'||winner[name].length<32){winner[name]=stored[name];fs.writeFileSync(tmp,JSON.stringify(winner),{mode:0o600});fs.renameSync(tmp,file);}
   if(name==='JWT_SECRET')jwtSecret=winner[name];else sessionSecret=winner[name];
  }
  try{fs.chmodSync(file,0o600);}catch{}
 }finally{try{fs.unlinkSync(tmp);}catch(e){if(e.code!=='ENOENT')throw e;}}

 const cloudflareReady=!!String(env.CLOUDFLARE_API_TOKEN||'').trim()&&/^[a-f0-9]{32}$/i.test(String(env.CLOUDFLARE_ACCOUNT_ID||'').trim());
 const imageProvider=['cloudflare','pollinations','openrouter'].includes(env.IMAGE_PROVIDER)?env.IMAGE_PROVIDER:cloudflareReady?'cloudflare':env.IMAGE_MODEL?'openrouter':'pollinations';
 const port=Number(env.PORT||3000);if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid PORT');
 const frontendUrl=new URL(env.FRONTEND_URL||'http://localhost:'+port).origin;
 const publicApiOrigin=env.PUBLIC_API_ORIGIN?new URL(env.PUBLIC_API_ORIGIN).origin:'';
 const oauthOrigin=publicApiOrigin||frontendUrl;
 const production=env.NODE_ENV==='production';
 const firebaseKey=env.FIREBASE_API_KEY||'',firebaseProject=env.FIREBASE_PROJECT_ID||'';
 if((firebaseKey||firebaseProject)&&(!firebaseKey||!/^[-a-z0-9]{6,63}$/.test(firebaseProject)))throw new Error('Set both FIREBASE_API_KEY and a valid FIREBASE_PROJECT_ID');
 if(env.FIREBASE_FIRESTORE_ENABLED==='true'&&!firebaseKey)throw new Error('Firestore requires Firebase authentication');
 if(production && !frontendUrl.startsWith('https://'))throw new Error('FRONTEND_URL must use HTTPS in production');
 // Operator mail settings may live in data/secrets.json when environment variables are absent,
 // so review and reminder delivery can be configured without touching the process environment.
 const storedMail=name=>{const value=stored[name];return typeof value==='string'&&value.trim()?value.trim():''};
 const mailEnv={resendKey:env.RESEND_API_KEY||storedMail('resendKey'),mailFrom:env.MAIL_FROM||storedMail('mailFrom'),mailProvider:env.MAIL_PROVIDER||storedMail('mailProvider')||'auto',smtpHost:env.SMTP_HOST||storedMail('smtpHost'),smtpPort:env.SMTP_PORT||storedMail('smtpPort'),smtpSecure:env.SMTP_SECURE||storedMail('smtpSecure'),smtpUser:env.SMTP_USER||storedMail('smtpUser'),smtpPass:env.SMTP_PASS||storedMail('smtpPass')};
 return {maintenanceMode:env.MAINTENANCE_MODE==='true',root,dataDir,reminderKeyPath:databaseFile?databaseFile+'.reminder-vapid.json':path.join(dataDir,'reminder-vapid.json'),port,production,jwtSecret,sessionSecret,frontendUrl,publicApiOrigin,firebaseKey,firebaseProject,firestoreEnabled:env.FIREBASE_FIRESTORE_ENABLED==='true',stableSecrets:!!(env.JWT_SECRET&&env.SESSION_SECRET),
  databasePath:env.DATABASE_PATH?path.resolve(root,env.DATABASE_PATH):fs.existsSync(path.join(root,'pongy.db'))?path.join(root,'pongy.db'):path.join(dataDir,'pongy.db'),
  allowedOrigins:new Set([frontendUrl,...String(env.CORS_ORIGINS||'').split(',').filter(Boolean).map(v=>new URL(v.trim()).origin)]),
  cookieSecure:production||frontendUrl.startsWith('https://'),cookieSameSite:env.COOKIE_SAMESITE==='none'?'none':'lax',
  trustProxy:env.TRUST_PROXY?Number(env.TRUST_PROXY):env.RENDER==='true'?1:false,
  resourcesEnabled:env.APILAYER_ENABLED==='true',resourceMonthlyLimit:Math.min(100,Math.max(1,Number(env.APILAYER_MONTHLY_LIMIT)||100)),resourceKeys:Object.fromEntries(['mediastack','numverify','ipstack','aviationstack','positionstack','countrylayer','marketstack','mailboxlayer'].map(name=>[name,String(env['APILAYER_'+name.toUpperCase()+'_KEY']||env.APILAYER_API_KEY||'').trim()])),
  tavilySearchKey:env.TAVILY_API_KEY||'',braveSearchKey:env.BRAVE_SEARCH_API_KEY||'',
  imageProvider,imageApiMode:['images','chat'].includes(env.IMAGE_API_MODE)?env.IMAGE_API_MODE:'auto',imageGenerationEnabled:env.IMAGE_GENERATION_ENABLED!=='false'&&(imageProvider!=='openrouter'||String(env.IMAGE_MODEL||'').endsWith(':free')),paidModelsEnabled:false,imageModel:imageProvider==='cloudflare'?'@cf/black-forest-labs/flux-1-schnell':imageProvider==='openrouter'?(env.IMAGE_MODEL||''):'pollinations-classic',
  cloudflareToken:String(env.CLOUDFLARE_API_TOKEN||'').trim(),cloudflareAccountId:String(env.CLOUDFLARE_ACCOUNT_ID||'').trim(),cloudflareImageSteps:Math.min(8,Math.max(1,Math.floor(Number(env.CLOUDFLARE_IMAGE_STEPS)||4))),cloudflareImageDailyLimit:Math.min(60,Math.max(1,Math.floor(Number(env.CLOUDFLARE_IMAGE_DAILY_LIMIT)||60))),
  geminiEnabled:env.GEMINI_ENABLED==='true',geminiAllowPaid:env.GEMINI_ALLOW_PAID==='true',geminiKey:String(env.GEMINI_API_KEY||'').trim(),geminiModel:env.GEMINI_MODEL||'gemini-3.8-flash',geminiFastModel:env.GEMINI_FAST_MODEL||'gemini-3.5-flash-lite',
  deepseekEnabled:env.DEEPSEEK_ENABLED==='true',deepseekAllowPaid:env.DEEPSEEK_ALLOW_PAID==='true',deepseekKey:String(env.DEEPSEEK_API_KEY||'').trim(),deepseekModel:/^[a-z0-9][a-z0-9._-]{0,79}$/.test(env.DEEPSEEK_MODEL||'')?env.DEEPSEEK_MODEL:'deepseek-flash',
  openrouterKey:env.OPENROUTER_API_KEY||env.OPENROUTER_KEY||'',resendKey:mailEnv.resendKey,mailFrom:mailEnv.mailFrom,mailProvider:mailEnv.mailProvider,smtpHost:mailEnv.smtpHost,smtpPort:mailEnv.smtpPort,smtpSecure:mailEnv.smtpSecure,smtpUser:mailEnv.smtpUser,smtpPass:mailEnv.smtpPass,
  googleId:env.GOOGLE_CLIENT_ID||'',googleSecret:env.GOOGLE_CLIENT_SECRET||'',googleCallback:env.GOOGLE_CALLBACK_URL||oauthOrigin+'/auth/google/callback',
  githubId:env.GITHUB_CLIENT_ID||'',githubSecret:env.GITHUB_CLIENT_SECRET||'',githubCallback:env.GITHUB_CALLBACK_URL||oauthOrigin+'/auth/github/callback',
  modelPreferences:String(env.FREE_MODEL_PREFERENCES||'').split(',').map(s=>s.trim()).filter(Boolean),
  codingOutputTokens:Math.min(131072,Math.max(2048,Number(env.MAX_CODING_OUTPUT_TOKENS)||32768)),maxOutputTokens:Math.min(65536,Math.max(128,Number(env.MAX_OUTPUT_TOKENS)||16384)),maxAiAttempts:Math.min(12,Math.max(1,Number(env.MAX_AI_ATTEMPTS)||12)),
  aiProjectTotalMs:Math.min(900000,Math.max(60000,Number(env.AI_PROJECT_TOTAL_MS)||300000)),aiTotalMs:Math.min(600000,Math.max(30000,Number(env.AI_TOTAL_MS)||180000)),aiAttemptMs:Math.min(180000,Math.max(5000,Number(env.AI_ATTEMPT_MS)||60000)),aiFirstTokenMs:Math.min(30000,Math.max(3000,Number(env.AI_FIRST_TOKEN_MS)||15000)),aiComplexFirstTokenMs:Math.min(40000,Math.max(3000,Number(env.AI_COMPLEX_FIRST_TOKEN_MS)||Number(env.AI_FIRST_TOKEN_MS)||22000)),modelCacheMs:1800000,maxConcurrent:8};
}
