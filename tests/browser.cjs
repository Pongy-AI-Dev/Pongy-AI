'use strict';
// Playwright selects its installed browser in CI. Local overrides are Chromium-only.
function getBrowserConfig(env=process.env){
 const name=env.BROWSER_ENGINE||'chromium';
 if(!['chromium','firefox','webkit'].includes(name))throw new Error('Unsupported BROWSER_ENGINE: '+name);
 const options={headless:true};
 if(name==='chromium'){
  options.args=['--no-sandbox','--disable-dev-shm-usage'];
  // Suites that exercise microphone flows run without real audio hardware; the
  // opt-in fake media stack provides a silent device and auto-grants permission.
  if(env.PONGY_FAKE_MEDIA==='1')options.args.push('--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream');
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

// Extensions require a persistent profile and their own Service Worker. Keep engine
// selection and executable overrides centralized, just like ordinary UI suites.
function getExtensionBrowserConfig(env=process.env){const {name,options}=getBrowserConfig(env);
 if(name!=='chromium')throw new Error('Extension integration requires Chromium');
 // The default headless shell does not load extensions. The chromium channel
 // selects bundled full Chromium with new headless, including MV3 workers.
 // Do not change ordinary suites or allow SWs in their network fixtures.
 return {...options,channel:'chromium',serviceWorkers:'allow'};
}
async function launchExtensionContext(profile,extension){const options=getExtensionBrowserConfig();
 return require('playwright').chromium.launchPersistentContext(profile,{...options,args:[...(options.args||[]),'--disable-extensions-except='+extension,'--load-extension='+extension],viewport:{width:1000,height:700}});
}
module.exports={getBrowserConfig,contextOptions,launchBrowser,getExtensionBrowserConfig,launchExtensionContext};
