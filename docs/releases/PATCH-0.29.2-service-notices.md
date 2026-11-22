# Patch 0.29.2 — service notice and compact recovery screens

## Changes
- Added a dedicated slowdown notice directly above the chat composer on the website and in the Windows WebView app.
- The notice is present on every fresh visit, uses the requested Russian copy, has a dismiss button, and dismissal lasts only for the current page session.
- Added an English translation when the interface language is English.
- Kept the capacity notice independent from network/service-state warnings; neither one silently dismisses the other.
- Shortened offline recovery copy and removed the redundant second warning strip and disabled fake composer.
- Simplified recovery progress to compact states such as Connecting · 1/3, No response · 5 s, and Could not connect. Try again later.
- Shortened service-state labels and startup watchdog details without claiming that a server failure means the user's internet is offline.
- Added a responsive UI regression test for initial visibility, placement, close/reload behavior, and narrow mobile layout. Short landscape viewports compact both notices so the composer remains visible.

## Smart PC
The existing three access modes remain: Ask every time, Allow all, and Full access. Smart PC now reads the current model and reasoning choice from the shared account settings for each request; when Plus expires, Plus-only choices fall back to Standard and High. When the main app receives a product update, it signals the Smart PC WebView immediately through a non-sensitive local storage revision event; the existing 15-second server refresh remains as a fallback. Concurrent refreshes are coalesced. No global chat throttling or additional service slowdown was introduced by this UI patch. The native permission boundary for critical system actions remains in place.

## Validation
- Node test suite: 880 tests, 879 passed, 0 failed, 1 skipped.
- Project check: 554 files, 325 JavaScript files and 9 JSON files; passed.
- Release integrity and manifest check: passed.
- Chromium UI runner: all 69 suites passed after correcting and rerunning the two suites that still expected the old redundant offline composer / previous short-viewport layout.
- Firefox: six focused UI suites passed, including seven viewport sizes.
- WebKit: the same six focused UI suites passed, including seven viewport sizes.
- Focused checks: slowdown notice 10 assertions; startup 15; recovery 34; notification/offline 31; service warnings 26; viewport matrix 22 per browser.
- No deployment or installer replacement was performed. Native MSI rebuild was not available in this environment because the WebView2 SDK, WiX and Visual Studio C++ toolchain are not configured.
