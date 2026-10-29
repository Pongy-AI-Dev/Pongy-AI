// Deliberately bounded commands: no shell, arbitrary paths, arbitrary key injection or guessed recipients.
export const WAKE_ALIASES=Object.freeze(['pongy ai','pongy','pong','ponger','pongery','понги эй ай','понги аи','понги ии','понги','понджи эй ай','понджи аи','понджи ии','понджи','понг','понгер','понгери']);
export function smartCommand(input){if(typeof input!=='string'||input.length>2000)return null;let s=input.trim().toLowerCase();for(const alias of [...WAKE_ALIASES].sort((a,b)=>b.length-a.length)){if(s===alias||s.startsWith(alias+' ')||s.startsWith(alias+',')){s=s.slice(alias.length).replace(/^[,\s]+/,'');break;}}
 if(/[?"«»]/u.test(s)||/(?:^|\s)(?:не|как|почему|зачем|don't|how|why)(?:\s|$)|do not/u.test(s))return null;
 if(/^(?:открой|запусти|open|launch)\s+(?:ютуб|ютюб|youtube)[.!?]*$/u.test(s))return {kind:'open',value:'youtube'};
 for(const [value,words] of [['notepad','блокнот|notepad'],['calculator','калькулятор|calculator'],['explorer','проводник|file explorer'],['max','макс|максе|max']])if(new RegExp('^(?:открой|запусти|open|launch)\\s+(?:'+words+')[.!?]*$','u').test(s))return {kind:'open',value};
 if(/(?:напиши|отправь|write|send).*(?:макс|max)/u.test(s))return {kind:'clarify',value:'max_contact_and_message'};
 if(/(?:звук|громкост|volume|sound)/u.test(s)){if(/(?:меньше|тише|убавь|lower|down)/u.test(s))return {kind:'volume',value:'down'};if(/(?:больше|громче|прибавь|raise|up)/u.test(s))return {kind:'volume',value:'up'};if(/(?:выключи|без звука|mute)/u.test(s))return {kind:'volume',value:'mute'};}
 if(/(?:яркост|brightness)/u.test(s)){if(/(?:меньше|убавь|lower|down)/u.test(s))return {kind:'brightness',value:'down'};if(/(?:больше|прибавь|raise|up)/u.test(s))return {kind:'brightness',value:'up'};return {kind:'unsupported',value:'brightness'};}
 if(/^(?:открой|запусти|удали|нажми|напиши|отправь|установи|закрой|перемести|open|launch|click|type|delete|send|install|close|move)\s/u.test(s))return {kind:'unsupported',value:'automation'};
 return null;
}
