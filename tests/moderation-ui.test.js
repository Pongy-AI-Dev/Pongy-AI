import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const server=read('server.js'),moderation=read('lib/moderation.js'),ui=read('public/settings-panel.js'),app=read('public/app.js'),css=read('public/app.css'),terms=read('public/terms.html'),privacy=read('public/privacy.html');

test('developer moderation endpoints are protected and user access is enforced server-side',()=>{
 assert.match(server,/\/api\/admin\/moderation\/reports',auth,developer/);
 assert.match(server,/\/api\/admin\/users\/:id\/details',auth,developer/);
 assert.match(server,/\/api\/admin\/users\/:id\/actions',auth,developer/);
 assert.match(server,/\/api\/moderation\/appeal',auth/);
 assert.match(server,/moderation\.access\(user\.id\)/);
});
test('developer user row expands to Details and Actions, with report state picker and readonly report text',()=>{
 assert.match(ui,/admin-user-action-bar/);
 assert.match(ui,/tr\("Сведения","Details"\)/);
 assert.match(ui,/tr\("Действия","Actions"\)/);
 assert.match(ui,/reportBox\.readOnly=true/);
 assert.match(ui,/accepted.*Согласие/);
 assert.match(ui,/investigation.*Разбирательства/);
 assert.match(ui,/rejected.*Отказ/);
 assert.match(ui,/admin-report-status-menu/);
});
test('warnings, automatic third-warning ban, revocation and appeals are exposed to users and developers',()=>{
 assert.match(ui,/Активных предупреждений/);
 assert.match(ui,/Подать апелляцию/);
 assert.match(ui,/moderation\/my-actions/);
 assert.match(ui,/moderation\/appeal/);
 assert.match(ui,/moderation\/actions\//);
 assert.match(moderation,/settings=developer&report=/);
 assert.match(app,/openModerationReport\(report\)/);
});
test('moderation workspace adapts to narrow screens and the terms/privacy pages disclose the workflow',()=>{
 assert.match(css,/\.admin-user-dialog/);
 assert.match(css,/@media\(max-width:620px\)/);
 assert.match(terms,/3\.1\. Правила сообщества и модерация/);
 assert.match(terms,/гипноз-промпты/);
 assert.match(privacy,/2\.1\. Модерация и обращения по правилам/);
});
