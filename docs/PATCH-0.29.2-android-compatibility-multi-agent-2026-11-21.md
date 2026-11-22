# Pongy AI 0.29.2 — Android compatibility, multi-agent and signing update

Date: 2026-11-21

## Android compatibility hardening

- Preserved Android minimum API 23 (Android 6.0+) and target API 35. No maximum SDK level is declared.
- Added a fallback from the Storage Access Framework document picker to ACTION_GET_CONTENT for vendor ROMs with incomplete picker implementations.
- Hardened notification-channel inspection when an OEM framework returns no channel object.
- Added a local-only native compatibility report for SDK level, release, manufacturer, brand, WebView provider/version and current permission states. It does not collect a device ID, phone number or telemetry.
- Kept newer API calls behind SDK checks and optional camera/microphone hardware out of installation requirements.
- Existing notification permission handling and user-approved package installation remain in place.

Validation: Android package compilation succeeded. The rebuilt APK was verified by apksigner with APK Signature Schemes v1, v2 and v3. No physical-device/OEM firmware matrix is attached to this change; compatibility across manufacturers is improved but not certified for every ROM. Android System WebView availability/version and vendor-specific battery/permission policies remain external dependencies. Newer Android versions are not capped by maxSdkVersion, but have not been physically validated here.

## Multi-agent orchestration

- Added a separate orchestration module with planner and independent reviewer roles.
- The planner produces a concise plan and acceptance criteria. The reviewer checks the plan, missing requirements, constraints, risks and verification criteria.
- The main model remains the worker and retains the existing bounded tool loop.
- When at least two distinct model candidates are available, the auxiliary roles use separate model candidates where possible. If only one model is available, the system records a fallback and uses the ordinary route instead of pretending that multiple agents ran.
- Auxiliary agent calls have a 12-second per-call cap and bounded output. They receive sanitized, bounded context and no mutating tools.
- Handoffs are subordinate to system policy, the user's request and verified tool results.
- If the planner/reviewer phase fails or returns truncated output, the ordinary model route continues and the activity log records the fallback.
- Added a persistent Multi-agent toggle in the composer. It is off by default because it makes additional model requests and can consume additional provider quota. Enabling it applies to subsequent requests.
- Activity history records planner/reviewer start and completion without exposing private chain-of-thought.

## Package signatures

### Android APK

The rebuilt APK is signed with the existing Pongy AI Dev RSA-3072 signing identity. APK signature verification passed for v1, v2 and v3. The signer certificate SHA-256 is:

`fb65962bf41adde6e07bfba8915216d391c1d787861fd1341e589cd525b28167`

The APK SHA-256 is:

`d3a90c0d1cf383535adeca94e3612b040a810e774004d2e1054c6cb8e0bf009a`

The signing key remains outside the repository. The release registry and checksum sidecar match the rebuilt APK.

### Windows MSI

The current MSI is **not Authenticode-signed**. No trusted Code Signing certificate with a private key was available in the connected Windows certificate stores. A self-signed certificate would not establish public publisher trust, so one was not substituted. The Windows build script now supports signing and verification when a trusted certificate is installed in CurrentUser\\My and `PONGY_CODESIGN_THUMBPRINT` is configured. SHA-256 signing and timestamp verification are required.

## Verification results

- `npm test`: **923 total, 922 passed, 0 failed, 1 skipped**. The skipped test requires a real SMTP/TLS server.
- `npm run test:ui`: **73/73 browser suites passed**.
- `npm run check`: passed; scanned 577 project files, syntax-checked 343 JavaScript files and 9 JSON files.
- `npm run check:release`: passed after regenerating the 576-entry `MANIFEST.sha256`.
- `git diff --check`: passed; only existing line-ending normalization warnings were reported.
- Windows signing script PowerShell parser check: passed.
- APK signature verification: v1, v2 and v3 passed.

## Remaining validation

- Test the APK on representative Android 6–16 devices and OEM firmware, including WebView updates, notification permissions, document pickers, background restrictions and app-update installation.
- Install/upgrade the MSI in a clean Windows VM and sign it with a trusted code-signing certificate before public distribution.
- Live multi-agent provider behavior depends on the user's configured model providers, quotas and regional availability. Automated tests verify orchestration, handoff order, bounded failures and fallback; they do not prove every external provider is reachable.

## Post-generation independent quality review

The opt-in multi-agent flow now includes a second, post-generation quality gate:

1. The independent result reviewer compares the completed worker draft with the bounded original user request/context.
2. It checks completeness, factual consistency, unsupported claims, safety/privacy constraints, contradictions and evidence for claimed actions or tests.
3. If it reports concrete material issues, the worker receives those findings and is asked to return a complete corrected draft.
4. The reviewer checks the corrected draft once more.
5. The reviewed draft is passed to the existing delivery/artifact pipeline, so generated source attachments are created from the corrected text rather than the superseded draft.

The reviewer and repair worker have no tools in this phase. Reviewer output is treated as untrusted advisory data; system policy and the original user request remain authoritative. Calls are bounded by the existing 12-second agent-call timeout and output limits. Drafts beyond the reviewer context limit are explicitly marked unverified rather than silently truncated. Invalid reviewer output, unavailable models or failed repair do not become false success claims. If the repair succeeds but the final review is unavailable or still finds issues, the work log records that state explicitly.

The activity timeline and saved chat history now retain the final-review, repair-start/repair-complete and verification-result events. Actionable findings are bounded and displayed in the task timeline. Private chain-of-thought is not recorded.

Targeted tests: 26/26 passed across agent orchestration, AI integration, history sanitization and activity-timeline event handling. The final full test suite completed 930 tests: 929 passed, 0 failed, 1 skipped (real SMTP/TLS required). The complete browser UI run passed 73/73 suites.
