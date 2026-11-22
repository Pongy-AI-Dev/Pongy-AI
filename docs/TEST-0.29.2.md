# Pongy AI 0.29.2 — Verification report

## Local continuation verification — 2026-11-11

- Full Node test suite: 885 tests, 884 passed, 0 failed, 1 skipped.
- Policy enforcement integration: model-classifier reports are created, four separate flagged requests trigger a seven-day AI restriction and 30-day device restriction, and a second account on the same device remains blocked.
- Cloud-history encryption: AES-256-GCM, account-bound authentication, tamper rejection, persistent key rotation and legacy-record migration tested.
- Direct Support browser integration passed in Chromium, Firefox and WebKit: welcome message, user submission, automatic acknowledgement, developer inbox, agent reply and user-side delivery.
- Full Chromium UI regression: 70/70 suites passed in one sequential run; exit code 0. Coverage includes camera/voice, wake-word, speech, mobile layouts, downloads, installer language, application/workspace, policy, settings and persistence.
- Firefox and WebKit: 13/13 selected cross-browser suites passed in each engine, covering support chat, model/reasoning selection, brand motion, notes, reminders, mobile layouts, service warnings, downloads and settings. The camera fake-device/continuous-feed/real-ASR integration is Chromium-only and explicitly skipped on Firefox/WebKit.
- Application/project/workspace UI: 14 assertions passed in Chromium, Firefox and WebKit. Product/voice/undo UI: 47 assertions passed in Chromium.
- The local PC currently has no OpenRouter, Gemini or DeepSeek API key configured. The AI policy classifier is enabled in the production server entry point, but this local environment falls back to deterministic safeguards until a provider key is configured.
- Production email delivery still depends on a configured SMTP/Resend transport; report and notification records are queued independently.

## Automated checks

- Full Node test suite: 885 tests, 884 passed, 0 failed, 1 skipped. The skipped test requires a configured SMTP/TLS test server.
- `npm run check`: project structure and syntax checks passed.
- `npm run check:release`: passed; the SHA-256 manifest matched the release files.
- `git diff --check`: passed.
- Focused settings/sound/appearance UI checks: 26 assertions.
- Focused Windows/mobile download UI checks: 33 assertions.
- Focused voice activation and browser extension download checks: 16 assertions.
- Local developer auto-recognition UI check: passed.
- Recovery/mobile persistence UI check: 34 assertions.
- Native permissions/login/free-image UI check: 18 assertions.

## Application artifacts

- Windows Pongy Desktop MSI: rebuilt with WiX 5.0.2; ICE validation and decompilation passed; upgraded existing 0.20.0 installation to 0.29.2 with exit code 0 and verified launch/shortcuts. Not tested on a clean Windows OS/VM and not Authenticode-signed.
- Windows PongX ZIP: built and verified as a ZIP archive.
- Android APK: zipalign and V1/V2/V3 signature checks passed again; package ID/version/SDK metadata verified. No physical Android device was attached, so install/runtime on hardware remains untested.
- The Windows download screen offers exactly two products: Pongy Desktop MSI and PongX ZIP. Android APK is offered in the separate mobile path.
- No portable Pongy ZIP or BAT launcher is offered in release 0.29.2.

## Verification limits

- No physical Android device was attached; Android verification is limited to package alignment, signature and metadata checks.
- No clean Windows OS/VM was available; the existing 0.20.0 installation was upgraded successfully to 0.29.2.
- Full Chromium UI regression passed 70/70 suites; the selected Firefox and WebKit cross-browser suites passed 13/13 in each engine.
- GitHub and Render were not updated. No production deployment was performed.

## Current working-copy verification — 2026-11-21

- Full Node test suite: 906 tests; 905 passed, 0 failed, 1 skipped. The skipped case requires a configured SMTP/TLS test server.
- `npm run check`: passed; 566 project files scanned, 335 JavaScript files syntax-checked and 9 JSON files parsed.
- `npm ci --ignore-scripts --dry-run`: passed; the package manifest and lockfile resolve consistently.
- `npm run check:release`: passed after regenerating the SHA-256 manifest for 565 release files. Local `*.encoding-backup` files are preserved but excluded from the release file set.
- `git diff --check`: passed; Git reported only line-ending normalization warnings for existing working-copy files.
- Chromium UI regression: 71 of 72 suites passed on the first complete run. The single failure was an outdated sidebar test expecting three chat actions; after updating it for the new archive action, the affected `tests/ui.cjs` suite passed all 52 assertions. The new archive suite passed all 12 assertions.
- Chat archive/restore: 12 UI assertions passed independently in Chromium, Firefox and WebKit. Coverage includes local/server persistence, reload, restore, active-chat switching and the all-chats-archived case.
- Focused regression after the archive changes: workspace 37 assertions, guest experience, application/project/workspace 14 assertions, and attachment preview/layout 21 assertions passed.
- No Git commit, push, production deployment, or modification of the source copies was performed. Windows and Android installers were not rebuilt in this verification pass.


