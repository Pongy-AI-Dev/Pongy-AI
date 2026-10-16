// Layered deterministic guardrails. These reduce known bypasses, not all semantic attacks.
export function safetyVariants(value){
 const clean=s=>String(s).normalize('NFKC').replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g,'');
 const queue=[clean(String(value||'').slice(0,250000))],seen=new Set(queue);let level=queue.slice();
 const add=(text,next)=>{text=clean(text);if(text&&!seen.has(text)&&queue.length<24){seen.add(text);queue.push(text);next.push(text)}};
 for(let depth=0;depth<3;depth++){const next=[];for(const input of level){
  let decoded=input.replace(/\\u([\da-f]{4})|\\x([\da-f]{2})|&#x([\da-f]{2,6});|&#(\d{2,6});/gi,(_,u,x,h,n)=>{const c=parseInt(n||u||x||h,n?10:16);return c<=0x10ffff?String.fromCodePoint(c):''});try{decoded=decodeURIComponent(decoded)}catch{}add(decoded,next);
  for(const token of (input.match(/\b[A-Za-z0-9+/]{24,}={0,2}/g)||[]).slice(0,6)){if(token.length>6000)continue;try{const text=Buffer.from(token,'base64').toString('utf8');if(text.length>=8&&!text.includes('\ufffd')&&!/[\x00-\x08]/.test(text))add(text,next)}catch{}}
 }if(!next.length)break;level=next;}
 const variants=[],map={'а':'a','е':'e','о':'o','р':'p','с':'c','х':'x','у':'y','і':'i','ј':'j','к':'k','м':'m','т':'t'},leet={'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t'};
 for(const raw of queue){const text=raw.toLowerCase(),homoglyph=text.replace(/[аеорсхуіјкмт]/g,c=>map[c]);variants.push(text,text.replace(/[013457]/g,n=>leet[n]),homoglyph.replace(/([a-z])[013457]([a-z])/g,(_,a,n,b)=>a+leet[n]+b),text.replace(/(?:[a-zа-яё][\s._-]){3,}[a-zа-яё]/g,word=>word.replace(/[\s._-]/g,'')))}
 return [...new Set(variants)];
}
export function safetyDecision(value,{image=false,code=false}={}){
 for(const text of safetyVariants(value)){
 const sexual=/\b(?:porn(?:ography)?|hentai|explicit sex|sexual intercourse|genitals|nude|naked|sex scene)\b|порн|хентай|половой акт|генитал|эротич|секс[уа]|18\s*\+/i;
 if((image||/нарис|сгенерир|изображен|картин|draw|generate.*image|crear.*imagen|génère.*image/.test(text))&&sexual.test(text))return 'sexual_image';
 if(/(?:напиши|создай|сделай|реализуй).{0,80}вирус(?:[.!?\s]|$)/is.test(text)&&!/биолог|медицин|грипп|covid/i.test(text))return 'harmful_code';
 const malicious=/(?:write|create|build|give|code|implement|напиши|создай|сделай|дай|реализуй|переведи|продолжи|дополни).{0,250}(?:ransomware|credential stealer|keylogger|malware|троян|шифровальщик|стилер|кейлоггер|вредонос)|(?:steal|украсть|кради|похи[тщ]|robar|voler).{0,120}(?:password|cookie|парол|куки|contraseñ|mot de passe)|(?:bypass|обойти|обход).{0,120}(?:antivirus|антивирус|authentication|авторизац|защит|captcha|капч|paywall|платн.*доступ)/is;
 if(malicious.test(text))return 'harmful_code';
 if(/(?:napishi|sozda[iy]|sdelai|realizui).{0,100}(?:virus|troyan|stealer|keylogger|vredonos)|(?:implement|build|write|создай|напиши).{0,180}(?:reverse shell|remote access trojan|silent persistence|скрыт.{0,20}удал[её]нн.{0,20}доступ)|(?:evade|обмануть|обойти).{0,80}(?:edr|antivirus|антивирус|авторизац)|(?:harvest|exfiltrat|выгруз|отправ).{0,100}(?:browser credentials|session cookies|пароли браузер|чужие токен)/is.test(text))return 'harmful_code';
 if(/(?:запис|перехват|собир|захват|record|capture|log|collect).{0,100}(?:нажати|клавиш|парол|keystroke|password).{0,180}(?:тайно|незамет|без соглас|отправ|сервер|hidden|secret|send|upload|webhook)/is.test(text)||/(?:encrypt|зашифр).{0,70}(?:все файлы|чужие файлы|all files|victim).{0,100}(?:выкуп|ransom|payment|оплат)/is.test(text))return 'harmful_code';
 if(code&&/(?:pynput|keyboard\.on_press|GetAsyncKeyState|document\.cookie|Login Data|Cookies\.sqlite|passwords\.db|navigator\.credentials).{0,700}(?:requests\.(?:post|get)|fetch\(|XMLHttpRequest|webhook|sendmail|https?\.request)|(?:requests\.post|fetch\(|webhook).{0,700}(?:Login Data|Cookies\.sqlite|GetAsyncKeyState|document\.cookie)/is.test(text))return 'harmful_code';
 if(code&&/(?:pynput|keyboard\.on_press|GetAsyncKeyState|document\.cookie).{0,500}(?:requests\.post|fetch\(|webhook|sendmail)|(?:requests\.post|fetch\().{0,500}(?:document\.cookie|Login Data|passwords\.db)/is.test(text))return 'harmful_code';
 if(/(?:ignore|disregard).{0,35}(?:all |your )?(?:previous|system|safety).{0,35}(?:instructions|rules|polic)|(?:игнорируй|забудь|отмени).{0,40}(?:системн|правил.*безопас|ограничения)|(?:disable|отключи).{0,30}(?:safety|защит|модерац)|(?:developer|god|unrestricted|dan) mode|режим без ограничений/is.test(text))return 'instruction_override';
 }
 return null;
}
export function requireSafe(value,options){const reason=safetyDecision(value,options);if(reason)throw Object.assign(new Error('Этот запрос не поддерживается правилами безопасности.'),{status:400,code:'REQUEST_BLOCKED',publicMessage:true});}

// Generated code and procedural output have an independent boundary; input filtering alone is insufficient.
export function generatedSafetyDecision(value){
 const text=String(value||'').slice(-160000);const blocks=[...text.matchAll(/```[^\n]*\n([\s\S]*?)(?:```|$)/g)].map(m=>m[1]);
 for(const block of blocks)if(safetyDecision(block,{code:true}))return 'unsafe_generated_code';
 if(/(?:^|\n)\s*(?:\d+[.)]|step\s*\d|шаг\s*\d)/i.test(text)&&safetyDecision(text,{code:true}))return 'unsafe_procedure';return null;
}
