(function(root){'use strict';
function reminderWords(value){const verbs={добавить:'добавь',завести:'заведи',запланировать:'запланируй',создать:'создай',сделать:'сделай',поставить:'поставь',установить:'установи'};return String(value||'').trim().replace(/^(?:(?:эй|hey|пожалуйста|please|понги|pongy)(?:\s+ai)?[,!\s]+)+/iu,'').replace(/^(?:можешь|можете|могли бы вы)\s+/iu,'').replace(/^(добавить|завести|запланировать|создать|сделать|поставить|установить)(?=\s)/iu,v=>verbs[v.toLowerCase()]);}
function parseReminderDraft(value,{now=Date.now(),zone,locale='en'}={}){
 const numbers={две:2,два:2,три:3,четыре:4,пять:5,десять:10,пятнадцать:15,двадцать:20,тридцать:30};const raw=reminderWords(value).replace(/через\s+полтора\s+часа/giu,'через 90 минут').replace(/через\s+полчаса/giu,'через 30 минут').replace(/(через)\s+(две|два|три|четыре|пять|десять|пятнадцать|двадцать|тридцать)\s+/giu,(_,prefix,n)=>prefix+' '+numbers[n.toLowerCase()]+' '),relative=raw.match(/(?:через|\bin)\s+(?:(\d{1,4}|одну|один|a|an)\s*)?(минут[а-яё]*|час[а-яё]*|секунд[а-яё]*|minutes?|hours?|seconds?)/iu),clock=raw.match(/(?:\bat\s+|(?:^|\s)(?:в|на)\s*)(\d{1,2})[:.](\d{2})/iu);
 let validZone=false;try{if(zone){new Intl.DateTimeFormat('en',{timeZone:zone}).format();validZone=true;}}catch{};
 const ru=locale==='ru',daily=/(?:ежедневно|каждый день|\bdaily\b|\bevery day\b)/iu.test(raw);let due,fields,date,time;
 if(relative&&!daily){const n=/^\d+$/.test(relative[1])?Number(relative[1]):1,unit=relative[2];const ms=n*(/час|hour/iu.test(unit)?3600000:/секунд|second/iu.test(unit)?1000:60000);if(n>0&&ms<=366*86400000)due=now+ms;}
 const chosenZone=validZone?zone:'UTC';
 const local=t=>Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:chosenZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(t).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
 if(due){fields=local(due);date=fields.year+'-'+fields.month+'-'+fields.day;time=fields.hour+':'+fields.minute;}
 else if(clock&&validZone&&Number(clock[1])<24&&Number(clock[2])<60){fields=local(now);const d=new Date(Date.UTC(Number(fields.year),Number(fields.month)-1,Number(fields.day)));if(/послезавтра|day after tomorrow/iu.test(raw))d.setUTCDate(d.getUTCDate()+2);else if(/завтра|tomorrow/iu.test(raw))d.setUTCDate(d.getUTCDate()+1);date=d.toISOString().slice(0,10);time=clock[1].padStart(2,'0')+':'+clock[2];const iso=raw.match(/\b(20\d{2}-\d{2}-\d{2})\b/u),dmy=raw.match(/\b(\d{2})\.(\d{2})\.(20\d{2})\b/u);if(iso)date=iso[1];else if(dmy)date=dmy[3]+'-'+dmy[2]+'-'+dmy[1];else if(!daily&&!/сегодня|завтра|today|tomorrow/iu.test(raw)&&time<=fields.hour+':'+fields.minute){d.setUTCDate(d.getUTCDate()+1);date=d.toISOString().slice(0,10);}}
 if(!date&&validZone&&/сегодня|завтра|today|tomorrow/iu.test(raw)){fields=local(now);const day=new Date(Date.UTC(Number(fields.year),Number(fields.month)-1,Number(fields.day)));if(/завтра|tomorrow/iu.test(raw))day.setUTCDate(day.getUTCDate()+1);date=day.toISOString().slice(0,10);}
 const quoted=raw.match(/[«"„“']([^«»"“”']{1,300})[»"”']/u);
 let text=quoted?quoted[1].trim():raw.replace(/^(?:напомни(?:те)?(?: мне)?|(?:создай(?:те)?|сделай(?:те)?|поставь(?:те)?|установи(?:те)?)(?: мне)? напоминание|remind me|(?:set|create|make|add|schedule) (?:me )?(?:a )?reminder)\s*[:—,-]?\s*/iu,'');
 if(!quoted)text=text.replace(/(?:через|\bin)\s+(?:(?:\d{1,4}|одну|один|a|an)\s*)?(?:минут[а-яё]*|час[а-яё]*|секунд[а-яё]*|minutes?|hours?|seconds?)/giu,'').replace(/(?:\bat\s+|(?:^|\s)(?:в|на)\s*)\d{1,2}[:.]\d{2}/giu,' ').replace(/\b20\d{2}-\d{2}-\d{2}\b|\b\d{2}\.\d{2}\.20\d{2}\b/gu,'').replace(/(?:послезавтра|day after tomorrow|сегодня|завтра|ежедневно|каждый день|\btoday\b|\btomorrow\b|\bdaily\b|\bevery day\b)/giu,'').replace(/\s+/g,' ').replace(/^[\s,:-]+|[\s,:-]+$/g,'');
 return {text:text.slice(0,2000),mode:daily?'daily':'once',zone:chosenZone,locale:ru?'ru':'en',count:1,...(date?{date}:{}),...(time?{time}:{}),...(due?{dueAt:due}:{}),complete:!!(text&&time&&(daily||date))};
}

// Normalize spoken schedules before extracting the request; never infer a missing clock.
function reminderDraft(value,options={}) {
 const now=options.now??Date.now(),zone=options.zone||'UTC';let today;
 try{today=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));}catch{today={year:new Date(now).getUTCFullYear(),month:new Date(now).getUTCMonth()+1,day:new Date(now).getUTCDate()};}
 let input=reminderWords(value).replace(/^(?:можешь|можете|могли бы вы)\s+/iu,'').replace(/^(?:добавь(?:те)?|заведи(?:те)?|запланируй(?:те)?|установите|поставьте)(?: мне)?\s+напоминание/iu,'создай напоминание'),description='';const desc=input.match(/(?:^|[\s;,])(?:описание|подробности|description|details)\s*:\s*([\s\S]*)$/iu);
 if(desc){description=desc[1].trim().slice(0,2000);input=input.slice(0,desc.index).replace(/[;,\s]+$/u,'');}
 const day=new Date(Date.UTC(today.year,today.month-1,today.day)),iso=d=>d.toISOString().slice(0,10);
 input=input.replace(/через\s+(\d{1,3})\s+час(?:а|ов)?\s+(?:и\s+)?(\d{1,2})\s+минут[а-яё]*/giu,(_,h,m)=>'через '+(Number(h)*60+Number(m))+' минут');
 input=input.replace(/(?:через|in)\s+(\d{1,3})\s+(?:дн(?:я|ей)|days?)(?=\s|[,.!?]|$)/giu,(_,n)=>{const d=new Date(day);d.setUTCDate(d.getUTCDate()+Number(n));return iso(d)});
 const months={января:1,февраля:2,марта:3,апреля:4,мая:5,июня:6,июля:7,августа:8,сентября:9,октября:10,ноября:11,декабря:12};
 input=input.replace(/(?:на\s+)?(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)(?:\s+(20\d{2})(?:\s+года)?)?/giu,(_,d,m,y)=>{let year=Number(y)||today.year;if(!y&&(months[m.toLowerCase()]<today.month||months[m.toLowerCase()]===today.month&&Number(d)<today.day))year++;return year+'-'+String(months[m.toLowerCase()]).padStart(2,'0')+'-'+d.padStart(2,'0')});
 input=input.replace(/\b(\d{2})\.(\d{2})(?![.\d])/gu,(_,d,m)=>{let y=today.year;if(Number(m)<today.month||Number(m)===today.month&&Number(d)<today.day)y++;return y+'-'+m+'-'+d});
 const weekdays={понедельник:1,вторник:2,среду:3,четверг:4,пятницу:5,субботу:6,воскресенье:0};
 input=input.replace(/(?:в|на)\s+(?:следующ(?:ий|ую|ее)\s+)?(понедельник|вторник|среду|четверг|пятницу|субботу|воскресенье)(?=\s|[,.!?]|$)/giu,(_,name)=>{const d=new Date(day),delta=(weekdays[name.toLowerCase()]-d.getUTCDay()+7)%7||7;d.setUTCDate(d.getUTCDate()+delta);return iso(d)});
 input=input.replace(/(?:^|\s)в\s+(\d{1,2})(?:[:.](\d{2}))?\s*(утра|дня|вечера|ночи)(?=\s|[,.!?]|$)/giu,(_,h,m,period)=>{let n=Number(h);if(n<1||n>12)return _;if(/вечера|дня/iu.test(period)&&n<12)n+=12;if(/ночи|утра/iu.test(period)&&n===12)n=0;return ' в '+String(n).padStart(2,'0')+':'+(m||'00')});
 input=input.replace(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/giu,(_,h,m,p)=>{const n=Number(h);if(n<1||n>12)return _;return 'at '+String(n%12+(p.toLowerCase()==='pm'?12:0)).padStart(2,'0')+':'+(m||'00')});
 input=input.replace(/(^|\s)(?:в|на)\s+(\d{1,2})(?![\d:.])(?=\s|[,!?]|$)/giu,(_,space,h)=>space+'в '+h.padStart(2,'0')+':00');
 const count=input.match(/(\d{1,2})\s*(?:раз(?:а)?|times)(?=\s|[,.!?]|$)/iu);if(count)input=input.replace(count[0],'');
 input=input.replace(/(?:название|заголовок|title)\s*:\s*/giu,'');
 const result=parseReminderDraft(input,options);const explicit=input.match(/\b(20\d{2}-\d{2}-\d{2})\b/u);if(!result.date&&explicit)result.date=explicit[1];result.complete=!!(result.text&&result.time&&(result.mode==='daily'||result.date));if(description)result.description=description;if(result.mode==='daily'&&count)result.count=Number(count[1]);
 result.missing=[...(!result.text?['text']:[]),...(!result.time?['time']:[]),...(!result.date&&result.mode!=='daily'?['date']:[])];
 return result;
}

function reminderIntent(value){const s=reminderWords(value).replace(/^(?:можешь|можете|могли бы вы)\s+/iu,'');if(/^(?:(?:создай(?:те)?|сделай(?:те)?|поставь(?:те)?|установи(?:те)?|добавь(?:те)?|заведи(?:те)?|запланируй(?:те)?)(?: мне)? напоминание|(?:set|create|make|add|schedule) (?:me )?(?:a )?reminder)(?=\s|[,.!?:]|$)/iu.test(s))return true;if(!/^(?:напомни(?:те)?(?: мне)?|remind me)(?=\s|[,.!?:]|$)/iu.test(s))return false;if(/^(?:напомни(?:те)?(?: мне)?|remind me)[,\s]+(?:что (?:ты|вы|мы)|что такое|о ч[её]м (?:мы|ты)|свой|твой|предыдущ|последн|what|your|our|the previous)/iu.test(s))return false;return true;}
root.PongyReminderLanguage={reminderWords,reminderDraft,reminderIntent};
})(typeof window!=='undefined'?window:globalThis);