## Native rebuild regression verification — 2026-11-21

- `npm test`: 911 tests; 910 passed, 0 failed, 1 skipped (SMTP/TLS integration unavailable in this environment).
- `npm run check`: passed; 567 project files scanned, 336 JavaScript files syntax-checked and 9 JSON files parsed.
- `npm run check:release`: passed; all 566 manifest entries match the current working copy.
- `git diff --check`: passed; Git emitted only line-ending normalization warnings.
- Android compatibility regression suite: 5 passed, 0 failed. It checks the API 23 floor, target API 35, optional camera/microphone hardware, guarded newer API calls, exact native version and absence of ABI-specific native libraries.
- Android APK: zipalign and V1/V2/V3 signature verification passed; original signing certificate preserved; manifest and package metadata verified with Android Build Tools 35.0.0.
- Windows MSI: administrative extraction passed with Windows Installer exit code 0; extracted executable and WebView2 loader were present.
- No Android device or emulator was connected, so no physical-device firmware runtime matrix was completed. No deployment, commit or push was performed.

## Finalization and native rebuild — 2026-11-21

- Android APK rebuilt with the original signing identity; package metadata confirms minSdk 23, targetSdk 35, versionCode 292/versionName 0.29.2. V1/V2/V3 signature verification and zipalign passed. No Android device/emulator was connected.
- Windows MSI rebuilt with WebView2 SDK 1.0.3537.50 and WiX 5.0.2; administrative extraction succeeded and contained the executable, WebView2 loader and license notices. MSI remains unsigned; clean-VM installation was not tested.
- PongX ZIP rebuilt from all five current source files. A new regression test compares every archived byte to its current source; 6/6 PongX tests passed.
- Library browser regression: 17 assertions per engine passed for search, categories, sorting, metadata editing, mobile layout, source-file preservation and reversible cleanup.
- Release manifest updated with new hashes and sizes for Windows, Android and PongX.
- No automatic deletion of user files, no deployment and no Git push.

## Final regression after Library cleanup — 2026-11-21

- Full Node suite: 913 tests, 912 passed, 0 failed, 1 skipped (real SMTP/TLS requires an available test server).
- Full existing Chromium UI run: 72/72 suites passed before the final cleanup UI addition. The Library suite was then run separately: 17/17 assertions passed in each of Chromium, Firefox and WebKit.
- After cleanup integration, workspace 37, application 14, attachments 21, native files 18 and notes 32 Chromium UI assertions passed.
- PongX archive/source consistency: 6/6 tests passed.
- `npm run check` and `npm run check:release` passed; release manifest covers 570 files. `git diff --check` passed.
- External live model/API credentials were not configured; mock/provider-contract tests do not certify live provider availability.

## Безопасная очистка файлов — 2026-11-21

- Кандидаты определяются только после проверки ссылок из истории чатов, активных chatId, проектов, заметок и Library.
- Возрастной порог для списка кандидатов — 90 дней; отсутствие даты означает, что файл не предлагается к очистке.
- Перемещение в Trash выполняется только по отдельному действию пользователя и только для кандидата, прошедшего проверку.
- Файл в Trash недоступен для обычного скачивания, предпросмотра и повторного прикрепления к проекту/заметке до восстановления.
- Восстановление доступно 30 дней; окончательное удаление через API разрешено только после 30 дней и требует отдельного явного запроса.
- Автоматического безвозвратного удаления нет.
- API-регрессия: 1/1 сценарий пройден; проверены ссылки всех типов, блокировка повторного прикрепления, восстановление и срок окончательного удаления.
- UI-регрессия Library: 17 проверок в Chromium, Firefox и WebKit.

## Итоговая повторная проверка рабочей копии — 2026-11-21

