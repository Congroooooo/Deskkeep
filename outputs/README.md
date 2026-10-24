# Deskkeep — foundation pack

This folder is the approval-stage specification pack for **Deskkeep**, a private, local-first desktop vault and personal workspace inspired by the product capabilities studied in KeepR, but designed as an original product.

## Product name

**Recommended name: Deskkeep**  
*Your private corner for passwords, plans, notes, and money.*

The name gives the product a personal, playful identity while still implying a protected place. `Deskkeep` is the short product label for navigation and the executable; `Deskkeep` is the public name. This is a preliminary naming recommendation, not trademark or domain clearance. A quick web screen found conflicts for `Nivault`, `NikoNest`, and `Nixo`, so those are intentionally excluded.

Other viable directions:

| Name | Positioning | Decision |
|---|---|---|
| **Deskkeep** | Private, personal, warm | Recommended |
| **NB Deskkeep** | Short, developer-brand aligned | Backup |
| **Deskkeep by nbDev** | Product + studio relationship | Brand architecture option |
| **Nicko HQ** | More professional/productivity-led | Less distinctive |

## Foundation decisions to approve

The documents use the following defaults. They are intentionally chosen to prevent later architectural rework.

1. **Windows-first native desktop app**; macOS and Linux become supported only after a packaged Windows release passes security and recovery tests.
2. **One person, one local vault.** No account, server, telemetry, collaboration, sync, browser extension, autofill, or AI in v1.
3. **Feature parity at the product level** with the reference: vault, notes, tasks, calendar, income, folders, favorites, generator, activity log, and settings/recovery.
4. **Privacy over remote convenience.** The vault works entirely offline. A future optional end-to-end encrypted sync product would be a separate architecture decision, not a hidden v1 dependency.
5. **Electron + React + TypeScript** with a sandboxed renderer and a narrow, typed IPC boundary. Sensitive data stays in the main-process vault service.

## Reading order

1. [PRD](01_PRD.md) — what to build and how success is judged.
2. [TRD](02_TRD.md) — technical contracts, storage, crypto, and quality gates.
3. [System flow](03_SYSTEM_FLOW.md) — user journeys and state transitions.
4. [System design](04_SYSTEM_DESIGN.md) — components, trust boundaries, data relationships, and tradeoffs.

## Implementation status

The approved foundation is now implemented in the project root. It includes the Electron desktop shell, encrypted local vault, onboarding and recovery, credentials, notes, tasks, calendar, income, folders, favorites, password generation, activity history, settings, encrypted backup/restore, plaintext CSV export, and the original Deskkeep interface.

Run the development app from the project root with:

```powershell
npm install
npm run dev
```

Validate and package it with:

```powershell
npm run build
npm test
npx electron-rebuild -f -w better-sqlite3 -w @node-rs/argon2
npm run package
```

The packaged Windows application is generated at `release/Deskkeep-win32-x64/Deskkeep.exe`. It is currently unsigned; a production distribution must add Windows code signing and installer generation.
