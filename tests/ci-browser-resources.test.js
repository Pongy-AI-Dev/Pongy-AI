import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{getBrowserConfig}=require('./browser.cjs');
test('Chromium avoids small shared-memory partitions without changing security policy',()=>{const {options}=getBrowserConfig({CI:'true'});assert(options.args.includes('--disable-dev-shm-usage'));assert(!options.args.includes('--disable-web-security'));assert(!options.args.includes('--single-process'));assert(!options.args.includes('--no-zygote'))});
test('Chromium-only memory workaround does not leak into Firefox or WebKit',()=>{for(const name of ['firefox','webkit'])assert.equal(getBrowserConfig({BROWSER_ENGINE:name}).options.args,undefined)});
