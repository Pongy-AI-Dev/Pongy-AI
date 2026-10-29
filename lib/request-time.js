// The clock is server-owned. Only a validated IANA zone is accepted from the client.
export function requestTime(now=Date.now(),zone='UTC'){
 try{new Intl.DateTimeFormat('en',{timeZone:zone}).format(0);}catch{zone='UTC';}
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now));
 const v=Object.fromEntries(parts.map(p=>[p.type,p.value]));const today=`${v.year}-${v.month}-${v.day}`;
 const next=new Date(Date.UTC(+v.year,+v.month-1,+v.day+1)).toISOString().slice(0,10);
 return {now:new Date(now).toISOString(),timeZone:zone,today,tomorrow:next};
}
export function timeInstruction(now,zone){const t=requestTime(now,zone);return ' Server-verified calendar context: '+JSON.stringify(t)+'. Resolve today/tomorrow relative to this local date, not training data or publication dates. For forecasts and dated news, verify that the retrieved validity date and location match the requested date. If the requested forecast is unavailable, say so; do not substitute a past date. Explicit user dates take precedence over relative dates.';}
