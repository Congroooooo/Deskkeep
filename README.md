# Deskkeep

A private, local-first desktop workspace for Windows. It keeps logins, notes, tasks, calendar items, income, and subscriptions in one encrypted vault on your own computer. No account, no cloud sync, no telemetry.

For the product goals and the problem it solves, see [PROJECT_BRIEF.md](PROJECT_BRIEF.md). The longer requirements and design documents are in [`outputs/`](outputs/).

## Features

- **Credential vault:** save logins with username, password, website, tags, folders, and favorites. Copy a password to the clipboard, and it clears after a set time. Grid or list view.
- **Brand and site icons:** each login or subscription shows its brand logo or its website's own icon, with initials as the fallback.
- **Password generator:** set length and character types, check strength, and use the result for a new login.
- **Notes:** write in Markdown with a live preview, or import `.md` and `.txt` files.
- **Tasks:** a three-column board (To Do, In Progress, Completed). Drag a task between columns to change its status.
- **Calendar:** month, week, and year views, with a dialog for each day's items and a details view for each task or income entry.
- **Income:** log earnings by source, amount, currency, category, and date, with a monthly total and a trend chart.
- **Subscriptions and licenses:** track price, billing cycle, and next payment date. Mark a payment as paid, pause a subscription, and see monthly and yearly totals and upcoming renewals.
- **Dashboard:** totals, overdue tasks, income activity, recent logins, upcoming tasks, renewals, world clocks, and vault status.
- **Global search:** press Ctrl+K to search logins, notes, tasks, income, and pages.
- **Security:** AES-256-GCM encryption with a key derived from your master password (Argon2id). A one-time recovery code, automatic locking after inactivity, and clipboard clearing.
- **Backup and restore:** export an encrypted `.dkbackup` backup and restore it with your master password. CSV import and export are available, but plain-text CSV files contain readable passwords.
- **Appearance:** light and dark themes, an accent color, and a compact monospace layout.

## Getting started

Requirements: Windows, Node.js, and npm.

```bash
npm install
npm run dev        # starts the dev server and the desktop app
```

Other useful commands:

| Command | What it does |
| --- | --- |
| `npm run dev:web` | Runs the interface in a browser at `http://127.0.0.1:5173`, with a local preview store instead of the encrypted vault. |
| `npm start` | Starts the Electron app directly. Use `npm run dev` during development. |
| `npm run build` | Type-checks and builds the interface into `dist/`. |
| `npm test` | Runs the unit tests. |
| `npm run test:e2e` | Runs the Playwright tests, including one that launches the real desktop app. |
| `npm run package` | Builds and packages a Windows app. |

## Where your data is stored

The vault lives in Electron's user data folder for this app:

```
%APPDATA%\deskkeep\
  deskkeep.sqlite        encrypted vault (with -wal and -shm companion files)
  Preferences        window and browser settings
```

Backups you export go wherever you choose. CSV exports are plain text.

To start over, delete those vault files with the app closed. This cannot be undone. The in-app reset (Settings → Data) needs your master password to unlock first.

## Branding

The logo, icon, and intro video are in [`branding/`](branding/): a flat "D" with a keyhole on a desk line, in the app's steel blue and dark surface colors. `branding/PROMPTS.md` has prompts for recreating the logo and the animation with other tools.

## Project layout

```
electron/          desktop main process, preload bridge, and encrypted vault code
src/               React interface (App.tsx, styles.css, brands, Markdown)
src/brandCatalog.json   bundled logo set used for brand icons
tests/             unit tests (vitest) and end-to-end tests (Playwright)
scripts/           packaging helpers and the brand catalog generator
outputs/           requirements, technical design, and handoff documents
```

## Testing

- `npm test`: unit tests for the vault logic.
- `npm run test:e2e`: browser and desktop tests. The `electron-website-icon` test needs internet access, because it fetches a real website icon.

## Security notes

- Your data never leaves your computer. Website icons are fetched directly from each site, not from a third-party service.
- Forgetting the master password means the vault cannot be opened unless you have the recovery code.
- Do not commit the `.dkbackup` backups, the vault files, or CSV exports to version control.
