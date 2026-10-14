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
 const port=Number(env.PORT||3000);if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid PORT');
 const frontendUrl=new URL(env.FRONTEND_URL||'http://localhost:'+port).origin;
 const publicApiOrigin=env.PUBLIC_API_ORIGIN?new URL(env.PUBLIC_API_ORIGIN).origin:'';
 const production=env.NODE_ENV==='production';
 const firebaseKey=env.FIREBASE_API_KEY||'',firebaseProject=env.FIREBASE_PROJECT_ID||'';
 if((firebaseKey||firebaseProject)&&(!firebaseKey||!/^[-a-z0-9]{6,63}$/.test(firebaseProject)))throw new Error('Set both FIREBASE_API_KEY and a valid FIREBASE_PROJECT_ID');
 if(env.FIREBASE_FIRESTORE_ENABLED==='true'&&!firebaseKey)throw new Error('Firestore requires Firebase authentication');
 if(production && !frontendUrl.startsWith('https://'))throw new Error('FRONTEND_URL must use HTTPS in production');
 return {root,dataDir,port,production,jwtSecret,sessionSecret,frontendUrl,publicApiOrigin,firebaseKey,firebaseProject,firestoreEnabled:env.FIREBASE_FIRESTORE_ENABLED==='true',stableSecrets:!!(env.JWT_SECRET&&env.SESSION_SECRET),
  databasePath:env.DATABASE_PATH?path.resolve(root,env.DATABASE_PATH):fs.existsSync(path.join(root,'pongy.db'))?path.join(root,'pongy.db'):path.join(dataDir,'pongy.db'),
  allowedOrigins:new Set([frontendUrl,...String(env.CORS_ORIGINS||'').split(',').filter(Boolean).map(v=>new URL(v.trim()).origin)]),
  cookieSecure:production||frontendUrl.startsWith('https://'),cookieSameSite:env.COOKIE_SAMESITE==='none'?'none':'lax',
  trustProxy:env.TRUST_PROXY?Number(env.TRUST_PROXY):false,
  tavilySearchKey:env.TAVILY_API_KEY||'',braveSearchKey:env.BRAVE_SEARCH_API_KEY||'',
  imageGenerationEnabled:env.IMAGE_GENERATION_ENABLED==='true',imageModel:env.IMAGE_MODEL||'',
  openrouterKey:env.OPENROUTER_API_KEY||env.OPENROUTER_KEY||'',resendKey:env.RESEND_API_KEY||'',mailFrom:env.MAIL_FROM||'',
  googleId:env.GOOGLE_CLIENT_ID||'',googleSecret:env.GOOGLE_CLIENT_SECRET||'',googleCallback:env.GOOGLE_CALLBACK_URL||frontendUrl+'/auth/google/callback',
  modelPreferences:String(env.FREE_MODEL_PREFERENCES||'').split(',').map(s=>s.trim()).filter(Boolean),
  maxOutputTokens:Math.min(4096,Math.max(128,Number(env.MAX_OUTPUT_TOKENS)||2048)),maxAiAttempts:Math.min(8,Math.max(1,Number(env.MAX_AI_ATTEMPTS)||6)),
  aiTotalMs:90000,aiAttemptMs:25000,modelCacheMs:1800000,maxConcurrent:8};
}
