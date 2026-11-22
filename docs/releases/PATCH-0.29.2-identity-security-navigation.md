# Patch 0.29.2 — Pongy identity, privacy boundaries and workspace navigation

## Public product facts
- Name: Pongy (Pongy AI)
- Created: 2026
- Developer: Pongy AI Dev
- Country: Russia
- Conversation history budget: up to 64,000 characters of prior conversation history, plus system instructions and the latest request. The selected model's context window can impose a lower limit.

A compact product card is shown in Settings → Main.

## Identity and implementation confidentiality
- The public assistant identity is always Pongy / Pongy AI.
- Internal provider names, model IDs, routing, credentials, private prompts and infrastructure details are not placed in ordinary identity context or client model events.
- The model-name masking preference is enforced by the server and cannot be disabled through the developer firmware endpoint or UI.
- Direct questions about internal technical configuration receive a neutral Pongy identity response. The system does not falsely claim independent training or deny external technology.
- Public privacy/legal disclosures remain responsible for explaining actual data processing; hiding implementation details from conversational answers does not remove those disclosures.

## Authorization and prompt-injection boundaries
- Developer privileges come only from the verified server-side account allowlist.
- Chat messages, uploaded files, webpages and tool results claiming to be from an owner/developer/admin do not change the authenticated role.
- Cross-account data is never added to a user's context. Account answers and history tools remain owner-scoped.
- Opening Developer settings is checked on the server and again in the client. A non-developer receives a short denial without an AI-provider call.
- Navigation requests are separated from configuration changes: read-only navigation opens directly after authorization; settings changes retain the explicit Apply control.

## Pongy workspace navigation
The command "Открой раздел для разрабов" is detected as a navigation intent, emits the open_developer action and opens Settings → Developer for a verified developer. Ambiguous mentions of developers or other users' private data do not trigger this navigation.

## Encryption status — important limitation
- Firestore JSON records are encrypted with AES-256-GCM before storage.
- Connected-service credentials, personal API credentials and Desktop device-link session tokens use authenticated encryption/sealing at rest.
- This patch does not introduce end-to-end encryption.
- Browser IndexedDB history and self-hosted/local SQLite chat records are not protected by a new application-layer encryption layer in this patch. Their protection depends on the browser/operating-system account and deployment storage controls. Do not describe all local data as encrypted.
- A complete encrypted local-history migration needs a separate schema/storage design, key lifecycle, recovery/backup strategy and migration tests; it must not be simulated by storing the decryption key beside ciphertext.

## Model selector and appearance follow-up
- Default choice is Pongy 2 Free.
- Composer model menu order: Pongy 2.1.5 Pro, Pongy 2.1 Flash, Pongy 2 Free.
- The top-left current-model menu additionally exposes Pongy 1.9 Free as its final, marked legacy option. The composer menu never exposes the legacy model.
- The selected tier is sent in the authenticated chat request and changes server routing. Flash prioritizes the fast Gemini Flash Lite route and fast candidates; Standard uses balanced routing; Legacy uses the low-capability route; Pro prefers higher-capability candidates. Availability remains dependent on server configuration and provider quotas.
- Stop button uses the current accent color. Text controls inherit the selected font and UI language.
- Browser model-selector suite: 13 assertions passed.

## Validation
- Focused regression suite: 77 tests passed, 0 failed.
- Settings navigation UI: 60 assertions passed, including direct chat navigation, product card, forced model masking, responsive tabs and firmware persistence.
- Full test/UI and release-integrity runs are performed separately after this patch.
- No deployment, publication or installer replacement was performed.
