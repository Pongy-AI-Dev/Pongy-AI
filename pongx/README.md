# PongX 0.1.0

PongX is a local terminal coding assistant connected to your Pongy AI account.

## Requirements

- Windows 10/11
- Node.js 22 or newer
- An active Pongy AI account

## Install

1. Extract the archive.
2. Right-click `Install-PongX.ps1` and choose **Run with PowerShell**, or open PowerShell in this folder and run:
   `powershell -ExecutionPolicy Bypass -File .\Install-PongX.ps1`
3. Close and reopen the terminal.

## First launch

Run:

```powershell
pongx login
```

PongX signs in directly with Pongy, creates a Pongy API key after your confirmation, and stores it encrypted with Windows DPAPI for your Windows account. Your password is not saved. If a key already exists, PongX warns before rotating it because rotation invalidates other integrations.

Then select a project:

```powershell
pongx open "C:\path\to\project"
```

Or start PongX from a project folder with:

```powershell
cd C:\path\to\project
pongx open .
```

## Commands

- `/open <folder>` — select a workspace.
- `/new <folder>` — create a new project folder in the current directory.
- `/files` — list readable project files.
- `/read <file>` — add a text file to the AI context.
- `/undo` — revert the last applied file change set.
- `/test` — run the project's existing `npm test` and `npm run check` scripts after confirmation.
- `/clear` — clear chat and selected file context.
- `/help` — show commands.
- `/quit` — exit.

## Safety

- PongX works only inside the folder you select.
- It skips credentials, `.env` files, Git internals, dependencies and symbolic links.
- It does not execute arbitrary shell commands.
- Every proposed file change is previewed and requires your confirmation.
- Before writing, PongX creates a backup outside the project. Use `/undo` to revert the last change set.
- The API key is not stored in the project folder. On Windows it is encrypted with DPAPI and can only be decrypted by the same Windows user account.
- `pongx logout` removes the local encrypted credential. Revoke the server-side key separately in Pongy settings if you no longer need it.

## Environment overrides

- `PONGY_ORIGIN` — Pongy website origin (default: `https://pongy-ai.devs.surf`).
- `PONGY_API_KEY` — use an existing Pongy API key for the current process.
- `PONGY_API_ENDPOINT` — optional endpoint override when using `PONGY_API_KEY`.
