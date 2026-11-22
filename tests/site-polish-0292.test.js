import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const app = read('public/app.js');
const css = read('public/app.css');
const settings = read('public/settings-panel.js');
const index = read('public/index.html');
const server = read('server.js');
const extensions = read('public/extensions.js');
const interfaceUi = read('public/interface.js');
const startupGuard = read('public/startup-guard.js');
const products = read('public/products.js');
const pongx = read('pongx/bin/pongx.js');

test('sound settings expose one on/off switch, enabled by default', () => {
  assert.match(settings, /soundToggle\.id = "soundEnabled"/);
  assert.match(settings, /localStorage\.getItem\("pongy_sound"\) !== "off"/);
  assert.doesNotMatch(settings, /masterVolume|Master volume|sound-volume-row/);
  assert.match(app, /function soundEnabled\(\)\{try\{return localStorage.getItem\('pongy_sound'\)!=='off'\}/);
});

test('message viewport and long answers fade at their clipped edges', () => {
  assert.match(app, /has-below-content/);
  assert.match(css, /#messages\.has-below-content/);
  assert.match(css, /\.answer-body\.answer-collapsed::after/);
});

test('settings and subscription windows can stack as one related group', () => {
  assert.match(index, /id="settingsModal" data-stack-group="settings"/);
  assert.match(index, /id="subModal" data-stack-group="settings"/);
  assert.match(app, /other\.dataset\.stackGroup===group/);
  assert.match(app, /restorePanelLayer/);
});

test('additional languages are beta-gated and untranslated labels fall back to English', () => {
  assert.match(app, /languages=LANGS/);
  assert.match(app, /lang:'en'/);
});

test('developer user listing is protected and excludes guest test accounts', () => {
  assert.match(server, /\/api\/admin\/users',auth,developer/);
  assert.match(server, /admin-guest-%@guest\.pongy\.invalid/);
  assert.match(settings, /adminUsers/);
  assert.match(settings, /Retry loading/);
});

test('plugin install opens a directory picker and rejects executable payloads', () => {
  assert.match(extensions, /setAttribute\('webkitdirectory',''\)/);
  assert.match(extensions, /pluginFolderInput\.click\(\)/);
  assert.match(extensions, /\.exe.*\.dll.*\.bat/);
  assert.doesNotMatch(extensions, /function pluginForm\(/);
});

test('Smart PC does not offer a desktop download from its launch action', () => {
  assert.match(products, /launch\.hidden = !active \|\| !native\(\)/);
  assert.match(products, /Open Smart PC/);
  assert.doesNotMatch(products, /Download Pongy Desktop/);
});

test('PongX bounds external requests, DPAPI execution and in-memory chat history', () => {
  assert.match(pongx, /timeout:15000/);
  assert.match(pongx, /AbortSignal\.timeout\(120000\)/);
  assert.match(pongx, /history\.length>40/);
});

test('Smart PC speech respects the selected voice, input language and sound preference', () => {
  const panel = read('public/smart-pc-panel.js');
  assert.match(panel, /pongy_tts_voice:/);
  assert.match(panel, /pongy_speech_language/);
  assert.match(panel, /u\.volume=1/);
  assert.match(panel, /localStorage.getItem\('pongy_sound'\)!=='off'/);
  assert.doesNotMatch(panel, /pongy_volume/);
});

test('sidebar expand arrow and visibility control stay synchronized', () => {
  assert.match(app, /function updateEyeIcon\(\)\{var icon=\$\('eyeIcon'\),mobile=window\.PongyDisplay\?PongyDisplay\.mobile\(\):window\.matchMedia\('\(max-width: 1024px\)'\)\.matches,isHidden=mobile\?/);
  assert.match(app, /updateEyeIcon\(\);renderChats\(\)/);
});

test('chat export remains the only local history action', () => {
  assert.match(index, /id="exportHistory"/);
  assert.doesNotMatch(app, /importHistory|historyImport/i);
});

test('guest settings hide account email, lock the localized guest name and retain sign-out', () => {
  assert.match(app, /if\(email\)\{email\.hidden=guest/);
  assert.match(app, /emailInput\.value=guest\?'':/);
  assert.match(app, /guestDisplayName\(\)/);
  assert.match(app, /function guestDisplayName\(\)\{var names=\{/);
  assert.match(app, /\$\('nickInput'\)\.disabled=guest\|\|admin/);
  assert.match(app, /el!==nickRow&&el!==email&&el!==\$\('logoutBtnSettings'\)/);
  assert.match(app, /guestHistoryFromWarning/);
  assert.match(app, /local-history-card/);
});

test('font and accent choices apply across the interface', () => {
  assert.match(app, /var FONT_CHOICES=\['Default','System UI','Sans Serif','Serif','Monospace','Segoe UI','Arial','Aptos','Calibri','Cambria','Candara','Corbel','Verdana','Tahoma','Trebuchet MS','Georgia','Garamond','Palatino Linotype','Times New Roman','Consolas','Courier New','Lucida Sans Unicode','Franklin Gothic Medium','Inter','Roboto Flex','Noto Sans','Open Sans','Lato','Montserrat','Ubuntu','DejaVu Sans','Liberation Sans','PT Sans','Fira Sans','Nunito','Source Sans 3','Merriweather','Source Code Pro','JetBrains Mono'\]/);
  assert.match(app, /item\.style\.fontFamily=fontCss\(font\)/);
  assert.match(app, /document\.documentElement\.style\.setProperty\('--pongy-font',fontCss\(family\)\)/);
  assert.match(app, /function fontAvailable\(font\)/);assert.match(app, /function loadFontAsset\(font\)\{if\(!FONT_CHOICES\.includes\(font\)\)return Promise\.resolve\(false\);try\{if\(!document\.fonts\?\.load\)return Promise\.resolve\(fontAvailable\(font\)\);var spec='16px '\+fontCss\(font\),sample='Привет, Pongy! 0123456789';return document\.fonts\.load\(spec,sample\)\.then\(function\(\)\{return document\.fonts\.check\(spec,sample\)&&fontAvailable\(font\)\}\)\.catch\(function\(\)\{return false\}\)\}/);assert.match(app,/Pongy Inter/);assert.match(app,/Pongy Roboto Flex/);assert.match(css,/@font-face\{font-family:"Pongy Inter"/);for(const name of ['inter','roboto-flex','noto-sans','montserrat'])for(const subset of ['cyrillic','latin'])assert.ok(fs.existsSync(new URL('../public/fonts/'+name+'-'+subset+'.woff2',import.meta.url)));
  assert.doesNotMatch(app, /fonts\.googleapis\.com/);
  assert.match(app, /function extendedAppearanceEnabled\(\)\{return settings\.betaFunctions===true&&settings\.betaFeatures&&settings\.betaFeatures\.earlyAccess===true\}/);
  assert.match(app, /\$\('accentPreferenceSetting'\)\.hidden=!enabled/);
  assert.match(app, /var visible=extendedAppearanceEnabled\(\)\?ACCENT_COLORS/);
  assert.match(app, /availableFonts=extendedAppearanceEnabled\(\)\?FONT_CHOICES\.filter\(function\(font\)\{return font==='Default'\|\|fontAvailable\(font\)\}\):\['Default'\]/);
  assert.match(app, /betaFeature:function\(key,value\)/);
  assert.match(startupGuard, /var accents=\['default','yellow','red','green','blue','gray','pink','orange','teal','cyan'\]/);
  assert.match(index, /startup-guard\.js\?v=0\.29\.4/);
});

test('expanded composer stays usable for long text and keeps its controls anchored',()=>{assert.match(index,/id="composerExpand"/);assert.match(app,/function resizeComposerInput\(\)/);assert.match(app,/composer-expanded/);assert.match(css,/body\.composer-expanded \.input-box\{align-items:flex-end\}/);assert.match(css,/body\.composer-expanded \.composer-editor #userInput\{max-height:min\(62vh,560px\)/)});
test('short answers are never clipped or faded; only long answers get an expand control',()=>{assert.match(app,/b\.classList\.toggle\('answer-collapsed',!open&&b\.dataset\.answerLong==='true'\)/);assert.match(app,/var isLong=lines\.length>collapseLines;b\.dataset\.answerLong=String\(isLong\)/);assert.match(app,/toggle\.hidden=!isLong;update\(\)/)});
test('voice input reports silence instead of leaving a false listening state',()=>{assert.match(app,/voiceHasSpeech=false/);assert.match(app,/showNoSpeech=!voiceHasSpeech&&!voiceFinishing/);assert.match(app,/showVoiceHelp\('no-speech'\)/)});
test('holiday theme survives first paint and server-side settings actions',()=>{assert.match(startupGuard,/\['dark','holiday'\]\.includes\(appearance\.theme\)/);assert.match(server,/\['dark','holiday'\]\.includes\(merged\.theme\)/);assert.match(server,/\['dark','light','holiday','en','ru'/);});
test('Smart PC shows payment only as the final action and does not display an early unavailable warning',()=>{assert.match(products,/buy\.textContent = tr\("Оплатить", "Pay"\)/);assert.match(products,/buy\.disabled = false/);assert.doesNotMatch(products,/Оплата временно недоступна/)});
test('the old always-on duplicate accent palette is removed', () => {
  assert.doesNotMatch(interfaceUi, /interfaceColour|const colours=/);
});
