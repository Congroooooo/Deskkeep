# Technical Requirements Document — Deskkeep

## 1. Architecture decision

Build a **Windows-first Electron desktop app**. Use a local React renderer for UI; keep filesystem, database, crypto, backup, clipboard, and external-opening privileges in the Electron main process. The renderer can request only named, schema-validated operations through a typed preload bridge.

| Layer | Responsibility | Allowed capabilities |
|---|---|---|
| Renderer | React UI, local visual state, forms, accessibility | Calls narrow `window.dkbackup` APIs; no Node, filesystem, shell, or unrestricted IPC |
| Preload | Typed context bridge | One method per allowlisted operation; validate serializable arguments |
| Main process | Lifecycle, auth session, vault service, IPC authorization, OS integration | Owns secret lifetime and all privileged APIs |
| Vault domain | Validation, encryption/decryption, search index, business rules | Receives unlocked key only in memory |
| Persistence | SQLite, migrations, encrypted records, atomic transactions | No plaintext sensitive payloads |

## 2. Proposed stack

- Electron on a maintained supported release line, packaged with Electron Forge.
- React + TypeScript + Vite for renderer UI.
- TypeScript domain layer shared through explicit contracts—not direct renderer-to-database imports.
- SQLite in the user-data directory using a packaged, reproducible driver; migrations tracked by `schema_version`.
- Zod (or equivalent) for IPC and import payload validation.
- Node's maintained cryptography APIs for AES-256-GCM and CSPRNG; a reviewed Argon2id library for key derivation.
- Decimal currency library or integer minor units for money; never binary floating-point totals.
- Vitest for domain tests, Playwright for renderer flows, and a packaged-app smoke/acceptance script.

Dependency versions are pinned in the lockfile and updated deliberately at release time. We will select exact versions at implementation kickoff, not hard-code stale versions in a pre-code specification.

## 3. Security requirements

### Electron boundary

`nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, restrictive CSP, local packaged content only, blocked arbitrary navigation/window creation, and sender validation for every IPC handler are release requirements. The preload exposes narrow methods such as `vault.createCredential(input)`—never raw `ipcRenderer`, filesystem, shell, or a generic command channel. These controls follow Electron's current security guidance.

### Master password and encryption

1. First run generates a cryptographically random 256-bit vault data-encryption key (VDEK), master-password salt, recovery-code salt, and vault identifier.
2. The master password is never stored. It derives a master key-encryption key through Argon2id using versioned parameters, which wraps the VDEK with AES-256-GCM.
3. A one-time recovery code derives a separate recovery key-encryption key and wraps the same VDEK. The code itself is never persisted. This is what makes genuine password recovery possible without retaining the master password.
4. The VDEK encrypts each sensitive record payload with AES-256-GCM using a unique random 96-bit nonce and authenticated additional data containing record ID, entity type, and format version.
5. Ciphertext, nonce, authentication tag, wrapped-VDEK records, record ID, and non-sensitive schema/migration metadata persist. Credential fields, note content, income details, activity details, and user-controlled names are encrypted payloads.
6. On unlock, the main process unwraps the VDEK into the in-memory session store. It maintains an in-memory search index only while unlocked. On lock, window secret state is cleared, cached queries are discarded, and the key/session is dereferenced.
7. Master-password rotation creates a new master-derived wrapping key and re-wraps the VDEK atomically; it does not need to decrypt/re-encrypt every record. Power-loss recovery is tested.

Argon2id costs must be benchmarked at implementation time on the lowest supported Windows hardware and never fall below OWASP's then-current minimum. The present baseline is 19 MiB memory, two iterations, one lane; parameters remain versioned so stronger values can be introduced later.

### Operational safety

- Do not log request payloads from credential, note, backup, or crypto code.
- Disable crash reporting by default; if introduced later, require explicit opt-in and field redaction.
- Use `safeStorage` only for non-portable OS-bound convenience data if a later feature needs it; it is not a replacement for the master-password vault design.
- Clipboard writes are explicit; the app clears only the current clipboard content it owns after the selected timeout and informs users that OS clipboard history may retain copies.
- Remote website icons are default-off. When enabled, only a normalized hostname may be requested over HTTPS through an allowlistable resolver.

## 4. Persistence contracts

### Entity model

| Entity | Key fields in encrypted payload | Relationships |
|---|---|---|
| `vault_meta` | KDF/version/verification material and the master/recovery VDEK wraps | One per data profile |
| `credential` | title, user ID, secret, URL, notes, tags, favorite | Optional credential folder |
| `note` | title, body, labels, favorite | Optional note folder |
| `task` | title, description, status, priority, due date, tags | Calendar projection |
| `income` | source, amount minor units, currency, category, date, remarks | Calendar/dashboard projection |
| `folder` | name, color, favorite, kind | `kind = credential | note` |
| `activity` | event type, entity reference/display data, timestamp | Append-only until user clear |
| `settings` | appearance/security preferences | One profile |

Encrypted envelope: `{ entityId, entityType, ciphertext, nonce, authTag, keyVersion, updatedAt }`. Relational IDs can remain structural only when needed to enforce ownership; meaningful text and values live in ciphertext. All create/update/delete operations use SQLite transactions.

### Files

| File | Purpose | Protection |
|---|---|---|
| `deskkeep.sqlite` | Database and migrations | Record payloads encrypted; restrictive OS file permissions where available |
| `backup.dkbackup` | User-exported encrypted backup | Versioned encrypted archive; requires master password to import |
| `export.csv` | Interoperability only | Plaintext warning and explicit destination selection |

## 5. IPC contract examples

```text
auth.setup({ masterPassword, displayName }) -> { recoveryCode }
auth.unlock({ masterPassword }) -> { session: 'unlocked' }
auth.lock() -> void
credentials.list({ query, tag, folderId, view }) -> CredentialSummary[]
credentials.reveal({ id, reason: 'user-requested' }) -> SecretValue
backup.export({ destination }) -> { createdAt, version }
backup.import({ source, masterPassword, mode: 'replace' | 'merge' }) -> ImportReport
```

Each input/output has a shared schema, authorization state check, sender validation, rate/size guard where applicable, and typed error codes. Renderer errors never contain raw secret data.

## 6. Data portability and destructive actions

- Encrypted export includes manifest version, KDF parameters, schema version, encrypted payload, and integrity verification.
- Import is validated and staged in a temporary transaction/profile before replacing or merging the active vault.
- CSV uses documented headers and a downloadable template. Credential passwords in CSV demand an extra warning.
- Reset requires the user to type `RESET DESKKEEP`, then confirms the exact local profile path to be removed. It does not delete user-created exports.

## 7. Test and delivery requirements

| Test layer | Required checks |
|---|---|
| Unit | KDF/encryption envelope, validators, money/date calculations, status transitions, filters |
| Integration | SQLite transaction rollback, migrations, key rotation, backup/restore, CSV import staging |
| Electron security | `webPreferences`, CSP, IPC sender/schema rejection, navigation/new-window blocking |
| UI | Keyboard actions, focus traps, empty/error states, lock screen, destructive confirmations |
| Packaged Windows | Fresh data directory; create/unlock/restart/lock/restore flows; process exit and report checked |

## 8. Constraints and decisions deferred

- Code signing and automatic updates are release/operational decisions, not prerequisites to local feature development. Unsigned builds must be clearly labelled for internal testing.
- Cloud sync, mobile access, passkeys, biometric unlock, browser extension, and credential autofill require a new threat model and are deferred.

## 9. Security baselines

- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security/): renderer isolation, sandboxing, CSP, navigation restrictions, current Electron versions, and IPC sender validation.
- [Electron Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation/): use a narrow `contextBridge` API rather than exposing generic IPC.
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html): Argon2id baseline and parameter-tuning rationale.
