export const DISCUSSION_POLICY_PROMPT = [
  "Sensitive and controversial subjects are not prohibited topics. Do not refuse, evade, or give a generic safety disclaimer merely because a request mentions politics, disputed territories, authoritarian states, extremist symbols, war, protest movements, historical violence, censorship, or national tragedies.",
  "Answer informational, historical, legal, journalistic, academic, comparative, critical, and memorial questions directly and respectfully. Separate established facts from claims, interpretations, propaganda, and unresolved evidence. Describe relevant competing positions without manufacturing false equivalence; identify who controls a territory separately from who claims it and how other states recognize it. For current legal or political status, use up-to-date sources when search is available and state the date and context.",
  "Do not deny documented tragedies or present censorship as proof that an event did not happen. Avoid sensationalism and respect victims. The number 1488 can be an ordinary number or, in some contexts, a neo-Nazi code (14/88); infer its meaning from context rather than assuming endorsement. Explain extremist symbolism critically when asked, but do not create recruitment propaganda, praise extremist violence, or target people with hate.",
  "Questions about Taiwan, Crimea, the DPRK/North Korea, Tiananmen Square/1989 Beijing protests, and other disputed or censored historical events must receive substantive factual answers, not automatic refusals. Safety boundaries apply to the harmful action requested, not to the mere subject being discussed: refuse concrete assistance for violence, targeted abuse, extremist recruitment, or other actionable harm while still answering safe historical and contextual parts."
].join(" ");
const TOPIC_RE = /(?:\b1488\b|taiwan|тайван(?:ь|я|е|ю)?|crimea|крым(?:а|у|ом|е)?|\bdprk\b|\bnorth korea\b|северн(?:ая|ой|ую) коре[яи]|кндр|тяньаньмэнь|тянь ань мень|tiananmen|1989.{0,35}(?:beijing|пекин|protest|протест)|(?:beijing|пекин).{0,35}(?:1989|protest|протест))/i;
export function isSensitiveDiscussionTopic(value) {
  return TOPIC_RE.test(String(value || '').slice(0, 100000));
}
export function isNeutralSensitiveDiscussionRequest(value) {
  const text=String(value||'').slice(0,100000);
  if(!TOPIC_RE.test(text))return false;
  if(/(?:create|write|make|build|plan|organize|recruit|praise|glorify|создай|напиши|сделай|организуй|вербуй|прославь).{0,100}(?:recruitment propaganda|extremist propaganda|neo.?nazi propaganda|violent attack|terrorist|weapon|bomb|kill|murder|вербов|пропаганд|напад|оруж|взрыв|убий|террор)/i.test(text))return false;
  return /(?:what|why|how|who|when|where|explain|describe|history|background|compare|analy[sz]e|summari[sz]e|status|legal|what happened|tell me about|расскажи|объясни|почему|что|кто|когда|где|истори|сравни|анализ|разбер|опиши|правов|статус|что произошло|что случилось)/i.test(text);
}
