# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Nicko is the primary user: a developer and freelancer working on a Windows desktop who wants one private, dependable place for credentials, notes, tasks, calendar context, and income records.

## Product Purpose

Deskkeep is a local-first desktop life OS. It replaces scattered personal tools with one encrypted workspace that stays useful without an account or internet connection. Success means the user trusts it with daily work and can restore the vault safely from an encrypted backup.

## Positioning

The product treats privacy as its operating model, not a settings promise: the vault, planning tools, and money log all work from one locally encrypted data model with no cloud dependency.

## Operating Context

The product is used repeatedly throughout a workday on a Windows laptop or desktop. Common rituals are unlocking at the start of a session, copying a credential, recording technical notes, triaging tasks, checking the calendar, recording freelance income, creating an encrypted backup, and locking before stepping away.

## Capabilities and Constraints

The approved v1 includes dashboard, credential vault, password generator, notes, tasks, week/month/year calendar, income tracking, separate note and credential folders, favorites, local activity log, appearance/security/data settings, auto-lock, clipboard clearing, recovery code, encrypted backup/restore, guarded CSV portability, and reset. It is an Electron + React + TypeScript application. V1 is Windows-first, single-user, offline-first, and has no account, sync, telemetry, AI, browser extension, autofill, collaboration, or mobile client.

## Brand Commitments

The approved product name is **Deskkeep**, shortened to **Deskkeep** inside the product. The voice is concise, reassuring, and direct. It should feel personal and intentional rather than corporate or gamified.

## Evidence on Hand

The approved source-of-truth documents are `outputs/01_PRD.md`, `outputs/02_TRD.md`, `outputs/03_SYSTEM_FLOW.md`, and `outputs/04_SYSTEM_DESIGN.md`. The external KeepR case study is capability research only; its brand assets and implementation are not ours to copy.

## Product Principles

- Local is the default, not an offline fallback.
- Secrets appear only in response to deliberate user action.
- Daily actions should take fewer steps than the scattered tools being replaced.
- Recovery and destructive behavior must be understandable before it is needed.
- One coherent workspace is more valuable than a collection of disconnected utilities.

## Accessibility & Inclusion

Every core action must be keyboard reachable, focus-visible, screen-reader labelled, usable at 200% zoom, and meet WCAG AA contrast. Motion respects reduced-motion preferences.
