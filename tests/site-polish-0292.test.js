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
  assert.match(app, /var FONT_CHOICES=\['Default','Segoe UI','Arial','Aptos','Verdana','Tahoma','Trebuchet MS','Georgia','Times New Roman','Consolas'\]/);
  assert.match(app, /item\.style\.fontFamily=fontCss\(font\)/);
  assert.match(app, /document\.documentElement\.style\.setProperty\('--pongy-font',fontCss\(family\)\)/);
  assert.match(app, /function loadFontAsset\(font\)\{if\(!FONT_CHOICES\.includes\(font\)\)return Promise\.resolve\(false\);try\{return document\.fonts\?\.load/);
  assert.doesNotMatch(app, /fonts\.googleapis\.com/);
  assert.match(app, /\$\('accentPreferenceSetting'\)\.hidden=false/);
  assert.match(app, /var visible=ACCENT_COLORS/);
  assert.match(startupGuard, /var accents=\['default','yellow','red','green','blue','gray','pink','orange','teal','cyan'\]/);
  assert.match(index, /startup-guard\.js\?v=0\.29\.3-appearance1/);
});

test('the old always-on duplicate accent palette is removed', () => {
  assert.doesNotMatch(interfaceUi, /interfaceColour|const colours=/);
});
