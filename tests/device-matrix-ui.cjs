'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {launchBrowser}=require('./browser.cjs');

(async()=>{
  const {createApp}=await import('../server.js');
  const {loadConfig}=await import('../lib/config.js');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pongy-device-matrix-'));
  const runtime=createApp({config:loadConfig({
    DATA_DIR:dir,
    JWT_SECRET:'device-matrix-jwt-'.repeat(4),
    SESSION_SECRET:'device-matrix-session-'.repeat(4),
    OPENROUTER_API_KEY:''
  },dir)});
  const server=await new Promise(resolve=>{
    const instance=runtime.app.listen(0,'127.0.0.1',()=>resolve(instance));
  });
  const browser=await launchBrowser(),page=await browser.newPage(),errors=[];
  const sizes=[
    ['phone-small',320,568],
    ['phone',390,844],
    ['phone-landscape',844,390],
    ['tablet-portrait',768,1024],
    ['tablet-landscape',1024,768],
    ['laptop',1366,768],
    ['desktop',1920,1080]
  ];
  let checks=0;
  const check=(value,message)=>{if(!value)throw Error(message);checks++;};
  page.on('pageerror',error=>errors.push(error.message));
  fs.mkdirSync('tests/artifacts',{recursive:true});
  try{
    const base='http://127.0.0.1:'+server.address().port;
    await page.goto(base,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>{const e=document.querySelector('#authScreen');return !!e&&getComputedStyle(e).display!=='none';},null,{timeout:15000});
    for(const [name,width,height] of sizes){
      await page.setViewportSize({width,height});
      await page.waitForTimeout(80);
      const metrics=await page.evaluate(()=>{
        const auth=document.querySelector('#authScreen'),box=auth?.querySelector('.auth-box'),r=box?.getBoundingClientRect();
        return {width:innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth,
          authVisible:!!auth&&getComputedStyle(auth).display!=='none',
          boxFits:!!r&&r.left>=-1&&r.right<=innerWidth+1};
      });
      check(metrics.authVisible,name+': sign-in screen is not visible');
      check(metrics.doc<=metrics.width+1&&metrics.body<=metrics.width+1,name+': horizontal overflow '+JSON.stringify(metrics));
      check(metrics.boxFits,name+': sign-in card is clipped '+JSON.stringify(metrics));
      await page.screenshot({path:'tests/artifacts/device-matrix-'+name+'.png'});
    }
    check(errors.length===0,'uncaught browser errors: '+errors.join('; '));
    console.log('Responsive viewport matrix passed:',checks,'assertions across',sizes.length,'sizes in',process.env.BROWSER_ENGINE||'chromium');
  }finally{
    await browser.close();
    server.closeAllConnections?.();
    await new Promise(resolve=>server.close(resolve));
    runtime.close();
    fs.rmSync(dir,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exitCode=1});
