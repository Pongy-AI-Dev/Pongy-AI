# Security notes — 1.4.1

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

## Attachments and cloud storage

- User-owned attachment IDs only; no remote URL fetching or executable file serving.
- Images are validated by actual format, bounded and re-encoded without metadata.
- PDF/DOCX extraction runs in isolated worker threads with time/memory bounds.
  XML external entities are prohibited; archive expansion and entry counts are bounded.
- Documents retain extracted text, not the original binary. PDF scans need image upload.
- Firestore requests use Firebase ID tokens and per-UID verified-email security rules.
  Refresh credentials stay encrypted inside HttpOnly JWTs, not in Firestore documents.
- Cloud session records prevent local identity loss from accepting a different account
  and persist per-session logout revocation. Stable server secrets remain mandatory.
- Other-chat context is opt-in, own-account-only, limited to recent user messages.
- Search snippets and page text are reference material, never trusted instructions.
- This does not guarantee that a model will always follow instructions or avoid errors.

## Tool calls and generated files

- Tool names, arguments, paths, action count and attachment count are bounded.
- Generated code is stored for download, never executed. Downloads are account-scoped
  and use attachment disposition; arbitrary generated HTML/SVG is not served inline.
- ZIP parsing runs in the bounded document worker. Entry/expansion/size limits,
  UTF-8 checks and traversal, symlink and encrypted-archive rejection apply.
  Credentials and dependency folders are excluded from normalized archives.
- Research source links accept public HTTPS URLs; private/literal special addresses are rejected. Photo embeds
  accept upload.wikimedia.org only. Model-supplied page URLs are fetched only by the protected read_page reader.
- Image generation is off by default and requires explicit owner configuration
  and a user request. Paid-image quotas are in-process; set a provider key spending
  limit separately. Quotas reset on restart and are not a billing guarantee.
- Official image endpoint responses are bounded and image bytes revalidated.
  Sources reflect retrieved material, not proof of model factual accuracy.

## Public web reader

- Tavily/Brave Search keys stay server-side and are sent only to their fixed API endpoints;
  automatic redirects on the keyed API request are prohibited.
- Pages use HTTPS GET only, no user cookies/credentials and no JavaScript or forms.
- All DNS results are checked against special/private IP ranges; a validated IP is
  pinned into the HTTPS lookup while original hostname TLS verification is retained.
- Each redirect is validated again; maximum three redirects, a 15-second deadline,
  one-megabyte body and text-only content types. Compressed responses are rejected.
- No claim of full interactive-browser compatibility or prompt-injection immunity.

Tavily integration uses basic search with auto_parameters disabled. A configured
Tavily key takes precedence over Brave; failed Tavily requests never automatically
fall back to Brave. Keep the provider account on its free plan without pay-as-you-go
if no charges are wanted; application code cannot enforce provider billing settings.
