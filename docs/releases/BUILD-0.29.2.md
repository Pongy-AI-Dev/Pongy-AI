# Pongy AI 0.29.2 — Build artifacts

## Public application downloads

The public Windows download flow contains exactly two applications:

- `Pongy-AI-0.29.2-windows-x64.msi` — Pongy Desktop installer for Windows x64.
- `PongX-0.1.0-windows-x64.zip` — PongX Windows x64 application archive.

The separate mobile flow contains:

- `Pongy-AI-0.29.2-android.apk` — Android package, application ID `dev.pongy.app`, version code 292, minSdk 23, targetSdk 35.

The public release manifest is `public/downloads/releases.json`. It exposes only the current Windows MSI, PongX ZIP, and Android APK. No portable Pongy build or BAT launcher is part of release 0.29.2.

## Build and validation

- Windows: Visual Studio C++ x64 toolchain, Microsoft WebView2 SDK 1.0.3537.50, and WiX Toolset 5.0.2. `native/windows/build.ps1` builds the native launcher and MSI.
- Android: Android SDK Platform 35, Build Tools 35.0.0, and Java 17. `native/android/build.sh` builds the APK.
- APK alignment and V1/V2/V3 signature verification passed. The APK is signed with the Pongy AI Dev development certificate.
- Windows MSI was rebuilt from the current native source with Visual Studio Build Tools, WebView2 SDK 1.0.3537.50, and WiX 5.0.2. WiX ICE validation and MSI decompilation passed; ICE91 reports the expected per-user LocalAppData install scope.
- The rebuilt MSI upgraded the connected Windows 11 desktop from 0.20.0 to 0.29.2 with Windows Installer exit code 0. The 0.29.2 uninstall registration, installed executable, WebView2Loader, Start Menu shortcut, and Desktop shortcut were verified. Launching PongyAI.exe left the application and WebView2 processes running.
- This was an in-place upgrade on the existing Windows installation, not a clean-OS/VM installation. No accessible clean Windows sandbox was available.
- The MSI is not Authenticode-signed. No trusted Pongy AI code-signing certificate/private key was available on the build PC; a self-signed certificate would not establish public publisher trust.
- Download metadata validates each artifact's filename, byte length, and SHA-256 digest before publishing the download endpoint.

## Verification limits

- The APK was rechecked with Android Build Tools 35.0.0: zipalign passed, V1/V2/V3 signature verification passed, and package metadata reports `dev.pongy.app`, versionCode 292, versionName 0.29.2, minSdk 23, and targetSdk 35. ADB platform-tools were installed, but `adb devices -l` returned no attached device, so physical-device installation and runtime testing remain unverified.
- The MSI was not tested on a clean Windows OS or virtual machine; only the upgrade path on the existing Windows 11 desktop was exercised.
- WebView2 Runtime availability is required by the Windows application. The current Windows 11 build PC had WebView2 Runtime installed; the MSI upgrade and launch smoke test passed there.
- GitHub and Render were not updated. These artifacts remain in the local working copy until explicitly approved for publication.


## Rebuild record — 2026-11-21

Both native release artifacts were rebuilt from the current working-copy sources.

### Android

- Rebuilt `public/downloads/Pongy-AI-0.29.2-android.apk` with JDK 17, Android Platform 35 and Build Tools 35.0.0.
- Preserved the original Pongy AI signing identity. The certificate SHA-256 remains `fb65962bf41adde6e07bfba8915216d391c1d787861fd1341e589cd525b28167`; the package remains upgrade-compatible with releases signed by that certificate.
- Corrected the native bridge and startup URL from stale `0.29.1` labels to `0.29.2`.
- Declared camera and microphone hardware optional. Devices without either sensor are not excluded from installation; those features remain unavailable unless the hardware exists and permission is granted.
- Package metadata: `dev.pongy.app`, versionCode 292, minSdk 23 (Android 6.0), targetSdk 35 (Android 15), Java/Dex only, no bundled ABI-specific native libraries.
- `zipalign -c` passed. APK signature verification passed for V1, V2 and V3. `aapt dump badging` confirmed the package metadata and optional camera/microphone features.
- Added five automated Android compatibility source/manifest regression tests; all five passed.

### Windows

- Rebuilt `public/downloads/Pongy-AI-0.29.2-windows-x64.msi` from the current native launcher and installer sources using the Visual Studio C++ x64 toolchain, WebView2 SDK 1.0.3537.50 and WiX 5.0.2.
- Corrected build-tool discovery so an incomplete newer Visual Studio installation does not prevent fallback to an installed C++ toolchain.
- Windows Installer administrative extraction completed with exit code 0. The extracted package contains `PongyAI.exe` and `WebView2Loader.dll`.
- The MSI remains unsigned by Authenticode because no trusted publisher certificate/private key is available. Do not treat the development build as a verified public publisher identity.

### Compatibility and verification limits

- Android's declared OS floor is Android 6.0 / API 23. Newer API calls in the Java shell are guarded by SDK-level checks. The app uses the device's Android System WebView, so the actual WebView provider/version and vendor firmware still affect runtime behaviour.
- The APK contains no ABI-specific native libraries, so it is not restricted to one CPU architecture by native binaries. This does not guarantee compatibility with every custom ROM, vendor-modified firmware, missing WebView provider, or device policy.
- `adb devices -l` found no attached Android device and no Android emulator/AVD is installed. Therefore installation and runtime behaviour on physical devices, Samsung One UI, Xiaomi HyperOS/MIUI, OPPO/ColorOS, Pixel/AOSP and other vendor firmware remain unverified. The compatibility floor is a build/manifest claim, not a claim of testing every firmware.
- The Windows MSI was administratively extracted and its contents verified. This rebuild did not perform a clean Windows installation or a fresh in-place upgrade. The earlier 0.29.2 installation/launch smoke test on the existing Windows 11 machine remains the only recorded runtime test.
- Updated `public/downloads/releases.json` with the exact byte sizes and SHA-256 hashes of both rebuilt artifacts. No GitHub or Render publication, commit, push or deployment was performed.
