# Security notes — 1.2.0

- Only `public/` is exposed over HTTP; databases, source code, environment and
  generated secrets are outside it. CSP forbids inline JavaScript and framing.
- DOMPurify sanitizes rendered Markdown. Server validates field types, chat
  sizes, roles and nickname lengths. Context limits and output caps apply.
- HttpOnly session cookies, explicit origins, CSRF origin checks, HS256 JWT
  issuer/audience validation, account existence and session-version checks.
- OAuth uses state verification and verified Google email. Redirects never
  include JWT. OAuth has not been tested against a live Google account here.
- Legacy passwords use bcrypt cost 12. App registration passwords require 8+ characters and at most
  72 UTF-8 bytes. Hosted Firebase password resets follow the Firebase project
  password policy; set its minimum length to 8 for consistent requirements. Legacy passwords can still be used to log in.
- In legacy mode, confirmation codes use crypto.randomInt and HMAC hashing, expire in 10 minutes,
  allow at most five wrong guesses, have resend cooldowns and request limits.
  Reset consumes the valid code before async hashing to prevent concurrent replay.
- Provider fetches have timeouts, bounded fallback, client cancellation and
  output backpressure. Provider key errors are not exposed as user login errors.
- Subscription purchases are intentionally unavailable until a payment provider
  is chosen and integrated. No fake activation, card/CVC capture or demo QR.

Limits: rate limits and model health are in-process. For multiple replicas,
use a shared rate-limit store and appropriately shared storage/secrets. This
is not a penetration-test certification or an availability guarantee. Deploy
behind correctly configured HTTPS, keep dependencies patched and back up SQLite.

Never commit `.env`, `data/`, database files or real credentials.
The vendored DOMPurify asset and its license must be updated together.

Firebase mode:
- Credentials are sent from the server to the fixed Google HTTPS REST endpoints.
- Email verification is checked using Google accounts:lookup. A client-supplied
  UID or verified flag is never accepted. The token project and user are checked.
- Local accounts link by a verified email only; the old local password is removed
  and old local sessions are revoked when linking. History is retained.
- Firebase refresh credentials are encrypted with AES-256-GCM inside the signed
  HttpOnly session cookie, bound to the Firebase UID, never exposed in response
  JSON or localStorage. Every Firebase-password authenticated request rechecks
  refresh validity with Google; revoked or disabled sessions fail closed.
- Provider/network errors return a failure, not a false login or sent-email result.
- Google OAuth sessions remain independently authenticated through the existing
  verified Google provider; a Firebase password change is not a Google sign-out.
- Firebase uses hosted link verification/recovery, not the legacy six-digit routes.
  Quotas and delivery policies remain controlled by Firebase. No live credentials
  or real user accounts were used in the automated fixture tests.
