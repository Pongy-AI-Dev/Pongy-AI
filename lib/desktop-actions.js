// The server can only propose an allowlisted action. The host asks the user before launch.
export const DESKTOP_APPS=Object.freeze(['notepad','calculator','explorer']);
export function desktopAction(prompt,capabilities){
 if(!Array.isArray(capabilities))return null;const text=String(prompt||'');
 if(!/(?:открой|запусти|включи|open|launch|start)/iu.test(text)||/(?:не\s+(?:открывай|запускай)|do not|don't|как\s+|how\s+)/iu.test(text))return null;
 const matches=[['notepad',/(?:блокнот|notepad)/iu],['calculator',/(?:калькулятор|calculator)/iu],['explorer',/(?:проводник|file explorer)/iu]].filter(([id,re])=>capabilities.includes(id)&&re.test(text));
 return matches.length===1?{app:matches[0][0]}:null;
}
