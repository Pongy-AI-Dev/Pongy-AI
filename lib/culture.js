export function culturalReply(prompt,messages=[]){
 const text=String(prompt||'').trim();
 if(!/^(?:сикс|six)[!?.…\s]*$/iu.test(text))return null;
 const prior=messages.slice(0,-1).slice(-3).map(m=>String(m.text||m.content||'')).join(' ');
 if(/\b(?:math|number|calculate|count|translation|translate|code|function|equation)\b|математ|посчитай|сч[её]т|число|переведи|перевод|уравнени|функци|программ/iu.test(prior))return null;
 return /[а-яё]/iu.test(text)?'Севен 😎':'Seven 😎';
}
