const {launchBrowser}=require('./browser.cjs');
const fs=require('fs'),path=require('path'),os=require('os');
(async()=>{
 const {createApp}=await import('../server.js'),{loadConfig}=await import('../lib/config.js'),bcrypt=(await import('bcryptjs')).default;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pongy-brand-ui-')),out=path.resolve('tests/artifacts');fs.mkdirSync(out,{recursive:true});let count=0;
 const runtime=createApp({config:loadConfig({DATA_DIR:dir,OPENROUTER_API_KEY:'fixture-key',JWT_SECRET:'fixture-jwt-secret-'.repeat(3),SESSION_SECRET:'fixture-session-secret-'.repeat(3)},dir),fetchImpl:async()=>Response.json({data:[]})});
 runtime.db.prepare('INSERT INTO users(email,password,email_verified) VALUES(?,?,1)').run('fixture@example.test',bcrypt.hashSync('fixture-password',4));
 const server=await new Promise(r=>{const s=runtime.app.listen(0,'127.0.0.1',()=>r(s))}),base='http://127.0.0.1:'+server.address().port;
 const browser=await launchBrowser();
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 await context.addInitScript(()=>{window.brandViolations=[];document.addEventListener('securitypolicyviolation',e=>window.brandViolations.push({directive:e.effectiveDirective,blocked:e.blockedURI,source:e.sourceFile,line:e.lineNumber}));});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const logo=async selector=>{await page.locator(selector).waitFor({state:'visible'});await page.waitForFunction(s=>{const img=document.querySelector(s);return img.complete&&img.naturalWidth===(s.indexOf('.big-logo')===0?256:512)},selector);await page.locator(selector).evaluate(async img=>{const pending=[];for(let el=img;el;el=el.parentElement)for(const animation of el.getAnimations())if(animation.effect.getComputedTiming().iterations!==Infinity)pending.push(animation.finished.catch(()=>{}));await Promise.all(pending)});const data=await page.locator(selector).evaluate(img=>({src:img.getAttribute('src'),width:img.getBoundingClientRect().width,height:img.getBoundingClientRect().height}));if(data.src!==(selector.indexOf('.big-logo')===0?'/welcome-logo.png':'/favicon.png')||Math.abs(data.width-data.height)>.5||data.width<20)throw Error('incorrect brand '+selector);count++;};
 const shot=async name=>{await page.waitForTimeout(300);await page.screenshot({path:out+'/'+name+'.png'});const html=await page.evaluate(()=>document.documentElement.outerHTML);fs.writeFileSync(out+'/'+name+'.html',html.replace(/<script[^>]*>[\s\S]*?<\/script>/g,'').replaceAll('href="/app.css?v=0.18.4"','href="'+path.resolve('public/app.css')+'"').replaceAll('src="/favicon.png"','src="'+path.resolve('public/favicon.png')+'"').replaceAll('src="/welcome-logo.png"','src="'+path.resolve('public/welcome-logo.png')+'"'));};
 try{
  await page.goto(base);await page.waitForFunction(()=>!document.querySelector('#authBtn').disabled);await logo('#authLogo img');await shot('branding-login-desktop');
  if(await page.locator('link[rel="icon"][type="image/png"]').getAttribute('href')!=='/favicon.png')throw Error('tab favicon mismatch');count++;
  await page.locator('#eyeAuth').click();await page.locator('#eyeAuth').click();await page.locator('#authEmail').fill('fixture@example.test');await page.locator('#authPassword').fill('fixture-password');await page.locator('#authBtn').click();await page.waitForFunction(()=>!document.body.classList.contains('booting')&&!document.querySelector('#authScreen').classList.contains('show')&&!document.querySelector('#userInput').disabled);
  await logo('#logoTop img');await logo('.big-logo img');if(!(await page.locator('.welcome p').textContent()).includes('How can I help?'))throw Error('welcome not neutral');count++;if(!await page.locator('.big-logo').evaluate(el=>{const s=getComputedStyle(el);return s.backgroundColor==='rgba(0, 0, 0, 0)'&&s.boxShadow==='none'&&parseFloat(s.borderTopWidth)===0}))throw Error('welcome logo has backdrop or border');count++;await shot('branding-welcome-desktop');
  for(const [open,close] of [['#settingsBtn','#closeSettings'],['#guideBtn','#closeGuide'],['#upgradeBtn','#closeSub']]){await page.locator(open).click();await page.locator(close).click();await page.waitForTimeout(200);count++;}
  if((await page.evaluate(()=>window.brandViolations)).length)throw Error(JSON.stringify(await page.evaluate(()=>window.brandViolations)));count++;
  await page.reload();await page.waitForFunction(()=>!document.body.classList.contains('booting')&&!document.querySelector('#authScreen').classList.contains('show')&&!document.querySelector('#userInput').disabled);await logo('.big-logo img');
  await page.setViewportSize({width:390,height:844});await shot('branding-welcome-mobile');await logo('.big-logo img');if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('mobile overflow');count++;
  await page.evaluate(()=>document.body.classList.add('dark'));await shot('branding-welcome-dark');
  if(errors.length||(await page.evaluate(()=>window.brandViolations)).length)throw Error(JSON.stringify({errors,violations:await page.evaluate(()=>window.brandViolations)}));count++;
  // Negative security test runs only AFTER ordinary-workflow checks. Deliberate forbidden evaluation must fail.
  await page.route(base+'/csp-probe.js',route=>route.fulfill({contentType:'application/javascript',body:"try{new Function('return 42')();window.probeBlocked=false}catch(e){window.probeBlocked=e.name==='EvalError'}"}));
  await page.evaluate(()=>{const script=document.createElement('script');script.src='/csp-probe.js';document.head.appendChild(script)});await page.waitForFunction(()=>typeof window.probeBlocked==='boolean');
  if(!await page.evaluate(()=>window.probeBlocked))throw Error('CSP string evaluation not blocked');count++;
  console.log('Branding/CSP UI assertions passed: '+count);
 }finally{await browser.close();await new Promise(r=>server.close(r));runtime.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exit(1)});
