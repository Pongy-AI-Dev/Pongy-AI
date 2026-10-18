// Snapshot of free catalogue candidates, not a promise of availability or benchmark leadership.
// Every candidate must ALSO pass the live zero-price catalogue check.
const BALANCED=['nvidia/nemotron-3.5-super-vl:free','thinkingmachines/inkling-small:free','thinkingmachines/inkling:free','nvidia/nemotron-3-ultra-550b-a55b:free','google/gemma-4-26b-a4b-it:free','google/gemma-4-31b-it:free'];
const CODING=['poolside/laguna-s-2.1:free',BALANCED[0],BALANCED[2],BALANCED[3],BALANCED[1],BALANCED[4]];
const MATH=[BALANCED[0],BALANCED[3],BALANCED[2],BALANCED[1],BALANCED[4],BALANCED[5]];
export const PAID_MODELS_ENABLED=false; // Plus checkout/entitlements are not active.
export function isFreeId(id){return typeof id==='string'&&(id.endsWith(':free')||id==='openrouter/free')}
export function zeroPriceModel(model){
 if(!isFreeId(model?.id)||/content-safety|moderation|guard(?:rail)?/i.test(model.id))return false;
 const prices=model.pricing;
 if(!prices||!['prompt','completion'].every(k=>prices[k]!==null&&prices[k]!==''&&Number(prices[k])===0))return false;
 // Fail closed on nonzero/unknown extra charges, including request, images and reasoning.
 return Object.values(prices).every(v=>(typeof v==='number'||typeof v==='string'&&v.trim()!=='')&&Number.isFinite(Number(v))&&Number(v)===0);
}
export function modelOrder(profile='general',vision=false){return (vision?BALANCED:profile==='coding'?CODING:profile==='complex'?MATH:BALANCED).slice()}
export function requestProfile(messages,mode){
 const last=messages.filter(m=>m.role==='user').at(-1);const text=typeof last?.content==='string'?last.content:(last?.content||[]).filter(p=>p.type==='text').map(p=>p.text).join(' ');
 if(mode==='coding'||/```|\b(?:debug|implement|refactor|sql|javascript|python|typescript|code|coding)\b|код|программ|скрипт|отлад|(?:создай|сделай|разработай|собери).{0,80}(?:приложени|проект|сайт)|(?:build|create|develop).{0,60}(?:app|project|website)/i.test(text))return 'coding';
 return /\b(?:equation|integral|proof|geometry|calculate|math)\b|уравнен|интеграл|докаж|геометр|математ|вычисл|реши\s+задач|подробн.{0,30}(?:исследован|анализ|план)|(?:comprehensive|detailed).{0,30}(?:analysis|research|plan)/i.test(text)?'complex':'general';
}
