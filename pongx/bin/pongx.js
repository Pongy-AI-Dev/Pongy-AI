#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import readline from 'node:readline';
import {Writable} from 'node:stream';
import {spawnSync} from 'node:child_process';

const VERSION='0.1.0';
const ORIGIN=(process.env.PONGY_ORIGIN||'https://pongy-ai.devs.surf').replace(/\/+$/,'');
const APP_DIR=path.join(process.env.APPDATA||path.join(os.homedir(),'AppData','Roaming'),'PongX');
const AUTH_FILE=path.join(APP_DIR,'auth.dat');
const BACKUP_DIR=path.join(APP_DIR,'backups');
const SKIP_DIRS=new Set(['.git','node_modules','dist','build','.next','.venv','venv','coverage','.pongx','.idea','.vs']);
const MAX_CONTEXT=100000,MAX_FILE=1000000,MAX_CHANGES=20;
const ansi=process.stdout.isTTY,ESC=String.fromCharCode(27),NL=String.fromCharCode(10);
const c=(code,s)=>ansi?ESC+'['+code+'m'+s+ESC+'[0m':s;
const cyan=s=>c('36;1',s),green=s=>c('32;1',s),yellow=s=>c('33;1',s),red=s=>c('31;1',s),muted=s=>c('90',s);
let activeReadline=null;const ask=async prompt=>{if(activeReadline)return activeReadline.question(prompt);const rl=readline.createInterface({input:process.stdin,output:process.stdout});try{return await rl.question(prompt)}finally{rl.close()}};
async function askSecret(prompt){
 process.stdout.write(prompt);
 const sink=new Writable({write(_chunk,_encoding,done){done()}});
 const rl=readline.createInterface({input:process.stdin,output:sink,terminal:false});
 try{return await rl.question('')}finally{rl.close();process.stdout.write(NL)}
}
function powershell(script,input){
 const result=spawnSync('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command',script],{input,encoding:'utf8',windowsHide:true,maxBuffer:1024*1024,timeout:15000});
 if(result.error||result.status!==0)throw new Error('Windows DPAPI is unavailable. Use PONGY_API_KEY for this session.');
 return String(result.stdout||'').trim();
}
function protect(value){
 if(process.platform!=='win32')throw new Error('Secure local storage is currently supported on Windows only.');
 return powershell("$plain=[Console]::In.ReadToEnd(); $secure=ConvertTo-SecureString -String $plain -AsPlainText -Force; $secure | ConvertFrom-SecureString",value);
}
function unprotect(value){
 if(process.platform!=='win32')throw new Error('Secure local storage is currently supported on Windows only.');
 return powershell("$encrypted=[Console]::In.ReadToEnd().Trim(); $secure=ConvertTo-SecureString -String $encrypted; $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure); try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }",value);
}
function saveCredential(value){
 fs.mkdirSync(APP_DIR,{recursive:true});
 const encrypted=protect(JSON.stringify(value)),temp=AUTH_FILE+'.tmp';
 fs.writeFileSync(temp,encrypted+NL,{encoding:'utf8',mode:0o600});fs.renameSync(temp,AUTH_FILE);
}
function loadCredential(){
 if(process.env.PONGY_API_KEY)return {token:process.env.PONGY_API_KEY,endpoint:process.env.PONGY_API_ENDPOINT||ORIGIN+'/v1/chat/completions'};
 if(!fs.existsSync(AUTH_FILE))return null;
 try{return JSON.parse(unprotect(fs.readFileSync(AUTH_FILE,'utf8')))}catch{throw new Error('Cannot unlock the saved credential for this Windows account. Run "pongx login" again.')}
}
async function login(){
 console.log(cyan(NL+'PongX · secure account connection'));
 const origin=(await ask('Pongy address ['+ORIGIN+']: ')).trim().replace(/\/+$/,'')||ORIGIN;
 const email=(await ask('Email: ')).trim();if(!email)throw new Error('Email is required.');
 const password=await askSecret('Password (hidden): ');
 const response=await fetch(origin+'/api/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email,password}),signal:AbortSignal.timeout(45000)});
 const body=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(body.error||body.message||'Sign-in failed. Check the account and email verification.');
 const setCookies=response.headers.getSetCookie?.()||[response.headers.get('set-cookie')||''];
 const cookie=setCookies.map(x=>x.split(';')[0]).filter(Boolean).join('; ');
 if(!cookie)throw new Error('The server did not issue a session cookie.');
 const statusResponse=await fetch(origin+'/api/api-key',{headers:{Origin:origin,Cookie:cookie},signal:AbortSignal.timeout(30000)});
 if(!statusResponse.ok)throw new Error('Could not check API-key status.');
 const status=await statusResponse.json();
 const confirmation=status.connected?'An API key already exists. Rotating it invalidates other integrations. Rotate now? [y/N]: ':'Create a Pongy API key for PongX? [y/N]: ';
 const answer=(await ask(confirmation)).trim().toLowerCase();
 if(!['y','yes','да'].includes(answer)){console.log(yellow('No key was created or changed. You can use PONGY_API_KEY to connect an existing key.'));return;}
 const keyResponse=await fetch(origin+'/api/api-key',{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(30000)});
 const key=await keyResponse.json().catch(()=>({}));
 if(!keyResponse.ok||typeof key.token!=='string'||typeof key.endpoint!=='string')throw new Error(key.error||'The server could not issue an API key.');
 saveCredential({token:key.token,endpoint:key.endpoint,origin:origin,createdAt:Date.now()});
 console.log(green('Connected. A new Pongy API key was created and encrypted with Windows DPAPI.'));
 console.log(muted('The password was not saved. The key is stored for this Windows user only.'));
}
function logout(){
 if(fs.existsSync(AUTH_FILE))fs.unlinkSync(AUTH_FILE);
 console.log(green('Local PongX credentials removed.'));
 console.log(muted('The server key remains active. Revoke it in Pongy settings if you no longer need it.'));
}
function inside(root,full){const rel=path.relative(root,full);return rel===''||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel))}
function sensitive(rel){
 const parts=rel.split(path.sep).map(x=>x.toLowerCase()),name=parts.at(-1)||'';
 return parts.some(x=>['.git','node_modules','.env','.secrets','secrets','credentials','.ssh'].includes(x))||name.startsWith('.env.')||['id_rsa','id_ed25519'].includes(name)||['.pem','.key','.p12','.pfx'].some(x=>name.endsWith(x))||name.includes('credentials')||name.includes('secrets');
}
function safePath(root,relative){
 if(typeof relative!=='string'||!relative.trim()||relative.includes(String.fromCharCode(0))||path.isAbsolute(relative))throw new Error('Use a relative path inside the selected project.');
 const full=path.resolve(root,relative);if(!inside(root,full))throw new Error('Path is outside the selected project.');
 const rel=path.relative(root,full);if(sensitive(rel))throw new Error('PongX will not access credentials, hidden VCS data or dependency folders.');
 let current=root;for(const part of rel.split(path.sep).filter(Boolean)){current=path.join(current,part);if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw new Error('Symbolic links are not allowed in the workspace.');}
 return full;
}
let workspace=null,history=[],included=new Map();
function setWorkspace(input){
 const target=path.resolve(input||process.cwd());if(!fs.existsSync(target)||!fs.statSync(target).isDirectory())throw new Error('Workspace folder does not exist.');
 workspace=fs.realpathSync(target);included.clear();history=[];console.log(green('Workspace: ')+workspace);
}
function walk(root,dir=root,out=[]){
 if(out.length>=120)return out;
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  if(out.length>=120)break;if(entry.name.startsWith('.')&&entry.name!=='.github')continue;
  if(entry.isDirectory()){if(!SKIP_DIRS.has(entry.name.toLowerCase()))walk(root,path.join(dir,entry.name),out);continue;}
  if(!entry.isFile())continue;
  const rel=path.relative(root,path.join(dir,entry.name));if(sensitive(rel))continue;
  try{if(fs.statSync(path.join(root,rel)).size<=MAX_FILE)out.push(rel.split(path.sep).join('/'))}catch{}
 }
 return out;
}
function files(){
 if(!workspace){console.log(yellow('Choose a project first: /open <folder>'));return;}
 const rows=walk(workspace);console.log(cyan(NL+'Project files'));
 if(!rows.length)console.log(muted('(no readable files found)'));for(const row of rows)console.log('  '+row);console.log(muted(NL+'Showing up to 120 files.'));
}
function includeFile(rel){
 if(!workspace)throw new Error('Open a project first with /open <folder>.');
 const full=safePath(workspace,rel);if(!fs.existsSync(full)||!fs.statSync(full).isFile())throw new Error('File not found.');
 if(fs.statSync(full).size>50000)throw new Error('Files over 50 KB are not added to AI context.');
 if(included.size>=6&&!included.has(rel))throw new Error('Context is limited to six selected files.');
 const text=fs.readFileSync(full,'utf8');if(text.includes(String.fromCharCode(0)))throw new Error('Binary files are not added as text context.');
 included.set(rel,text);console.log(green('Added to context: ')+rel);return text;
}
function projectContext(){
 if(!workspace)return 'No local workspace is selected.';
 const tree=walk(workspace),parts=['Workspace: '+workspace,'Files:'+NL+tree.join(NL)];let used=0;
 for(const [rel,text] of included){const chunk=NL+NL+'--- '+rel+' ---'+NL+text;if(used+chunk.length>MAX_CONTEXT)break;parts.push(chunk);used+=chunk.length;}
 return parts.join(NL);
}
function backupRoot(){return path.join(BACKUP_DIR,String(Date.now())+'-'+crypto.randomBytes(3).toString('hex'))}
function preview(oldText,newText){
 const oldLines=oldText.replaceAll(String.fromCharCode(13),'').split(NL),newLines=newText.replaceAll(String.fromCharCode(13),'').split(NL);
 const removed=oldLines.filter((line,i)=>newLines[i]!==line).slice(0,4),added=newLines.filter((line,i)=>oldLines[i]!==line).slice(0,4);
 return [...removed.map(x=>red('- '+x)),...added.map(x=>green('+ '+x))].join(NL);
}
async function applyChanges(changes){
 if(!workspace)throw new Error('Open a workspace before applying changes.');
 if(!Array.isArray(changes)||!changes.length||changes.length>MAX_CHANGES)throw new Error('The proposal must contain between 1 and '+MAX_CHANGES+' files.');
 const plan=[];
 for(const item of changes){
  if(!item||typeof item.path!=='string'||typeof item.content!=='string'||Buffer.byteLength(item.content)>MAX_FILE)throw new Error('Invalid or oversized file change.');
  const full=safePath(workspace,item.path),exists=fs.existsSync(full);if(exists&&!fs.statSync(full).isFile())throw new Error('Only regular files can be changed: '+item.path);
  plan.push({path:item.path,content:item.content,old:exists?fs.readFileSync(full,'utf8'):'',exists});
 }
 console.log(cyan(NL+'Proposed changes'));
 for(const item of plan){console.log((item.exists?'  ~ ':'  + ')+item.path);const diff=preview(item.old,item.content);if(diff)console.log(diff.split(NL).map(x=>'    '+x).join(NL));}
 const answer=(await ask(yellow(NL+'Apply these changes to the selected project? [y/N]: '))).trim().toLowerCase();
 if(!['y','yes','да'].includes(answer)){console.log(muted('Changes discarded.'));return;}
 const backup=backupRoot();fs.mkdirSync(backup,{recursive:true});const manifest=[];
 try{
  for(const item of plan){
   const full=safePath(workspace,item.path);fs.mkdirSync(path.dirname(full),{recursive:true});
   if(item.exists){const saved=path.join(backup,item.path);fs.mkdirSync(path.dirname(saved),{recursive:true});fs.copyFileSync(full,saved);}
   const temp=full+'.pongx-'+crypto.randomBytes(3).toString('hex')+'.tmp';fs.writeFileSync(temp,item.content,{encoding:'utf8'});fs.renameSync(temp,full);
   manifest.push({path:item.path,existed:item.exists});
  }
  fs.writeFileSync(path.join(backup,'manifest.json'),JSON.stringify({workspace,files:manifest},null,2),'utf8');
 }catch(error){
  for(const item of manifest.reverse()){const full=safePath(workspace,item.path);if(item.existed)fs.copyFileSync(path.join(backup,item.path),full);else if(fs.existsSync(full))fs.unlinkSync(full);}
  throw error;
 }
 console.log(green('Applied '+plan.length+' file change(s).'));console.log(muted('Backup saved outside the project: '+backup));
}
async function undo(){
 if(!workspace)throw new Error('Open the project first.');if(!fs.existsSync(BACKUP_DIR)){console.log(yellow('No backup to undo.'));return;}
 for(const dir of fs.readdirSync(BACKUP_DIR).sort().reverse()){
  const base=path.join(BACKUP_DIR,dir),file=path.join(base,'manifest.json');if(!fs.existsSync(file))continue;
  const manifest=JSON.parse(fs.readFileSync(file,'utf8'));if(path.resolve(manifest.workspace)!==workspace)continue;
  for(const item of [...manifest.files].reverse()){const full=safePath(workspace,item.path);if(item.existed){fs.mkdirSync(path.dirname(full),{recursive:true});fs.copyFileSync(path.join(base,item.path),full);}else if(fs.existsSync(full))fs.unlinkSync(full);}
  fs.rmSync(base,{recursive:true,force:true});console.log(green('Last PongX change set reverted.'));return;
 }
 console.log(yellow('No backup exists for this workspace.'));
}
function resolveNpmCli(){
 const candidates=[process.env.npm_execpath,path.join(path.dirname(process.execPath),'node_modules','npm','bin','npm-cli.js'),path.resolve(path.dirname(process.execPath),'..','lib','node_modules','npm','bin','npm-cli.js')];
 const cli=candidates.find(value=>typeof value==='string'&&value.trim()&&path.basename(value).toLowerCase()==='npm-cli.js'&&fs.existsSync(value));
 if(!cli)throw new Error('npm CLI could not be located. Install Node.js with npm and reopen the terminal.');
 return cli;
}
async function runTests(){
 if(!workspace)throw new Error('Open a project first.');const pkg=path.join(workspace,'package.json');if(!fs.existsSync(pkg))throw new Error('No package.json found in this project.');
 const scripts=JSON.parse(fs.readFileSync(pkg,'utf8')).scripts||{},tasks=['test','check'].filter(name=>typeof scripts[name]==='string');if(!tasks.length)throw new Error('This project has no npm test or check script.');
 if(!['y','yes','да'].includes((await ask('Run '+tasks.map(x=>'npm run '+x).join(' and ')+'? [y/N]: ')).trim().toLowerCase()))return;
 const npmCli=resolveNpmCli();
 for(const task of tasks){console.log(cyan(NL+'> npm run '+task));const result=spawnSync(process.execPath,[npmCli,'run',task],{cwd:workspace,stdio:'inherit',shell:false});if(result.error)throw result.error;if(result.status!==0){console.log(red('Test command failed: '+task));return;}}
 console.log(green('Project checks completed successfully.'));
}
const SYSTEM='You are PongX, the coding assistant inside the user-selected local project. Work only inside the supplied workspace. Never ask to read or change passwords, API keys, .env files, credentials, private keys, .git data or dependency folders. Never claim that you ran commands. Do not execute shell commands. When a code change is needed, return ONLY valid JSON with this exact shape: {"message":"short explanation","changes":[{"path":"relative/path","content":"complete new file content"}]}. Use forward-slash relative paths. Keep paths inside the workspace. Do not return partial patches; provide complete file contents. If no file changes are needed, return {"message":"answer","changes":[]}.';
async function askAI(prompt,credential){
 const messages=[{role:'system',content:SYSTEM+NL+NL+projectContext()},...history.slice(-8),{role:'user',content:prompt}];
 const response=await fetch(credential.endpoint,{method:'POST',headers:{Authorization:'Bearer '+credential.token,'Content-Type':'application/json'},body:JSON.stringify({model:'standard',reasoningLevel:'high',locale:'ru',stream:false,messages}),signal:AbortSignal.timeout(120000)});
 const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error?.message||data.error?.code||'Pongy request failed ('+response.status+').');
 const answer=data.choices?.[0]?.message?.content;if(typeof answer!=='string'||!answer.trim())throw new Error('Pongy returned an empty response.');return answer.trim();
}
function proposal(text){
 const marker=String.fromCharCode(96).repeat(3),start=text.indexOf(marker),end=start<0?-1:text.indexOf(marker,start+3),raw=start>=0&&end>start?text.slice(start+3,end).replace(/^json/i,'').trim():text;
 try{const value=JSON.parse(raw);if(value&&typeof value.message==='string'&&Array.isArray(value.changes))return value;}catch{}
 return null;
}
async function chat(prompt,credential){
 history.push({role:'user',content:prompt});if(history.length>40)history.splice(0,history.length-40);const answer=await askAI(prompt,credential);history.push({role:'assistant',content:answer});if(history.length>40)history.splice(0,history.length-40);
 const value=proposal(answer);if(!value){console.log(NL+answer);return;}console.log(NL+value.message);if(value.changes.length)await applyChanges(value.changes);
}
function help(){
 console.log(cyan(NL+'PongX commands'));
 console.log('  /open <folder>   Select a project folder');
 console.log('  /new <folder>    Create and select a new folder here');
 console.log('  /files           List readable project files');
 console.log('  /read <file>     Add a text file to AI context');
 console.log('  /clear           Clear chat and selected file context');
 console.log('  /undo            Revert the last applied change set');
 console.log('  /test            Run npm test/check scripts after confirmation');
 console.log('  /help            Show this help');
 console.log('  /quit            Exit PongX');
}
async function repl(){
 const credential=loadCredential();if(!credential){console.log(yellow('Not connected. Run "pongx login" first.'));return;}
 console.log(cyan(NL+'PongX '+VERSION+' · local project agent'));console.log(muted('AI edits are previewed, require confirmation and can be undone.'));
 const rl=readline.createInterface({input:process.stdin,output:process.stdout,terminal:true});activeReadline=rl;
 try{
  while(true){
   let prompt;try{prompt=await rl.question(cyan(NL+'pongx')+(workspace?muted(' ['+path.basename(workspace)+']'):'')+'> ')}catch{break;}if(typeof prompt!=='string')break;const line=prompt.trim();if(!line)continue;
   if(line==='/quit'||line==='/exit')break;if(line==='/help'){help();continue;}if(line==='/files'){files();continue;}
   if(line==='/clear'){history=[];included.clear();console.log(green('Chat and selected file context cleared.'));continue;}
   if(line==='/undo'){try{await undo()}catch(error){console.log(red('PongX: '+error.message))}continue;}if(line==='/test'){try{await runTests()}catch(error){console.log(red('PongX: '+error.message))}continue;}
   if(line.startsWith('/open ')){try{setWorkspace(line.slice(6).trim())}catch(error){console.log(red('PongX: '+error.message))}continue;}
   if(line.startsWith('/new ')){try{const name=line.slice(5).trim();if(!name||path.isAbsolute(name)||name.split(path.sep).includes('..'))throw new Error('Choose a simple folder name inside the current directory.');const target=path.resolve(process.cwd(),name);fs.mkdirSync(target,{recursive:false});setWorkspace(target)}catch(error){console.log(red('PongX: '+error.message))}continue;}
   if(line.startsWith('/read ')){try{const rel=line.slice(6).trim(),text=includeFile(rel);console.log(NL+text.slice(0,12000))}catch(error){console.log(red('PongX: '+error.message))}continue;}
   try{await chat(line,credential)}catch(error){const timed=error&&['AbortError','TimeoutError'].includes(error.name);console.log(red('PongX: '+(timed?'The request timed out. Check your connection and try again.':error.message))) }
  }
 }finally{activeReadline=null;rl.close()}
}
async function main(){
 const command=process.argv[2]||'';
 if(command==='login'){await login();return;}if(command==='logout'){logout();return;}
 if(command==='--version'||command==='-v'){console.log('PongX '+VERSION);return;}
 if(command==='--help'||command==='help'){help();console.log(NL+'Use "pongx login" to connect your Pongy account.');return;}
 if(command==='open'){setWorkspace(process.argv[3]||process.cwd());await repl();return;}
 await repl();
}
main().catch(error=>{const timed=error&&['AbortError','TimeoutError'].includes(error.name);console.error(red('PongX: '+(timed?'The request timed out. Check your connection and try again.':error.message)));process.exitCode=1});
