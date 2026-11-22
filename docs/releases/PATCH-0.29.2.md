# Pongy AI 0.29.2 — Release notes

This update improves everyday reliability, settings, local persistence, file handling, and the native application workflow.

## Additional local continuation

- The chat header now exposes the selected model separately from the reasoning selector: Pongy 1.9 Free, Pongy 2 Free, and Pongy 2.1 Pro. Plus-only selections are disabled without an active entitlement and fall back when the entitlement expires.
- Reasoning levels map to provider-supported effort parameters. Model tiers affect candidate routing; they do not guarantee a fixed intelligence level independent of provider availability.
- A policy classifier combines high-confidence model review with deterministic safeguards. It creates reviewable reports and developer notifications. Four distinct flagged requests within 30 days trigger a seven-day AI restriction and a 30-day device restriction; users can appeal and developers can revoke the action.
- The floating Direct Support chat supports user conversations, developer inbox/replies, complaint attachment, message copy/time metadata, and an automatic acknowledgement. Message bodies are encrypted at rest with AES-256-GCM.
- Firestore JSON payloads (including saved chat history) are encrypted with AES-256-GCM using a separate persistent history key. Legacy plaintext records are migrated on read.
- User moderation details/actions, report status controls, the accent-aware logo, and compact footer spacing have been refined.

## Main changes

- **Chat archive:** conversations can be archived without deletion and restored later. Archive state is retained in local history and synchronized through the authenticated chat API; archiving the active or last live chat switches to a fresh active conversation.
- **Chat drafts:** message drafts are stored per chat and account and restored after reload.
- **Settings persistence:** account settings restore more consistently across sessions and devices; older values should not overwrite newer saved settings.
- **Usage limits:** the free tier has an 80-unit weekly allowance and Plus has 500 units. Consumption depends on request length, complexity, selected model, and reasoning mode.
- **Subscription access:** paid model options are no longer retained after Plus expires.
- **Files:** document and archive reading is more reliable; unsupported formats are not presented as valid extracted content.
- **Code and projects:** code responses can be saved as individual files or ZIP project archives with folder structure preserved.
- **Smart PC and downloads:** the Windows download flow offers only Pongy Desktop MSI and PongX ZIP. Smart PC remains gated by the required purchase/entitlement.
- **PongX:** a separate local tool that requests approval before file changes, creates rollback backups, and works within the selected workspace.
- **Extensions and connections:** improved extension and connected-service management.
- **Motion and media:** improved handling of motion/video workflows and generated assets.
- **Interface:** refined dialogs, fields, buttons, settings navigation, and narrow-screen layouts.
- **AI discussion policy:** controversial historical and political topics are not treated as automatic refusal triggers; safety restrictions remain for requests that would facilitate real-world harm.

## Sound and appearance

- Sound controls are grouped in one expandable Settings subsection.
- The sound toggle is on by default; there is no separate volume slider in this release.
- The standard accent palette contains five colors in one row. Additional colors are available only when the relevant beta feature is enabled.
- Smooth interface motion is enabled by default; reduced motion remains available.
- The default interface language is English.

## Applications

- Windows: Pongy Desktop MSI and PongX ZIP — exactly two Windows download choices.
- Android: Pongy AI APK in the separate mobile download flow.
- There is no portable Pongy ZIP or BAT launcher in the 0.29.2 download flow.
- The Windows MSI is not Authenticode-signed. The Android APK is signed with the Pongy AI Dev development certificate.

## Important

- All changes are in the separate local working copy. GitHub and Render have not been updated.
- Sign-in, AI responses, search, and synchronization require an internet connection.
- Some features depend on account entitlements and connected services.
- Build details are in [BUILD-0.29.2.md](BUILD-0.29.2.md); verification limits are in [TEST-0.29.2.md](TEST-0.29.2.md).
