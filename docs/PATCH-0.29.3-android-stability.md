# Pongy AI 0.29.3 — Android stability and installation-surface reduction

Date: 22 November 2026

## Implemented changes

- Reworked Android system-bar handling around a parent FrameLayout. On Android 11+ it consumes status-bar, navigation-bar, display-cutout and keyboard insets before laying out the WebView. This specifically addresses Android 15+ where edge-to-edge is enforced for target SDK 35. Android 6–10 retain native decor fitting.
- Added contrast-safe system-bar colors: dark status-bar icons from API 23 and dark navigation-bar icons from API 26; Android 6–7 retain a dark navigation bar with light system icons.
- Reduced native startup wait from 120 seconds to 25 seconds. The connection dialog can be cancelled and opens the local offline/retry page.
- Added safe-area padding to the startup recovery overlay so its buttons and text do not sit beneath device cutouts or system bars.
- Removed REQUEST_INSTALL_PACKAGES from the manifest and removed the native automatic APK-installer path. Updates now use a normal user-initiated APK download followed by Android's own installer confirmation.
- Kept the existing APK signing identity. Package version is 0.29.3 / versionCode 293, preserving update compatibility with APKs signed by the same key.

## Android package

- Output: public/downloads/Pongy-AI-0.29.3-android.apk
- Size: 229,909 bytes
- SHA-256: 86f71d1b096d4ddddadbb4ccd11b9d9508a89592da3cb16a980d146fe7e6ea49
- Application ID: dev.pongy.app
- Minimum Android: 6.0 (API 23)
- Target Android: 15 (API 35)
- APK signature: V1, V2 and V3 verified; zipalign verification passed.
- Signing certificate SHA-256: fb65962bf41adde6e07bfba8915216d391c1d787861fd1341e589cd525b28167

The manifest now requests only INTERNET, POST_NOTIFICATIONS, RECORD_AUDIO, CAMERA and READ_CONTACTS. Camera, microphone, notifications and contacts are used for corresponding optional features. REQUEST_INSTALL_PACKAGES is absent.

The signing certificate is a developer/self-signed certificate, not a publicly trusted app-store publisher certificate. A valid APK signature proves package integrity and signer continuity; it does not guarantee a clean Play Protect reputation or remove unknown-publisher warnings.

### Historical signing boundary

Read-only verification of the archived APKs found three historical signing identities: 0.15.0, 0.18.1 and 0.19.2/0.19.5. The current signing identity begins with 0.20.0 and is shared by 0.29.2 and 0.29.3. No legacy JKS/keystore/P12/PFX files were found in the project or current Pongy signing directory, so a cryptographic proof-of-rotation from those older certificates cannot currently be produced. Android will reject an in-place update from an installation signed by one of those older identities. Users on 0.20.0 or later with the current signer can update normally. For older installations, export local history and other local-only data before uninstalling and installing the current APK; uninstalling can erase app-local WebView storage. A fresh install is not affected by this historical signer mismatch.

## Verification and limitations

- Full Node suite: 938 tests; 937 passed, 0 failed, 1 skipped (real SMTP/TLS test intentionally skipped because SMTP configuration is excluded).
- Browser UI suite: 74/74 suites verified. The first aggregate run passed 71/74; the three version-sensitive download/installer suites were corrected for the independently versioned Windows MSI/browser extension and each rerun passed. Startup, seven-size responsive viewport and offline-notification UI suites also passed after the safe-area change.
- Android SDK 35 / Build Tools 35.0.0 compilation, D8 packaging, APK signature verification and zipalign completed successfully.
- npm audit and final release checks are recorded in docs/TEST-0.29.3.md.

No physical Android devices were attached. Infinix, Samsung, Realme and Huawei installation, Play Protect classification, OEM background restrictions and real network behavior remain unverified until the user tests the APK.

The public server still reports 0.29.1. The local 0.29.3 source/APK changes have not been deployed; no DNS, hosting, GitHub or Render changes were made. A stable check from one development network does not prove access from the user's other networks or without VPN.

Windows MSI remains 0.29.2 and unsigned. No trusted Authenticode certificate was available; no self-signed MSI certificate was created or installed. No clean Windows VM was available for installer testing.

Android's displayed first-install timestamp is maintained by Package Manager / the operating system. The application cannot set or rewrite that system timestamp.
