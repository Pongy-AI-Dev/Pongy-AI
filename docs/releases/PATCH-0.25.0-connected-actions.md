# Pongy AI 0.25.0 — Connected data, reminder management, wake focus

## Apply on top of 0.24.3

This is a changed/new-files overlay, not a replacement repository. Extract into the repository root with file replacement, commit and deploy both the frontend and Render backend. Keep all older documentation, `.env`, databases, persistent storage and downloads. No migrations that delete user records, new npm dependencies or new OAuth scopes are introduced. Existing OAuth client IDs/secrets and callback URLs stay unchanged. Native version markers are updated, but MSI/APK installers are **not** rebuilt or replaced.

Render: retain the persistent data disk and permanent `SESSION_SECRET`, including for encrypted connection tokens. Frontend: `https://pongy-ai.devs.surf`; API: `https://pongy-server.onrender.com`. If your Render service has no persistent disk, redeployment can still lose SQLite data: this patch cannot make an ephemeral disk persistent.

## Connections: actual reads, not invented account contents

On a named-service request the server fetches a bounded read-only snapshot from the authenticated user's connection before generating an answer. A maximum of two services is prefetched per request. Results/errors and the API request are included as private, untrusted reference data. Missing connections are not silently treated as empty accounts. Credentials are never included in model context.

The assistant can then call `read_connection` to inspect the selected message, event or file. A narrow follow-up such as “прочитай второе письмо” can reuse a service explicitly selected in the last five user messages; assistant text never grants access. General greetings and connection setup questions do not trigger reads. Public web/image/research tools are excluded for connected-data requests to prevent private data being sent to public search services.

Examples:

- `Покажи мои репозитории GitHub`
- `Прочитай GitHub owner/repository/path/to/file.js`
- `Найди в Gmail «from:sender@example.com newer_than:7d»`, then `Прочитай первое письмо`
- `Найди в Google Drive «Бюджет»`, then ask to read the selected document
- `Покажи мой Google Calendar`
- `Покажи каналы Slack`, then ask to read a selected public channel
- `Прочитай события Google Calendar и подготовь напоминание о выбранной встрече` — service content must first be read by the service tool; a separate tool opens a reminder draft, never saves it automatically.

Supported scope remains deliberately limited:

- GitHub: up to 10 repositories; up to 50 directory entries per read; text files up to 100 KB / 48,000 displayed characters, on the default branch. No branch guessing from `blob` URLs, issue/PR mutations or code execution.
- Gmail: up to 10 envelopes with sender/subject/date, then selected message plain text. No attachments or HTML-only message body decoding. Search uses Gmail query syntax.
- Drive: file-name search and supported Google Docs/Slides plain text, Sheets first-sheet CSV. Other binary files return metadata only.
- Calendar: selected event or up to 10 upcoming primary-calendar events, optionally text search. No calendar writes.
- Slack: up to 10 public channels and 20 selected-channel messages. No DMs, posting or workspace-wide search.

Existing permissions are **read only**. This patch does not send email/messages, change external files, create Calendar events or silently expand OAuth permissions. Private results go to the configured AI provider, as explained in Connections; do not connect accounts if that is inappropriate for their data policy. External authorization availability, revoked tokens, provider quotas and LLM quality still apply. OAuth tests use controlled responses, not the user's live Google/GitHub/Slack accounts.

## Reminder conversation

- `Покажи мои напоминания` lists this account's real saved schedules and enabled/completed status.
- `Перенеси напоминание «Проверить отчёт» через 20 минут` opens the existing reminder with a new schedule; title/description are preserved. Nothing changes before Save.
- `Отмени напоминание «Проверить отчёт»` opens a separate confirmation. Closing it keeps the reminder active. Confirming sends an authenticated account-scoped PUT disabling the existing record; success is shown only after the API succeeds.
- Exact titles are used. Several matches require clarification; no guessing or mass cancellation. Questions such as “Как отменить напоминание?” are not mutations.
- Existing create-from-chat, explicit date/time/missing-field behaviour and due notification delivery remain. Browser/OS notification permission, push configuration and server email configuration are still required for their respective channels. A patch cannot bypass browser permissions or make a sleeping Render service deliver on time.

## Voice wake / foreground behaviour

Wake detection requests native `bringToFront` (when the installed app exposes the existing bridge) and best-effort `window.focus()`. Hidden browser tabs cannot guarantee automatic focus over another tab or other application. When notification permission is already granted, a service-worker notification targets the **originating tab**, not the first tab/account on the same origin; clicking focuses it. If no worker exists, a desktop Notification is attempted. No permission request is shown without a user gesture.

The pending wake is held in memory for at most 60 seconds and command dictation begins only when the document becomes visible, voice activation is still enabled and the account is ready. No duplicate dictation on repeated visibility events. Expired wake or disabled activation does not begin recording. The notification stores only an ephemeral nonce/client ID/timestamp, not audio, command text or credentials. If the originating tab is gone, clicking opens the site without automatic recording.

Background microphone suspension, mobile OS restrictions, microphone permissions and personal voice-template quality remain device dependent. There is no claim of always-on-top web access or validated recognition of the user's real microphone. This patch does not install a native foreground helper or rebuild an installer.

## Validation

New tests cover connected API snapshots in actual HTTP chat calls, user-account isolation, no credential/model leakage, private-data/public-research separation, Gmail envelopes, bounded GitHub directories, reminder proposals and confirmations, hidden/expired/disabled wake and service-worker notification targeting. Existing unit/server and Chromium UI suites are run. Firefox/WebKit must be checked by CI: those engines cannot be run locally on this Amazon Linux environment with its missing system libraries.

### Recorded verification for this patch

- Full unit/server run: 626/626 passed, including a run on the extracted overlay.
- Full Chromium UI run: 45/46 suites passed. `session-ui.cjs` timed out waiting for the offline deferred-delete HTTP response; its unchanged test passed separately on repeat (39 assertions). This is not represented as a clean 46/46 single run.
- Updated reminder flow passed separately with 52 assertions, including mobile confirmation; connected-service HTTP/permission tests passed separately (26 tests in the focused group).
- Source/release checks and overlay byte/manifest verification passed. New cancellation form inspected on desktop, mobile and actual dark theme.
- No live account authorization or user-microphone accuracy test was performed.
