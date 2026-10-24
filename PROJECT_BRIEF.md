# Project Brief

A context document for choosing a name and shaping the product. It describes the problem, the goals, the users, and the features. It does not name the product.

## The problem

One person who works on a computer every day ends up with personal information spread across many places:

- Passwords and logins in a browser, a notes app, a text file, or memory.
- Notes and technical references in separate apps.
- Tasks in one tool and a calendar in another.
- Income records in a spreadsheet, or not at all.
- Subscriptions and licenses, with payment dates and prices that are easy to forget.

Switching between these tools costs time. Keeping them in sync is error-prone. Most all-in-one tools store data in the cloud and need an account. Many people do not want their passwords or money records on someone else's server.

## The objective

Give one person a single, private place on their own computer for the everyday information they manage, with no account required, no cloud dependency, and no tracking.

## Goals

1. **Everything in one place.** Logins, notes, tasks, calendar items, income, and subscriptions live in one workspace.
2. **Private by default.** All data is encrypted on the device with a key only the owner knows. Nothing is sent to any service.
3. **Works offline.** The product does not depend on an internet connection, an account, or a sync service.
4. **Fast daily use.** Common actions take few steps: copy a password, add a task, log income, check the next payment.
5. **Safe to forget.** The owner can recover access with a one-time recovery code and can restore from an encrypted backup.
6. **Pleasant to look at.** A calm, compact, desktop-native interface in light and dark themes, with smooth motion that respects reduced-motion settings.

## Target user

- A developer or freelancer who works on a Windows desktop or laptop.
- Someone who manages many accounts, several income sources, and a list of recurring subscriptions or licenses.
- Someone who does not want their personal data in a cloud service.

The first version is single-user and Windows-first.

## Features

### Passwords and secrets
- Save logins with username, password, website, tags, folders, and favorites.
- Grid or list view, with search and filters.
- Copy a password to the clipboard. It clears itself after a set time.
- Show each login's brand logo or its website's icon.
- Generate strong passwords with chosen length and character types, and check their strength.

### Notes
- Write notes in Markdown with a rendered preview.
- Import existing `.md` and `.txt` files.
- Organize notes into folders and favorite them.

### Tasks and calendar
- A three-column task board: To Do, In Progress, and Completed. Drag tasks between columns.
- Priorities and due dates.
- A calendar with month, week, and year views, and a dialog for each day's items.

### Money
- Log income by source, amount, currency, category, and date. See monthly and all-time totals and a trend chart.
- Track subscriptions and licenses: price, billing cycle, and next payment date. Mark payments as paid, pause items, and see monthly and yearly totals and upcoming renewals.

### Overview and navigation
- A dashboard with totals, overdue tasks, recent logins, upcoming items, renewals, world clocks, and vault status.
- Global search (Ctrl+K) across logins, notes, tasks, income, and pages.

### Security and recovery
- Encryption at rest with a key derived from the master password.
- A one-time recovery code shown at setup.
- Automatic locking after a period of inactivity.
- Encrypted backup export and restore.
- CSV import and export, with a clear warning that CSV files are plain text.

### Appearance
- Light and dark themes, an accent color, and font size options.
- Compact, information-dense layout with motion for transitions.

## Principles

- Local is the default. Offline is not a fallback mode.
- Secrets appear only when the owner deliberately asks for them.
- Fewer steps than the scattered tools it replaces.
- Recovery and destructive actions are explained before they are needed.
- One coherent workspace is worth more than several small utilities.

## Out of scope for the first version

- Accounts, sync between devices, or cloud storage.
- Browser extensions, autofill, or mobile apps.
- Team sharing or collaboration.
- AI features.
- Telemetry or analytics of any kind.

## Naming context

When choosing a name, consider:

- It should describe what the product does: keeping personal things safe, organized, and close at hand.
- It should suggest privacy, a single place for everything, or a personal space.
- It should be short, easy to say, and easy to spell.
- It should not be a name already used by a password manager, note app, or finance app.
- It works as an app name, a file-name prefix, and a domain.
