export function googleFailureCode(error,info){
 const code=String(error?.code||'');
 if(/^(FIREBASE_|FIRESTORE_)/.test(code))return code;
 if(code==='ACCOUNT_LINK_CONFLICT')return code;
 if(error?.name==='TokenError'||error?.name==='InternalOAuthError')return 'GOOGLE_PROVIDER_ERROR';
 if(/state|session/i.test(String(info?.message||'')))return 'GOOGLE_STATE_INVALID';
 return 'GOOGLE_LOGIN_FAILED';
}
export function publicErrorCode(code){return typeof code==='string'&&(/^(FIREBASE_|FIRESTORE_|WEB_)[A-Z_]+$/.test(code)||['REQUEST_BLOCKED','ACCOUNT_NOT_FOUND','UNSUPPORTED_FORMAT','INVALID_CREDENTIALS','EMAIL_EXISTS','INVALID_EMAIL','WEAK_PASSWORD','EMAIL_NOT_VERIFIED','SESSION_EXPIRED','ACCOUNT_LINK_CONFLICT'].includes(code));}
