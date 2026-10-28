import {reminderDraft,reminderWords} from './reminder-language.js';
const normalize=v=>String(v||'').toLocaleLowerCase().replace(/[«»"“”'.,!?]/gu,'').replace(/\s+/gu,' ').trim();
// Read schedules from this authenticated account only. Mutations are form proposals.
export function reminderConversation(prompt,records,{now=Date.now(),zone='UTC',locale='en'}={}){
 const p=reminderWords(prompt),ru=locale==='ru',say=(a,b)=>ru?a:b;
 const list=/^(?:(?:покажи|перечисли|список|какие|мои)(?:\s+(?:мои|все|активные|у меня))?\s+напоминани[яй]|(?:show|list)(?:\s+(?:my|all|active))?\s+reminders)[?.!\s]*$/iu.test(p);
 const action=/^(?:перенеси|перенести|отложи|измени|отмени|отменить|отключи|reschedule|postpone|edit|cancel|disable)\s+(?:мо[её]\s+)?(?:напоминание|reminder)\s*(.*)$/iu.exec(p);
 if(!list&&!action)return null;
 if(list){const lines=records.slice(0,100).map(r=>'- '+r.text+' — '+new Intl.DateTimeFormat(ru?'ru-RU':'en-GB',{timeZone:r.zone||zone,dateStyle:'short',timeStyle:'short'}).format(r.next_at)+' ('+(r.zone||zone)+') · '+say(r.enabled?'активно':r.completed_at?'выполнено':'отключено',r.enabled?'active':r.completed_at?'completed':'disabled'));
 return {text:lines.length?say('Сохранённые напоминания:\n','Saved reminders:\n')+lines.join('\n'):say('У вас пока нет сохранённых напоминаний.','You have no saved reminders yet.')};}
 const cancel=/^(?:отмен|отключ|cancel|disable)/iu.test(p),tail=action[1],quoted=tail.match(/[«“"]([^»”"]+)[»”"]/u)?.[1];
 const name=normalize(quoted||tail.replace(/\s+(?:на|в|через|at|in|tomorrow|завтра|сегодня|ежедневно)\s.*$/iu,'').replace(/^(?:на|в|через|at|in)\s.*$/iu,''));
 const active=records.filter(r=>r.enabled),matches=name?active.filter(r=>normalize(r.text)===name):active;
 if(matches.length!==1)return {text:say(matches.length?'Найдено несколько напоминаний. Укажите точное название в кавычках.':'Активное напоминание с таким названием не найдено. Напишите «покажи мои напоминания».',matches.length?'More than one reminder matches. Quote its exact title.':'No matching active reminder was found. Ask to list your reminders.')};
 const r=matches[0];if(cancel)return {form:{...r,operation:'cancel'},text:say('Открыл подтверждение отмены «'+r.text+'». До нажатия «Отменить напоминание» оно остаётся активным.','Confirm cancellation of “'+r.text+'” in the form. It remains active until you confirm.')};
 let schedule=quoted?tail.replace(/[«“"][^»”"]+[»”"]/u,''):tail.slice(name?tail.toLocaleLowerCase().indexOf(name)+name.length:0);
 schedule=schedule.replace(/^\s*(?:на\s+)?через/iu,'через');
 const draft=reminderDraft('создай напоминание '+schedule+' «'+r.text+'»',{now,zone:r.zone||zone,locale});
 if(!draft.time)return {text:say('Укажите новое время или интервал, например: перенеси напоминание «'+r.text+'» через 20 минут.','Specify a new time or interval, e.g. reschedule reminder “'+r.text+'” in 20 minutes.')};
 const form={...r,...draft,id:r.id,text:r.text,description:r.description||'',mode:r.mode,count:r.count,dueAt:draft.dueAt||null};
 return {form,text:say('Подготовил новое время для «'+r.text+'». Проверьте дату и время и подтвердите сохранение. Пока расписание не изменено.','The new time for “'+r.text+'” is ready. Review and save; the schedule has not changed yet.')};
}
