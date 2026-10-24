# Product Requirements Document — Deskkeep

**Status:** Approval draft  
**Product:** Deskkeep  
**Platform:** Windows desktop, offline-first  
**Primary user:** Nicko, a security-conscious individual who wants one private workspace for credentials and day-to-day personal operations.

## 1. Product statement

Deskkeep is a private desktop workspace that securely stores credentials and keeps the user's notes, tasks, calendar, folders, favorites, and income records together without requiring an online account or cloud service.

It must feel like one coherent, calm desktop app—not a password manager with unrelated mini-apps bolted on. The vault is the security anchor; organization and daily action are the product value.

## 2. Goals and boundaries

### Goals

- Protect confidential credentials with a master-password-encrypted local vault.
- Make password, note, task, calendar, and income work quick enough to use every day.
- Keep all v1 data usable without an internet connection.
- Give the user safe recovery, encrypted backup, import/export, auto-lock, and clear destructive-action safeguards.
- Provide polished light/dark desktop UI, keyboard-friendly actions, and readable empty/loading/error states.

### Explicit non-goals for v1

- Multi-user sharing, roles, teams, hosted accounts, social features, or collaboration.
- Cloud sync, remote backup, analytics, ads, telemetry, AI, browser extension, automatic web form fill, or mobile companion app.
- Bank connections, invoices, budget planning, tax calculations, payments, or financial advice.
- Browser-like rendering of arbitrary web pages in the app.

## 3. User stories and functional requirements

| Area | Required v1 behavior | Acceptance signal |
|---|---|---|
| First run & unlock | User creates a master password, receives a one-time recovery code, and unlocks the vault locally. Failed unlock never exposes data. | A new vault can be created, locked, reopened, and unlocked after restart. |
| Dashboard | Show credential/note/task totals, overdue and upcoming work, recent credentials, income summary/trend, optional world clocks, and protection status. | Each widget reflects vault data and links to its source module. |
| Credential vault | Create, read, update, delete, search, filter, reveal, copy, favorite, tag, and folder credentials. Fields: title, username/email, password, URL, notes, tags, folder, favorite. | Search and views never persist plaintext outside the unlocked session. |
| Password generator | Choose length and uppercase/lowercase/numbers/symbols; show strength; regenerate/copy; insert into a new credential. | Generated password meets selected character rules. |
| Notes | Create, edit, preview, duplicate, favorite, move, search, folder-filter, and delete rich/markdown-style notes. | Content, title, labels, and folder persist when vault relocks/reopens. |
| Tasks | Create/edit/delete tasks with title, description, due date, status, priority, and up to five tags; mark complete; search/filter/sort. | Status is reflected on dashboard and calendar. |
| Calendar | Week, month, year, previous/next/today navigation; show task due dates and income entries; add task from the selected date. | Calendar totals reconcile with task/income records. |
| Income | Create/edit/delete/search/filter income with source, amount, ISO currency, date, category, and notes; show month/all-time/top-category summaries and trend; CSV export. | Totals use decimal-safe arithmetic and correct date filtering. |
| Folders & favorites | Separate credential folders and note folders; create/rename/color/favorite/delete; grid/list and sorting. Favorites aggregate folders, credentials, and notes. | Deleting a non-empty folder requires an explicit move/delete choice. |
| Activity | Record security and material data events locally: vault create/unlock/lock, recovery actions, CRUD, backup/import/export/reset. Clear log is explicit and auditable. | Events are append-only until the user clears them. |
| Settings | Account display name/avatar; theme/accent/font; icon-fetch privacy control; auto-lock; clipboard timeout; recovery code; master password change; backup/import/export/reset; about. | Every setting is local and affects behavior predictably. |
| Backup & recovery | Encrypted backup export/import is available while unlocked; CSV is clearly warned as plaintext; reset requires typed confirmation. | Backup restores a fresh local data directory; reset cannot be triggered accidentally. |

## 4. Core experience rules

- The app opens locked. Locking or idle auto-lock removes secret-bearing UI state and clears the session key from memory as far as the runtime permits.
- Secret reveal and clipboard copy are deliberate actions with visible feedback; copied passwords are cleared after the chosen timeout.
- Every irreversible action explains scope before confirmation. Export warns about plaintext CSV.
- A remote icon lookup is opt-in and may send only a site domain; it never sends a username, password, or full credential URL.
- The user can work with all v1 modules offline.

## 5. Success criteria

### Product acceptance

- A user can complete the first-run → create credential → generate password → lock → unlock journey without documentation.
- The dashboard, calendar, and favorites update after source records change.
- A local encrypted backup can restore all supported v1 records into a clean test profile.
- CSV import has mapping/validation feedback and cannot silently overwrite data.
- App restart and packaged Windows build retain data integrity.

### Quality and security acceptance

- No plaintext master password, credential password, note body, or recovery code is written to logs, crash reports, analytics, or normal SQLite fields.
- Renderer has no Node integration, runs sandboxed and context-isolated, and receives only allowlisted IPC methods.
- Unit, integration, and packaged-app acceptance suites cover lock/unlock, encryption round trip, migration, backup/restore, import rollback, and reset confirmation.
- Keyboard focus, labels, contrast, and destructive-action confirmations pass the agreed accessibility review.

## 6. Release plan

| Milestone | Outcome | Gate |
|---|---|---|
| M0 — foundation | Electron shell, unlock flow, encrypted local vault, design tokens, typed IPC | Threat model reviewed; no sensitive logs |
| M1 — vault | Credential CRUD, generator, folders, favorites, auto-lock, clipboard safety | Vault/restart/lock tests pass |
| M2 — workspace | Notes, tasks, calendar, dashboard | Cross-module reconciliation tests pass |
| M3 — money & portability | Income, activity, encrypted backup, CSV import/export, recovery/reset | Clean-profile restore and reset tests pass |
| M4 — release | Hardening, Windows packaging/signing strategy, accessibility, update policy | Packaged acceptance report passes |

## 7. Metrics

There is no external analytics in v1. Release quality is measured locally: automated-test pass rate, successful clean-profile restore, launch/unlock latency on supported hardware, startup/crash failures observed during manual QA, and accessibility checklist completion.
