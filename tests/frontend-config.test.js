import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync(new URL('../public/app-config.js',import.meta.url),'utf8');
test('static site uses confirmed Render API',()=>{const context={window:{},location:{hostname:'pongy-ai.devs.surf'}};vm.runInNewContext(code,context);assert.equal(context.window.PONGY_CONFIG.apiUrl,'https://pongy-server.onrender.com');});
test('localhost stays same-origin without contacting production',()=>{const context={window:{},location:{hostname:'localhost'}};vm.runInNewContext(code,context);assert.equal(context.window.PONGY_CONFIG.apiUrl,'');});
test('explicit frontend API configuration is preserved',()=>{const context={window:{PONGY_CONFIG:{apiUrl:'https://custom.example.test'}},location:{hostname:'pongy-ai.devs.surf'}};vm.runInNewContext(code,context);assert.equal(context.window.PONGY_CONFIG.apiUrl,'https://custom.example.test');});
