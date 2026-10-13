# Security notes — 1.1.0

- Only `public/` is exposed over HTTP; databases, source code, environment and
  generated secrets are outside it. CSP forbids inline JavaScript and framing.
- DOMPurify sanitizes rendered Markdown. Server validates field types, chat
  sizes, roles and nickname lengths. Context limits and output caps apply.
- HttpOnly session cookies, explicit origins, CSRF origin checks, HS256 JWT
  issuer/audience validation, account existence and session-version checks.
- OAuth uses state verification and verified Google email. Redirects never
  include JWT. OAuth has not been tested against a live Google account here.
- Passwords use bcrypt cost 12. New passwords require 8+ characters and at most
  72 UTF-8 bytes. Legacy passwords can still be used to log in.
- Confirmation codes use crypto.randomInt and HMAC hashing, expire in 10 minutes,
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
