'use strict';
// Test-side backoff only. Production limiters and authentication remain enabled.
async function withRateLimit(action, wait, {maxRetries=1,maxDelaySeconds=60}={}) {
 for(let attempt=0;;attempt++) {
  const response=await action();
  if(response.status()!==429)return response;
  if(attempt>=maxRetries)throw new Error('HTTP 429 persisted after the permitted Retry-After retry');
  const raw=response.headers()['retry-after'];
  if(typeof raw!=='string'||!/^\d+$/.test(raw)||Number(raw)>maxDelaySeconds)throw new Error('Invalid or excessive HTTP 429 Retry-After: '+String(raw));
  await wait((Number(raw)+1)*1000);
 }
}
module.exports={withRateLimit};
