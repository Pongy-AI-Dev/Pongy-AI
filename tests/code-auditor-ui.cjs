'use strict';
const {launchBrowser}=require('./browser.cjs');
const path=require('node:path');
(async()=>{
 const browser=await launchBrowser();
 try{
  const page=await browser.newPage();
  await page.setContent('<main id="root"></main>');
  await page.addScriptTag({path:path.resolve('public/activity.js')});
  const result=await page.evaluate(()=>{
   const body=document.createElement('div');
   PongyActivity.render(body,[{type:'code_audit',status:'issues_found',count:3,summary:'Static source audit: 1 finding(s).',findings:[{level:'high',code:'possible_api_key',file:'src/config.js',line:4,message:'Possible credential detected; value withheld.'}]}],{ru:true});
   document.querySelector('#root').append(body);
   const card=body.querySelector('.activity-card');
   return {title:card.querySelector('.activity-heading strong').textContent,state:card.dataset.state,detail:card.textContent};
  });
  if(result.title!=='Аудит исходного кода'||result.state!=='failed'||!result.detail.includes('src/config.js:4')||!result.detail.includes('value withheld'))throw new Error('Code audit activity card did not render its bounded finding: '+JSON.stringify(result));
  console.log('Code-audit activity UI assertions passed: 4');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
