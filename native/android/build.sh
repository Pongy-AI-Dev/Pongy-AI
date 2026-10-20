#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
: "${ANDROID_HOME:?Set ANDROID_HOME to an installed Android SDK}"
BT="${ANDROID_BUILD_TOOLS:-$ANDROID_HOME/build-tools/35.0.0}"
PLATFORM="${ANDROID_PLATFORM:-$ANDROID_HOME/platforms/android-35/android.jar}"
JAVA="${JAVA_HOME:+$JAVA_HOME/bin/}java"
JAVAC="${JAVA_HOME:+$JAVA_HOME/bin/}javac"
KEYTOOL="${JAVA_HOME:+$JAVA_HOME/bin/}keytool"
SIGNING="${PONGY_SIGNING_DIR:-$HOME/.local/share/pongy-ai-signing}"
umask 077
mkdir -p "$SIGNING" build/classes build/dex build/res/drawable build/assets ../../public/downloads
# Never regenerate or publish an existing signing identity.
if [[ ! -f "$SIGNING/release.p12" ]]; then
 if compgen -G '../../public/downloads/Pongy-AI-*-android.apk' > /dev/null; then echo 'Existing Android release detected. The original signing key is required; refusing an incompatible update.' >&2; exit 1; fi
 if [[ -f "$SIGNING/password" ]]; then echo 'Signing key missing; refusing to replace the identity.' >&2; exit 1; fi
 openssl rand -hex 32 > "$SIGNING/password"
 "$KEYTOOL" -genkeypair -keystore "$SIGNING/release.p12" -storetype PKCS12 -storepass:file "$SIGNING/password" -keypass:file "$SIGNING/password" -alias pongy -keyalg RSA -keysize 3072 -validity 10950 -dname 'CN=Pongy AI Dev,O=Pongy AI Dev'
fi
cp ../../public/favicon.png build/res/drawable/app_icon.png
"$BT/aapt2" compile --dir build/res -o build/resources.zip
python3 - <<'PYASSET'
from pathlib import Path
import base64
html=Path('../../public/offline.html').read_text()
logo='data:image/png;base64,'+base64.b64encode(Path('../../public/welcome-logo.png').read_bytes()).decode()
html=html.replace('/welcome-logo.png',logo).replace('<script src="/offline-page.js"></script>','<script>document.getElementById("retry").onclick=function(){location.assign("https://pongy-ai.devs.surf/?pongy_app=android&client_version=0.19.0")};window.addEventListener("online",function(){location.assign("https://pongy-ai.devs.surf/?pongy_app=android&client_version=0.19.0")});</script>')
Path('build/assets/offline.html').write_text(html)
PYASSET
"$BT/aapt2" link -A build/assets -o build/unsigned.apk -I "$PLATFORM" --manifest AndroidManifest.xml build/resources.zip
"$JAVAC" --release 8 -classpath "$PLATFORM" -d build/classes dev/pongy/app/MainActivity.java
"$JAVA" -cp "$BT/lib/d8.jar" com.android.tools.r8.D8 --min-api 23 --lib "$PLATFORM" --output build/dex build/classes/dev/pongy/app/*.class
(cd build/dex && zip -q -j ../unsigned.apk classes.dex)
"$BT/zipalign" -f -P 16 4 build/unsigned.apk build/aligned.apk
"$BT/apksigner" sign --v4-signing-enabled false --ks "$SIGNING/release.p12" --ks-key-alias pongy --ks-pass "file:$SIGNING/password" --out ../../public/downloads/Pongy-AI-0.19.0-android.apk build/aligned.apk
"$BT/apksigner" verify --verbose --print-certs ../../public/downloads/Pongy-AI-0.19.0-android.apk

chmod 644 ../../public/downloads/Pongy-AI-0.19.0-android.apk
