'use strict';
// Playwright selects its installed browser in CI. Local overrides are Chromium-only.
function getBrowserConfig(env=process.env){
 const name=env.BROWSER_ENGINE||'chromium';
 if(!['chromium','firefox','webkit'].includes(name))throw new Error('Unsupported BROWSER_ENGINE: '+name);
 const options={headless:true};
 if(name==='chromium'){
  options.args=['--no-sandbox','--disable-dev-shm-usage'];
  if(!env.CI&&env.CHROMIUM_PATH)options.executablePath=env.CHROMIUM_PATH;
 }
 return {name,options};
}
function launchBrowser(){const {name,options}=getBrowserConfig();return require('playwright')[name].launch(options);}
module.exports={getBrowserConfig,launchBrowser};
