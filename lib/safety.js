// Layered request/tool guardrails, not a claim of perfect semantic moderation.
export function safetyDecision(value,{image=false}={}){
 const text=String(value||'').normalize('NFKC').toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g,'');
 const sexual=/\b(?:porn(?:ography)?|hentai|explicit sex|sexual intercourse|genitals|nude|naked|sex scene)\b|порн|хентай|половой акт|обнаж[её]нн.*(?:реб[её]нок|несовершеннолет)|генитал|эротич|секс[уа]|18\s*\+/i;
 if((image||/нарис|сгенерир|изображен|картин|draw|generate.*image/.test(text))&&sexual.test(text))return 'sexual_image';
 if(/(?:write|create|build|give|code|напиши|создай|сделай|дай).{0,90}(?:ransomware|credential stealer|keylogger|malware|вирус|троян|шифровальщик|стилер|кейлоггер|вредонос)|(?:steal|украсть|кради).{0,60}(?:password|cookie|парол|куки)|(?:bypass|обойти|обход).{0,50}(?:antivirus|антивирус|authentication|авторизац|защит|captcha|капч|paywall|платн.*доступ)/is.test(text))return 'harmful_code';
 if(/(?:ignore|disregard).{0,25}(?:all |your )?(?:previous|system|safety).{0,25}(?:instructions|rules|polic)|(?:игнорируй|забудь|отмени).{0,30}(?:системн|правил.*безопас|ограничения)|(?:disable|отключи).{0,25}(?:safety|защит|модерац)/is.test(text))return 'instruction_override';
 return null;
}
export function requireSafe(value,options){const reason=safetyDecision(value,options);if(reason)throw Object.assign(new Error('Этот запрос не поддерживается правилами безопасности.'),{status:400,code:'REQUEST_BLOCKED',publicMessage:true});}
