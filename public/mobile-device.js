(function(){'use strict';
const native=()=>window.PongyNative?.platform==='android'&&window.PongyAndroid;
const ru=()=>document.documentElement.lang==='ru';
const say=(r,e)=>ru()?r:e;
const bridge=(method,...args)=>{try{return window.PongyAndroid[method](...args)}catch{return null}};
const norm=value=>String(value||'').toLocaleLowerCase().replace(/ё/g,'е').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const aliases={саша:['александр','александра'],саше:['александр','александра'],александр:['саша'],александру:['александр'],александра:['саша'],алеша:['алексей'],алеше:['алексей'],алексей:['алеша'],алексею:['алексей'],женя:['евгений','евгения'],жене:['евгений','евгения'],евгений:['женя'],евгения:['женя'],дима:['дмитрий'],диме:['дмитрий'],дмитрий:['дима'],дмитрию:['дмитрий'],маша:['мария'],маше:['мария'],мария:['маша'],марии:['мария'],никита:['никит'],никите:['никит'],мама:['мам','мама','мамочка'],маме:['мам','мама','мамочка']};
function findContact(query){if(bridge('contactPermission')!=='granted'){
 if(!confirm(say('Для поиска контакта Pongy нужен доступ к именам и номерам на этом устройстве. Адресная книга не отправляется ИИ или на сервер. Разрешить доступ?','To find a contact Pongy needs access to names and phone numbers on this device. Your address book is not sent to AI or the server. Allow access?')))return say('Доступ к контактам не предоставлен.','Contacts access was not granted.');
 bridge('requestContacts');return say('Подтвердите системное разрешение и повторите запрос.','Approve the Android permission and repeat the request.');}
 const terms=norm(query).split(' ').filter(word=>word.length>=2);if(!terms.length)return say('Уточните имя контакта.','Specify a contact name.');
 const first=[terms[0],...(aliases[terms[0]]||[])];if(typeof window.PongyAndroid.findContactsV2==='function')bridge('findContactsV2',JSON.stringify({first,remaining:terms.slice(1)}));else bridge('findContacts',aliases[terms[0]]?.[0]||terms[0]);return say('Выберите контакт и номер в системном окне. Звонок начнётся только после подтверждения в звонилке.','Choose a contact and number in the Android dialog. A call starts only after you confirm it in the dialer.');}
function launch(query){const wanted=norm(query);if(wanted.length<2)return say('Назовите приложение.','Name an app.');bridge('findApps',wanted);return say('Выберите приложение в системном окне и подтвердите запуск.','Choose an app in the Android dialog and confirm launch.');}
function handle(text){if(!native()||typeof text!=='string'||text.length>160)return null;let match=text.trim().match(/^(?:понги[,!]?\s*)?(?:позвони|набери|call)\s+(?:контакту\s+|to\s+)?(.+)$/iu);if(match)return findContact(match[1]);match=text.trim().match(/^(?:понги[,!]?\s*)?(?:открой|запусти|open|launch)\s+(?:приложение\s+|app\s+)?(.+)$/iu);if(match)return launch(match[1]);return null;}
window.PongyMobileDevice=Object.freeze({handle});
})();
