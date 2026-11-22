# Pongy AI 0.29.2 — persistent desktop sign-in bridge

## Scope

This local patch hardens the existing Pongy Desktop browser-assisted sign-in flow. It does not publish the website or rebuild the Windows installer.

## Flow

1. Pongy Desktop starts a short-lived device-login challenge.
2. The user signs in on the official Pongy AI website in the system browser.
3. The website displays the challenge code and asks the signed-in user to confirm the matching desktop request.
4. The desktop polls using its one-time random secret and receives the approved Pongy session.
5. The app continues using the authenticated Pongy backend; provider API keys remain server-side.

## Changes

- Device-login challenges now persist in the same SQLite database as the server, so a process restart during the five-minute approval window does not silently invalidate a pending login.
- The desktop polling secret and approval code are stored as SHA-256 digests; the short-lived display code is retained only for the confirmation window.
- The approved session token is encrypted at rest with AES-256-GCM using the stable history-encryption key; it is decrypted only for one-time delivery to the matching desktop challenge.
- Secret comparisons use constant-time equality; approval and token delivery are one-time and expiry-bound.
- The pending challenge table is indexed by expiry and stale rows are pruned.
- Added a regression test proving the flow survives recreation of the service instance, rejects the wrong secret/code, prevents replay and expires.

## Security boundaries

- No provider API key is sent to Pongy Desktop. The backend routes AI requests using server-configured providers.
- This bridge authorizes the Pongy account session; it does not grant arbitrary Windows filesystem, shell or application access.
- Smart PC permissions remain separately gated by product entitlement and native consent.
- The existing app flow still requires a website deployment to make the server-side change available to users.

## Verification

- Focused device-link, local-auth and OAuth tests passed.
- Full `npm run check` passed.
- Full `npm test`: 878 tests, 877 passed, 0 failed, 1 skipped.