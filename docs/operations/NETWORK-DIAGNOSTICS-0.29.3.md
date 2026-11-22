# Pongy AI 0.29.3 — network and authentication diagnostics

Date: 22 November 2026

## Observed public deployment

Read-only checks were run from the connected development desktop. Three GET requests were made to each endpoint:

| Endpoint | Result |
|---|---|
| https://pongy-ai.devs.surf/ | 3/3 HTTP 200; 147–1305 ms |
| https://pongy-ai.devs.surf/healthz | 3/3 HTTP 200; 89–93 ms |
| https://pongy-ai.devs.surf/api/config | 3/3 HTTP 200; 89–93 ms |
| https://pongy-server.onrender.com/healthz | 3/3 HTTP 200; 97–543 ms |

The public `/api/config` response identifies the live site version as **0.29.1**, with Firebase authentication enabled. The current local source and Android package are **0.29.3**. The new local changes have not been deployed.

These checks establish reachability only from the development desktop's current network. They do not establish VPN-free reachability, availability in the user's region, or stable routing across other ISPs. VPN-free tests were not possible from the user's affected networks.

## Request routing and sign-in

- The local frontend resolves `API_URL` to `location.origin` when no explicit public API URL is configured. The local `public/app-config.js` sets an empty API URL, so normal browser API calls are same-origin.
- The live public configuration reports `authProvider: firebase`.
- Server-side Firebase Authentication uses Google's `identitytoolkit.googleapis.com` and `securetoken.googleapis.com` endpoints. If the backend cannot reach Firebase, sign-in, registration, verification and session refresh can fail even while the public landing page and health endpoint load.
- No credentials, API keys, cookies, account data or user messages were sent during these checks. No login attempt was made.

## What code can and cannot repair

The 0.29.3 local patch improves Android system insets, startup recovery and the native loading timeout. It cannot repair an ISP/DNS/TLS route that blocks the public hostname before the app receives HTML. It also cannot make Firebase reachable from a server whose outbound network cannot reach Google's authentication endpoints.

A durable VPN-independent rollout requires a hostname and hosting path reachable by the affected users, valid TLS, and a correctly configured same-origin API reverse proxy (or an explicitly configured API origin). This requires control of the domain/DNS and hosting deployment. Do not use an arbitrary third-party proxy or disable TLS verification.

## Required external validation

1. Test the current public hostname from each affected mobile network with VPN fully disconnected.
2. Record whether failure occurs before HTML loads, at `/healthz`, at `/api/config`, or only during sign-in.
3. If the page loads but sign-in fails, capture the visible error and timestamp; the server logs should be checked for Firebase upstream timeouts and HTTP status.
4. After the 0.29.3 frontend/server release is deployed, repeat the same checks and verify that `/api/config` reports 0.29.3.
5. If the hostname itself is unreachable without VPN, plan a controlled custom-domain/CDN migration rather than changing application JavaScript repeatedly.

No DNS, domain, hosting, GitHub, Render, OAuth, Firebase or production deployment settings were changed.
