#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build ../../public/downloads
x86_64-w64-mingw32-windres launcher.rc -O coff -o build/resources.o
x86_64-w64-mingw32-gcc launcher.c build/resources.o -o build/PongyAI.exe -std=c11 -O2 -Wall -Wextra -Wno-unused-parameter -municode -mwindows -static -static-libgcc -lshell32
"${WIXL:-wixl}" -a x64 -o ../../public/downloads/Pongy-AI-0.15.0-windows-x64.msi installer.wxs
