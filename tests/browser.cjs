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
function contextOptions(options={}){return {serviceWorkers:'block',...options};}
async function launchBrowser(){const {name,options}=getBrowserConfig(),browser=await require('playwright')[name].launch(options);
 // Ordinary suites intercept network requests and inject fixtures. A controlling Service Worker
 // can bypass page.route after reload (especially WebKit), invalidating those checks.
 // The dedicated offline suite explicitly opts back in and verifies the real worker.
 const context=browser.newContext.bind(browser),page=browser.newPage.bind(browser);
 browser.newContext=opts=>context(contextOptions(opts));
 browser.newPage=opts=>page(contextOptions(opts));
 return browser;}

module.exports={getBrowserConfig,contextOptions,launchBrowser};
