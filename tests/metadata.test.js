import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {load} from 'cheerio';
const $=load(fs.readFileSync('public/index.html','utf8'));
test('search and share descriptions describe Pongy AI, not developer setup',()=>{
 const description=$('meta[name="description"]').attr('content');assert(description.startsWith('Pongy AI —'));assert(description.length>=100&&description.length<=180);assert(description.includes('ИИ-помощник'));assert.equal($('meta[property="og:description"]').attr('content'),description);assert.equal($('meta[name="twitter:description"]').attr('content'),description);assert(!/API|Render|настройк|гаранти/.test(description));
});
test('canonical and preview image use the public HTTPS hostname',()=>{
 assert.equal($('link[rel="canonical"]').attr('href'),'https://pongy-ai.devs.surf/');assert.equal($('meta[property="og:url"]').attr('content'),'https://pongy-ai.devs.surf/');assert.equal($('meta[property="og:image"]').attr('content'),'https://pongy-ai.devs.surf/favicon.png');assert.equal($('meta[name="twitter:image"]').attr('content'),$('meta[property="og:image"]').attr('content'));assert.equal($('meta[property="og:type"]').attr('content'),'website');assert.equal($('meta[name="twitter:card"]').attr('content'),'summary');assert.equal($('html').attr('lang'),'ru');assert.equal($('meta[name="robots"][content*="noindex"]').length,0);
});