- `npm test`: 938 тестов; 937 пройдено, 0 ошибок, 1 пропущен. Пропущен реальный SMTP/TLS-сеанс: в локальной среде нет настроенного SMTP test server.
- `npm run check`: успешно; 582 файла проекта, 347 JavaScript-файлов проверены на синтаксис, 9 JSON-файлов разобраны.
- Полная Chromium UI-регрессия: 74/74 набора пройдены, exit code 0; суммарное время — 709,70 секунды.
- Проверены реальные UI-потоки голосового пробуждения, микрофона и локального ASR, библиотека, архив, загрузки APK/MSI, проекты, заметки, документы, напоминания, настройки, восстановление сессии и адаптивная раскладка.
- Статический аудит: 381 исходный файл; 185 сигналов review, 7 info, 0 high/error. Это эвристические сигналы, не доказательство отсутствия уязвимостей. Тесты аудитора: 7/7.
- Уточнён шаблон обнаружения запуска процессов, чтобы обычные методы `.exec()` не классифицировались как shell-вызовы. Повторный аудит снизил шум с 196 до 185 review.
- `npm run check:release`: успешно после пересборки `MANIFEST.sha256`; проверены 581 release-файл и их SHA-256.
- `git diff --check`: успешно; Git выдал только предупреждения о нормализации CRLF/LF, ошибок whitespace нет.
- Реальные внешние API без ключей/квот, SMTP/TLS с настоящим сервером, установка на Android-устройствах/OEM-прошивках и чистая Windows VM остаются внешними проверками. GitHub/Render не обновлялись, production deployment не выполнялся.

## Dependency remediation and final local regression — 2026-11-22

- Full `npm audit` after lockfile reconciliation: 0 vulnerabilities across production and development dependencies.
- Fixed the two moderate transitive advisories: `@hono/node-server` 2.1.5 → 2.1.11 and `hono` 4.13.13 → 4.13.20. The lockfile was also reconciled to package version 0.29.2 and declared `better-sqlite3` 13.0.3.
- Restored development dependencies and Playwright 1.64.0 after the production-only audit-fix pass; the full browser suite then ran with Playwright present.
- Full Node test suite after dependency remediation: 938 tests; 937 passed, 0 failed, 1 skipped (real SMTP/TLS requires a configured test server).
- Full Chromium UI regression after dependency remediation: 74/74 suites passed; exit code 0; runtime 691.80 seconds.
- `npm run check`: passed; 582 project files scanned, 347 JavaScript files syntax-checked and 9 JSON files parsed.
- Static audit: 381 source files; 185 review, 7 info, 0 high/error. Grouped review shows all 55 credential-like assignments, all 3 dynamic-code signals and all 7 unresolved-import signals are in tests; 15 process-launch signals comprise 9 test and 6 production-code occurrences; 111 HTML sink signals comprise 106 production and 5 test occurrences. These are heuristic review signals, not confirmed vulnerabilities.
- MSI 0.29.2: read-only metadata confirms ProductVersion 0.29.2; administrative extraction succeeded with exit code 0 and yielded five files, including PongyAI.exe and WebView2Loader.dll. MSI remains Authenticode-unsigned. A clean Windows VM was unavailable.
- Android APK 0.29.2: SHA-256, V1/V2/V3 signatures and zip alignment reverified. minSdk 23 / targetSdk 35. No Android device or emulator was attached; only Android SDK platform/build-tools 35.0.0 are installed.
- No server API-key environment variables were present; real live calls to the 21 providers remain unverified. Provider contract/mock tests passed.
- Local secret databases and key files remain Git-ignored and untracked. No user data was deleted.
- GitHub publication, SMTP setup, commit/push and production deployment remain intentionally out of scope.

## Final manifest and working-copy integrity — 2026-11-22

- Regenerated `MANIFEST.sha256` after the dependency and documentation updates; 582 release files are covered.
- `npm run check:release`: passed against the regenerated manifest.
- Final `npm run check`: passed; 583 project files scanned, 347 JavaScript files syntax-checked and 9 JSON files parsed.
- `git diff --check`: exit code 0. Git emitted only existing LF/CRLF normalization warnings; no whitespace errors.
- Final full `npm audit`: 0 info, 0 low, 0 moderate, 0 high and 0 critical vulnerabilities.

- Additional release artifact inventory: PongX ZIP 9,099 bytes, SHA-256 `635e80503bd556777097ce59d0b401db4c87886962c5d13dc693efc2f890bdf4`. `public/downloads/releases.json` hashes and byte counts match the MSI, APK and PongX ZIP.
