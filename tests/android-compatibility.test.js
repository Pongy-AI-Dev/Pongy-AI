import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const manifest = read('native/android/AndroidManifest.xml');
const activity = read('native/android/dev/pongy/app/MainActivity.java');

test('Android package keeps the declared broad OS support floor and current target', () => {
  assert.match(manifest, /android:minSdkVersion="23"/);
  assert.match(manifest, /android:targetSdkVersion="35"/);
  assert.match(manifest, /android:versionCode="294" android:versionName="0\.29\.4"/);
});

test('camera and microphone are optional hardware capabilities, not installation requirements', () => {
  for (const feature of ['android.hardware.camera', 'android.hardware.camera.any', 'android.hardware.microphone']) {
    assert.ok(manifest.includes('<uses-feature android:name="' + feature + '" android:required="false"/>'), feature + ' must remain optional');
  }
});

test('Android native bridge and startup URL report the exact packaged release version', () => {
  assert.match(activity, /PongyNative=Object\.freeze\(\{platform:'android',version:'0\.29\.4'/);
  assert.match(activity, /pongy_app=android&client_version=0\.29\.4/);
  assert.doesNotMatch(activity, /0\.29\.2/);
});

test('newer Android APIs are guarded so Android 6.0 through 9 do not load unavailable methods', () => {
  assert.match(activity, /SDK_INT>=26\).*createNotificationChannel/);
  assert.match(activity, /setStatusBarColor\(android\.graphics\.Color\.WHITE\)/);
  assert.match(activity, /setNavigationBarColor\(android\.graphics\.Color\.WHITE\)/);
  assert.match(activity, /setDecorFitsSystemWindows\(false\)/);
  assert.match(activity, /root\.setOnApplyWindowInsetsListener/);
  assert.match(activity, /WindowInsets\.Type\.systemBars\(\)/);
  assert.match(activity, /FrameLayout\.LayoutParams\(-1,-1\)/);
  assert.doesNotMatch(activity, /web\.setOnApplyWindowInsetsListener/);
  assert.match(activity, /Build\.VERSION\.SDK_INT>=23\)getWindow\(\)\.getDecorView\(\)\.setSystemUiVisibility\(View\.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR\)/);
  assert.match(activity, /startupTimeout,25000/);
  assert.doesNotMatch(manifest, /REQUEST_INSTALL_PACKAGES/);
});

test('Android shell stays Java-only and does not restrict CPU architecture through bundled native libraries', () => {
  assert.equal(fs.existsSync(new URL('../native/android/jniLibs', import.meta.url)), false);
});

test('file selection falls back to the older ACTION_GET_CONTENT provider used by some OEM ROMs', () => {
  assert.match(activity, /Intent\.ACTION_OPEN_DOCUMENT/);
  assert.match(activity, /catch\(ActivityNotFoundException first\)\{try\{Intent fallback=new Intent\(Intent\.ACTION_GET_CONTENT\)/);
  assert.match(activity, /Intent\.EXTRA_ALLOW_MULTIPLE/);
});

test('native compatibility diagnostics expose only local platform and permission capabilities', () => {
  assert.match(activity, /compatibilityInfo\(\)/);
  assert.match(activity, /Build\.VERSION\.SDK_INT/);
  assert.match(activity, /WebView\.getCurrentWebViewPackage\(\)/);
  assert.match(activity, /cameraPermission/);
  assert.match(activity, /microphonePermission/);
  assert.doesNotMatch(activity, /ANDROID_ID|Settings\.Secure\.ANDROID_ID|TelephonyManager/);
});

test('notification channel checks tolerate OEMs that return no channel object', () => {
  assert.match(activity, /NotificationChannel channel=manager\.getNotificationChannel\("pongy_messages"\);if\(channel!=null/);
});
