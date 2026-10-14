# 1.4.3 — consistent branding and favicon compatibility

- Authentication, sidebar and welcome screen now use the exact existing site favicon.
- Added multi-size ICO and Apple touch icon derived from the same image.
- Explicit favicon sizes and public crawler access rules.
- Added branding, asset availability and CSP regression tests.
- Strict CSP retained: no unsafe-eval or string-executing timers added.

Validation: 83 automated tests and 114 Chromium UI assertions passed with fixtures; no CSP violations during normal branding workflows. A separate negative test confirms string evaluation remains blocked.

The reported CSP evaluation warning was not traced to a project script; source filename and line are needed if it persists. Search-engine favicon updates depend on recrawling.

# 1.4.2 — adaptive search, response speed and interface localization

- Search is optional per question, not an automatic request before every answer.
- Source links live in the expandable list; redundant web/Wiki cards removed.
- Faster successful models are preferred by observed time to first response.
- Unified Russian/English labels, settings, menus, password controls and Plus text.
- Removed untranslated language placeholders rather than claiming ten translations.
- Existing free-model fallback, Tavily basic mode and payment placeholder retained.

Validation: 79 automated tests and 101 Chromium UI assertions passed with fixtures.
Real provider response speed and tool-selection quality require deployment checks.

# 1.4.1

Bug fix, improvement of website stability, its structure, security, as well as minor improvements and refinement of the AI.

# 1.4.0 — ZIP, research and downloadable answers

- ZIP upload and bounded text/code/document extraction; credential exclusions.
- Wiki article cards and Wikimedia Commons photographs with author/license credits.
- Collapsible, deduplicated “Источники (N)” listing tool-retrieved sources.
- Tool-driven code/text files and ZIP projects attached to assistant messages.
- Optional explicit-request image generation through OpenRouter, off by default.
- Bottom notification for unsupported formats; attachment metadata persists in chats.
- Existing Plus placeholder, authentication, cloud storage and UI retained.

Validation: 65 automated tests and 78 Chromium browser assertions passed with fixtures.
No production deployment or live provider image-generation test was performed.

# 1.3.0 — chat, files and durable storage

- First-party API routing and cookie session restoration on every page load.
- Optional UID-scoped Firestore chats, preferences, attachments and revocable sessions.
- Real image/document attachments; bounded PDF/DOCX workers and vision model selection.
- Model-specific 403 fallback, clearer 401 key errors and malformed output retry.
- Wikipedia source retrieval, reply preview and optional cross-chat user context.
- Removed message avatars; fixed duplicate retry/edit messages and metadata alignment.
- Date-based history, press/open/close animations, reduced-motion and mobile layout.
- Restored original Plus benefits and payment choices; payment still unavailable.
- Browser-engine CI added. Local checks use Chromium; Firefox/WebKit could not launch
  in this sandbox because required system libraries are absent.

Validation: 56 automated tests and 60 browser assertions passed with local fixtures.
Production dependency audit: zero known vulnerabilities at checking time.
No production deployment, live OAuth, live model quality or real-email test performed.

# 1.2.0 — Firebase email/password authentication

- Added server-side Firebase REST signup, email-link verification, resend and reset.
- Preserved Google OAuth and legacy accounts; verified-email linking retains chats.
- Removed old password fallback after Firebase linking; remote refresh validation
  invalidates revoked Firebase-password sessions. Refresh credentials are encrypted.
- Added link-based UI notices, accessible resend controls, mobile and error states.
- Firebase mode requires FIREBASE_API_KEY and FIREBASE_PROJECT_ID in server env.
- No production deployment or real-email delivery test was performed.

Validation: 44 automated tests and 46 browser assertions passed with local
fixtures. Verification/reset forms were inspected on desktop, mobile, short
viewports and dark mode. Production dependency audit reported zero known
vulnerabilities at checking time. Real Firebase mail delivery remains untested.

# 1.1.1 — sidebar controls and split deployment

- Removed opaque gradient and button hover backgrounds from chat actions.
- Inline action layout prevents overlap with long chat titles; collapsed sidebar
  hides actions. Mobile and touch devices keep the controls visible.
- Keyboard access, accessible button labels, pin-focus restoration and stale
  rename-focus guard; message actions also appear on keyboard focus.
- Reduced-motion preference disables interface transitions and animations.
- Static frontend API bootstrap for pongy-ai.devs.surf → Render; local same-origin
  remains unchanged. Added exact deployment variables to README.
- No production deployment or payment-provider activation was performed.

Checks: 27 local automated tests and 32 browser assertions passed. Light/dark,
long-title, keyboard, compact sidebar and mobile views were visually inspected.
Production dependency audit reported no known vulnerabilities at checking time.

# 1.1.0 — security and reliability foundation

- Public directory separation, CSP/Helmet, DOMPurify and explicit CORS/CSRF origins.
- HttpOnly sessions, random persistent secrets, account-version token revocation.
- Hashed cryptographic confirmation codes, cooldowns and bounded guessing attempts.
- Current free-model catalog, cooldowns, zero-price constraints, bounded fallback,
  timeouts, cancellation and SSE reset events. No paid-model automatic fallback.
- Fixed chat history schema, conversation-bound streaming, serialized writes,
  error reporting, duplicate startup loads and SVG gradient ID collisions.
- Password eyes, recovery dialog stacking and short-viewport form scrolling fixed.
- Fake SBP QR and card/CVC collection removed. Real provider integration is pending.
- Browser users never enter AI keys; server deployment still needs provider credentials.

Checks: 24 local automated tests, 20 browser assertions, no reported npm-audit
vulnerabilities at the time of checking. External AI, mail, OAuth and real payments
were NOT tested with live credentials. This is not an availability guarantee.
