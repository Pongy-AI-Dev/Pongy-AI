# Pongy AI 0.29.3 — verification record

Date: 22 November 2026

## Automated checks

- Node test suite: 938 total; 937 passed; 0 failed; 1 skipped (SMTP/TLS integration, intentionally excluded).
- Browser UI: 73/74 suites passed in the full Chromium run; the only failure was an outdated Russian/English metadata expectation after copy cleanup. Updated the assertion and reran the localization suite successfully (29 assertions). All 74 suites therefore passed across the full run plus the corrected rerun. Startup recovery, responsive viewport matrix (7 sizes), offline notification UI and native-download checks passed.
- Android compatibility and startup regression tests: 12/12 passed after final insets changes.
- Release metadata/hash checks: Windows MSI and Android APK byte counts and SHA-256 values match public/downloads/releases.json and their sidecar checksum files.
- APK package metadata: dev.pongy.app, versionName 0.29.3, versionCode 293, minSdk 23, targetSdk 35.
- APK signature: V1/V2/V3 verified; signer fingerprint matches the previous Android release.
- Zipalign: verification successful.
- Manifest permission audit: REQUEST_INSTALL_PACKAGES absent.
- npm audit: 0 vulnerabilities (full audit).
- Release integrity, source checks and whitespace checks passed after the final manifest refresh.

## Artifact integrity

- APK: Pongy-AI-0.29.3-android.apk
- Bytes: 229,909
- SHA-256: 86f71d1b096d4ddddadbb4ccd11b9d9508a89592da3cb16a980d146fe7e6ea49
- Certificate SHA-256: fb65962bf41adde6e07bfba8915216d391c1d787861fd1341e589cd525b28167

## Excluded / not verified

- 21 external AI providers: excluded by user request.
- SMTP delivery: excluded by user request; SMTP/TLS test remains skipped.
- GitHub publication and production deployment: completed for website 0.29.3; Windows MSI artifact metadata is included in the same release.
- Windows VM/Sandbox installer validation: unavailable.
- Windows MSI: 0.29.3 rebuilt with WebView2 SDK 1.0.3537.50 and WiX 6.0.2; ProductVersion verified, administrative extraction succeeded and yielded PongyAI.exe plus WebView2Loader.dll. Authenticode signature is absent; no clean VM or physical installation test was performed.
- Physical Android devices: not connected; user will test on Infinix, Samsung, Realme and Huawei.
- Play Protect / third-party antivirus classification: not independently verifiable from the development PC.
- Historical APK signer audit: 0.15.0, 0.18.1 and 0.19.2/0.19.5 use older, distinct signing certificates; the current certificate starts at 0.20.0 and matches 0.29.2/0.29.3. No legacy signing keys were found in the project/current Pongy signing directory. In-place updates from those older signed builds will be rejected by Android; local data must be exported before uninstall/reinstall.
- VPN-free access on the user's affected networks: cannot be established from a single development-network probe.

## Final source/release gate

- npm run check: passed; 591 project files scanned, 347 JavaScript files syntax-checked, 9 JSON files parsed.
- npm run check:release: passed after MANIFEST.sha256 was regenerated with 590 entries; release scan covered 591 project files.
- npm audit --audit-level=low: 0 vulnerabilities.
- git diff --check: passed; only Git line-ending normalization warnings were emitted.
