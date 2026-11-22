# Pongy AI 0.27.0 — stable quick-skill selection

Apply this source overlay to the latest 0.27.0 tree, after the
motion-wait-network hotfix. Extract into the repository root, replacing the
matching files (not into a new subfolder), then commit and run GitHub Actions.
This is not a Windows installer and requires no new environment variables.

## Changes

- Quick-skill rows/buttons are reconciled by skill ID instead of replacing the
  whole list. Focus survives refresh, selection and removal.
- A pending selection uses aria-busy/aria-disabled with an in-flight guard
  instead of natively disabling and blurring its focused button. Repeated
  activation cannot issue parallel selection writes.
- Existing outside-click/tap, pointer-leave, Escape, animation and reduced-motion
  dismissal behavior remains intact. No forced clicks, bypassed visibility
  checks, skipped browser suites or enlarged Playwright click timeouts.
- The extensions script URL has a new cache marker.

The previous implementation removed/disabled focused controls. A focusout with
no related target can schedule the 140 ms dismissal, especially when the engine
won't focus the next clicked button. The new delayed-selection regression fails
against the previous source (focused control disabled/blurred) and passes with
this patch. Exact reproduction in local WebKit was not available.

## Local validation

- All 758 Node tests passed (0 failed, 0 skipped).
- Chromium UI: skills 36 assertions; extensions 38; motion 29; capabilities 15;
  voice mode 84. All five suites passed.
- Skills additionally repeated twice with a held first mutation response,
  duplicate keyboard activation, server rejection and real touch input.
- Full release structure/syntax/reference/hash audit performed after packaging.
- WebKit and Firefox are not installed locally; their result must be verified
  in the GitHub Actions browser matrix. This patch does not claim 61/61 there.

No hosting, DNS, TLS, CSP, AI-provider or payment configuration is changed.
