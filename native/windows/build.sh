#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
: "${WEBVIEW2_SDK:?Set WEBVIEW2_SDK to the extracted official Microsoft.Web.WebView2 1.0.3537.50 NuGet package}"
mkdir -p build ../../public/downloads
# Linux filesystems are case-sensitive; the official SDK uses EventToken.h.
cp /usr/x86_64-w64-mingw32/sys-root/mingw/include/eventtoken.h build/EventToken.h
cp "$WEBVIEW2_SDK/build/native/x64/WebView2Loader.dll" build/
# Embed a public-only offline screen, available even on first launch without a network.
python3 - <<'PYOFFLINE'
from pathlib import Path
import base64
html=Path('../../public/offline.html').read_text()
logo='data:image/png;base64,'+base64.b64encode(Path('../../public/welcome-logo.png').read_bytes()).decode()
script=Path('../../public/offline-page.js').read_text().replace('location.reload()', 'location.assign("https://pongy-ai.devs.surf/?pongy_app=windows&client_version=0.26.0")')
html=html.replace('/welcome-logo.png',logo).replace('<script src="/offline-page.js"></script>', '<script>'+script+'</script>')
Path('build/offline.html').write_text(html)
PYOFFLINE
x86_64-w64-mingw32-windres launcher.rc -O coff -o build/resources.o
x86_64-w64-mingw32-g++ launcher.cpp build/resources.o -Ibuild -I"$WEBVIEW2_SDK/build/native/include" -o build/PongyAI.exe -std=c++17 -O2 -municode -mwindows -static -static-libgcc -static-libstdc++ -lole32 -lshell32 -luuid -ladvapi32
"${WIXL:-wixl}" -a x64 -o ../../public/downloads/Pongy-AI-0.26.0-windows-x64.msi installer.wxs

python3 installer-ui.py ../../public/downloads/Pongy-AI-0.26.0-windows-x64.msi
