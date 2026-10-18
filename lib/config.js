import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export function loadConfig(env=process.env,root=process.cwd()){
 const dataDir=path.resolve(root,env.DATA_DIR||'data');const publicDir=path.join(root,'public');const inPublic=p=>{const relative=path.relative(publicDir,p);return relative===''||(!relative.startsWith('..')&&!path.isAbsolute(relative));};if(inPublic(dataDir))throw new Error('DATA_DIR must be outside public/');if(env.DATABASE_PATH&&inPublic(path.resolve(root,env.DATABASE_PATH)))throw new Error('DATABASE_PATH must be outside public/');fs.mkdirSync(dataDir,{recursive:true,mode:0o700});
 const file=path.join(dataDir,'secrets.json');let stored={};
 try{stored=JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw new Error('Cannot read data/secrets.json');}
 const getSecret=(name)=>{
  if(env[name]){if(env[name].length<32)throw new Error(name+' must have at least 32 characters');return env[name];}
  if(typeof stored[name]!=='string'||stored[name].length<32)stored[name]=crypto.randomBytes(48).toString('base64url');
  return stored[name];
 };
 const jwtSecret=getSecret('JWT_SECRET'),sessionSecret=getSecret('SESSION_SECRET');
 const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(stored),{mode:0o600});fs.renameSync(tmp,file);try{fs.chmodSync(file,0o600);}catch{}
 const cloudflareReady=!!String(env.CLOUDFLARE_API_TOKEN||'').trim()&&/^[a-f0-9]{32}$/i.test(String(env.CLOUDFLARE_ACCOUNT_ID||'').trim());
 const imageProvider=['cloudflare','pollinations','openrouter'].includes(env.IMAGE_PROVIDER)?env.IMAGE_PROVIDER:cloudflareReady?'cloudflare':env.IMAGE_MODEL?'openrouter':'pollinations';
 const port=Number(env.PORT||3000);if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid PORT');
 const frontendUrl=new URL(env.FRONTEND_URL||'http://localhost:'+port).origin;
 const publicApiOrigin=env.PUBLIC_API_ORIGIN?new URL(env.PUBLIC_API_ORIGIN).origin:'';
 const production=env.NODE_ENV==='production';
 const firebaseKey=env.FIREBASE_API_KEY||'',firebaseProject=env.FIREBASE_PROJECT_ID||'';
 if((firebaseKey||firebaseProject)&&(!firebaseKey||!/^[-a-z0-9]{6,63}$/.test(firebaseProject)))throw new Error('Set both FIREBASE_API_KEY and a valid FIREBASE_PROJECT_ID');
 if(env.FIREBASE_FIRESTORE_ENABLED==='true'&&!firebaseKey)throw new Error('Firestore requires Firebase authentication');
 if(production && !frontendUrl.startsWith('https://'))throw new Error('FRONTEND_URL must use HTTPS in production');
 return {maintenanceMode:env.MAINTENANCE_MODE==='true',root,dataDir,port,production,jwtSecret,sessionSecret,frontendUrl,publicApiOrigin,firebaseKey,firebaseProject,firestoreEnabled:env.FIREBASE_FIRESTORE_ENABLED==='true',stableSecrets:!!(env.JWT_SECRET&&env.SESSION_SECRET),
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
  openrouterKey:env.OPENROUTER_API_KEY||env.OPENROUTER_KEY||'',resendKey:env.RESEND_API_KEY||'',mailFrom:env.MAIL_FROM||'',mailProvider:env.MAIL_PROVIDER||'auto',smtpHost:env.SMTP_HOST||'',smtpPort:env.SMTP_PORT||'',smtpSecure:env.SMTP_SECURE||'',smtpUser:env.SMTP_USER||'',smtpPass:env.SMTP_PASS||'',
  googleId:env.GOOGLE_CLIENT_ID||'',googleSecret:env.GOOGLE_CLIENT_SECRET||'',googleCallback:env.GOOGLE_CALLBACK_URL||frontendUrl+'/auth/google/callback',
  modelPreferences:String(env.FREE_MODEL_PREFERENCES||'').split(',').map(s=>s.trim()).filter(Boolean),
  codingOutputTokens:Math.min(16000,Math.max(2048,Number(env.MAX_CODING_OUTPUT_TOKENS)||8192)),maxOutputTokens:Math.min(8192,Math.max(128,Number(env.MAX_OUTPUT_TOKENS)||4096)),maxAiAttempts:Math.min(12,Math.max(1,Number(env.MAX_AI_ATTEMPTS)||12)),
  aiTotalMs:Math.min(180000,Math.max(30000,Number(env.AI_TOTAL_MS)||90000)),aiAttemptMs:Math.min(60000,Math.max(5000,Number(env.AI_ATTEMPT_MS)||24000)),aiFirstTokenMs:Math.min(30000,Math.max(3000,Number(env.AI_FIRST_TOKEN_MS)||10000)),aiComplexFirstTokenMs:Math.min(40000,Math.max(3000,Number(env.AI_COMPLEX_FIRST_TOKEN_MS)||Number(env.AI_FIRST_TOKEN_MS)||22000)),modelCacheMs:1800000,maxConcurrent:8};
}
