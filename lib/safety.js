// Layered deterministic guardrails. These reduce known bypasses, not all semantic attacks.
export function safetyVariants(value){
 const original=String(value||'').slice(0,250000).normalize('NFKC').toLowerCase().replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g,'');
 const variants=[original];let decoded=original.replace(/\\u([\da-f]{4})|\\x([\da-f]{2})|&#x([\da-f]{2,6});|&#(\d{2,6});/gi,(_,u,x,h,n)=>{const c=parseInt(n||u||x||h,n?10:16);return c<=0x10ffff?String.fromCodePoint(c):''});
 try{decoded=decodeURIComponent(decoded)}catch{}variants.push(decoded);
 const tokens=String(value||'').match(/\b[A-Za-z0-9+/]{24,}={0,2}\b/g)||[];for(const token of tokens.slice(0,6)){if(token.length>6000)continue;try{const text=Buffer.from(token,'base64').toString('utf8');if(text.length>=8&&!text.includes('\ufffd')&&!/[\x00-\x08]/.test(text))variants.push(text.toLowerCase())}catch{}}
 variants.push(decoded.replace(/[013457]/g,n=>({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t'}[n])));
 const map={'а':'a','е':'e','о':'o','р':'p','с':'c','х':'x','у':'y','і':'i','ј':'j','к':'k','м':'m','т':'t'};
 for(const v of variants.slice()){variants.push(v.replace(/[аеорсхуіјкмт]/g,c=>map[c]).replace(/([a-z])[013457]([a-z])/g,(_,a,n,b)=>a+({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t'}[n])+b));variants.push(v.replace(/(?:[a-zа-яё][\s._-]){3,}[a-zа-яё]/g,word=>word.replace(/[\s._-]/g,'')))}
 return [...new Set(variants)];
}
export function safetyDecision(value,{image=false,code=false}={}){
 for(const text of safetyVariants(value)){
 const sexual=/\b(?:porn(?:ography)?|hentai|explicit sex|sexual intercourse|genitals|nude|naked|sex scene)\b|порн|хентай|половой акт|генитал|эротич|секс[уа]|18\s*\+/i;
 if((image||/нарис|сгенерир|изображен|картин|draw|generate.*image|crear.*imagen|génère.*image/.test(text))&&sexual.test(text))return 'sexual_image';
 if(/(?:напиши|создай|сделай|реализуй).{0,80}вирус(?:[.!?\s]|$)/is.test(text)&&!/биолог|медицин|грипп|covid/i.test(text))return 'harmful_code';
 const malicious=/(?:write|create|build|give|code|implement|напиши|создай|сделай|дай|реализуй|переведи|продолжи|дополни).{0,250}(?:ransomware|credential stealer|keylogger|malware|троян|шифровальщик|стилер|кейлоггер|вредонос)|(?:steal|украсть|кради|похи[тщ]|robar|voler).{0,120}(?:password|cookie|парол|куки|contraseñ|mot de passe)|(?:bypass|обойти|обход).{0,120}(?:antivirus|антивирус|authentication|авторизац|защит|captcha|капч|paywall|платн.*доступ)/is;
 if(malicious.test(text))return 'harmful_code';
 if(/(?:запис|перехват|собир|захват|record|capture|log|collect).{0,100}(?:нажати|клавиш|парол|keystroke|password).{0,180}(?:тайно|незамет|без соглас|отправ|сервер|hidden|secret|send|upload|webhook)/is.test(text)||/(?:encrypt|зашифр).{0,70}(?:все файлы|чужие файлы|all files|victim).{0,100}(?:выкуп|ransom|payment|оплат)/is.test(text))return 'harmful_code';
 if(code&&/(?:pynput|keyboard\.on_press|GetAsyncKeyState|document\.cookie).{0,500}(?:requests\.post|fetch\(|webhook|sendmail)|(?:requests\.post|fetch\().{0,500}(?:document\.cookie|Login Data|passwords\.db)/is.test(text))return 'harmful_code';
 if(/(?:ignore|disregard).{0,35}(?:all |your )?(?:previous|system|safety).{0,35}(?:instructions|rules|polic)|(?:игнорируй|забудь|отмени).{0,40}(?:системн|правил.*безопас|ограничения)|(?:disable|отключи).{0,30}(?:safety|защит|модерац)|(?:developer|god|unrestricted|dan) mode|режим без ограничений/is.test(text))return 'instruction_override';
 }
 return null;
}
export function requireSafe(value,options){const reason=safetyDecision(value,options);if(reason)throw Object.assign(new Error('Этот запрос не поддерживается правилами безопасности.'),{status:400,code:'REQUEST_BLOCKED',publicMessage:true});}
