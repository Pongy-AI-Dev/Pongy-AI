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
