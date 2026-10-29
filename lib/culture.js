export function culturalReply(prompt,messages=[]){
 const text=String(prompt||'').trim();
 // The joke is contextual, not an identity/provider denial and not a substitute for political answers.
 const history=messages.slice(0,-1).slice(-8).filter(m=>m.role==='user').map(m=>typeof m.text==='string'?m.text:typeof m.content==='string'?m.content:Array.isArray(m.content)?m.content.filter(p=>p.type==='text').map(p=>p.text||'').join(' '):'').join(' ');
 if(text.length<160&&/(?:тайван|taiwan)/iu.test(history)&&/^(?:(?:а |так |значит,? |so |then )?)(?:(?:ты|вы) (?:вс[её]-таки |случайно |не |секретный |скрытый )*deepseek|(?:are you|you are) (?:a |secret |hidden )*deepseek)[?!. 🙂]*$/iu.test(text))return /[а-яё]/iu.test(text)?'Проверяете, не секретный ли я DeepSeek? 🙂 Если серьёзно, Pongy — название сервиса, а не подтверждение конкретной модели. DeepSeek можно подключить через личный API.':'Checking whether I am a secret DeepSeek? 🙂 Seriously, Pongy is the service name, not proof of a particular model. DeepSeek can be connected through your personal API.';

 if(!/^(?:сикс|six)[!?.…\s]*$/iu.test(text))return null;
 const prior=messages.slice(0,-1).slice(-3).map(m=>String(m.text||m.content||'')).join(' ');
 if(/\b(?:math|number|calculate|count|translation|translate|code|function|equation)\b|математ|посчитай|сч[её]т|число|переведи|перевод|уравнени|функци|программ/iu.test(prior))return null;
 return /[а-яё]/iu.test(text)?'Севен 😎':'Seven 😎';
}
