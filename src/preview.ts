import type { Entity, EntityType, DeskkeepSettings, VaultState } from "./types";

type PreviewStore = {
  exists: boolean;
  locked: boolean;
  displayName: string;
  masterPassword: string;
  recoveryCode: string;
  settings: DeskkeepSettings;
  rows: Entity[];
};
const storageKey = "deskkeep-preview-v2";
const defaults = (): PreviewStore => ({
  exists: false,
  locked: true,
  displayName: "",
  masterPassword: "",
  recoveryCode: "",
  settings: {
    theme: "light",
    accent: "blue",
    fontSize: "compact",
    websiteIcons: true,
    autoLockMinutes: 5,
    clipboardSeconds: 30,
  },
  rows: [],
});

export function installPreviewBridge() {
  if (window.deskkeep) return;
  let store: PreviewStore;
  try {
    store = {
      ...defaults(),
      ...JSON.parse(localStorage.getItem(storageKey) || "{}"),
    };
  } catch {
    store = defaults();
  }
  const persist = () => localStorage.setItem(storageKey, JSON.stringify(store));
  const state = (): VaultState => ({
    exists: store.exists,
    locked: store.locked,
    displayName: store.displayName || undefined,
    settings: store.locked ? undefined : store.settings,
  });
  const requireUnlocked = () => {
    if (store.locked) throw new Error("The preview vault is locked.");
  };
  const activity = (action: string, detail: string) => {
    if (store.locked) return;
    const now = new Date().toISOString();
    store.rows.push({
      id: crypto.randomUUID(),
      type: "activity",
      action,
      detail,
      createdAt: now,
      updatedAt: now,
    } as Entity);
    persist();
  };

  window.deskkeep = {
    state: async () => state(),
    setup: async ({ masterPassword, displayName }) => {
      if (masterPassword.length < 10)
        throw new Error("Use at least 10 characters for the master password.");
      store = {
        ...defaults(),
        exists: true,
        locked: false,
        displayName: displayName.trim() || "Local user",
        masterPassword,
        recoveryCode: `PREVIEW-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      };
      activity("Vault created", "Browser preview workspace initialized.");
      persist();
      return { recoveryCode: store.recoveryCode };
    },
    unlock: async (password) => {
      if (password !== store.masterPassword)
        throw new Error("The master password is incorrect.");
      store.locked = false;
      activity("Vault unlocked", "Preview password verified.");
      persist();
      return state();
    },
    recover: async ({ recoveryCode, newMasterPassword }) => {
      if (recoveryCode !== store.recoveryCode)
        throw new Error("The recovery code is invalid.");
      store.masterPassword = newMasterPassword;
      store.locked = false;
      activity("Vault recovered", "Preview password replaced.");
      persist();
      return state();
    },
    lock: async () => {
      activity("Vault locked", "Manual lock.");
      store.locked = true;
      persist();
    },
    list: async (type?: EntityType) => {
      requireUnlocked();
      return type
        ? store.rows.filter((row) => row.type === type)
        : [...store.rows];
    },
    save: async (type, data) => {
      requireUnlocked();
      const now = new Date().toISOString();
      const existing = store.rows.find((row) => row.id === data.id);
      const item = {
        ...data,
        id: String(data.id || crypto.randomUUID()),
        type,
        createdAt: String(existing?.createdAt || now),
        updatedAt: now,
      } as Entity;
      store.rows = store.rows.filter((row) => row.id !== item.id).concat(item);
      activity(
        `${type[0].toUpperCase()}${type.slice(1)} ${existing ? "updated" : "created"}`,
        String(data.title || data.name || data.source || "Item"),
      );
      persist();
      return item;
    },
    remove: async (type, id) => {
      requireUnlocked();
      store.rows = store.rows.filter((row) => row.id !== id);
      activity(`${type[0].toUpperCase()}${type.slice(1)} deleted`, id);
      persist();
    },
    get: async (type, id) => {
      requireUnlocked();
      const item = store.rows.find((row) => row.type === type && row.id === id);
      if (!item) throw new Error("Item not found.");
      return item;
    },
    revealCredential: async (id) =>
      String(
        (store.rows.find((row) => row.id === id) as Record<string, unknown>)
          ?.password || "",
      ),
    copyCredential: async () => {},
    generate: async ({ length }) =>
      `Deskkeep!${crypto
        .randomUUID()
        .replaceAll("-", "")
        .slice(0, Math.max(3, length - 5))}`,
    copy: async () => {},
    exportBackup: async () => ({}),
    restoreBackup: async () => ({ restored: false }),
    exportCsv: async () => ({}),
    csvTemplate: async () => ({}),
    inspectCsv: async () => ({ canceled: true }),
    commitCsv: async () => ({ count: 0 }),
    exportIncomeCsv: async () => ({}),
    importBook: async () => ({ canceled: true }),
    exportBook: async () => ({ canceled: true }),
    readBook: async () => {
      throw new Error("Reading PDFs needs the desktop app.");
    },
    calendarFeeds: async () => [],
    addCalendarFeed: async () => {
      throw new Error("Calendar links need the desktop app.");
    },
    removeCalendarFeed: async () => [],
    importCalendarFile: async () => ({ canceled: true }),
    syncCalendars: async () => ({ syncedAt: new Date().toISOString(), count: 0, errors: [] }),
    calendarEvents: async () => ({ syncedAt: null, events: [] }),
    getSettings: async () => store.settings,
    updateSettings: async (input) => {
      store.settings = { ...store.settings, ...input };
      activity("Settings updated", Object.keys(input).join(", "));
      persist();
      return store.settings;
    },
    updateProfile: async (name) => {
      store.displayName = name.trim();
      activity("Profile updated", store.displayName);
      persist();
      return state();
    },
    changeMasterPassword: async ({ currentPassword, newPassword }) => {
      if (currentPassword !== store.masterPassword)
        throw new Error("The current master password is incorrect.");
      store.masterPassword = newPassword;
      activity("Master password changed", "Preview password changed.");
      persist();
    },
    rotateRecovery: async () => {
      store.recoveryCode = `PREVIEW-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      activity("Recovery code rotated", "Previous code invalidated.");
      persist();
      return store.recoveryCode;
    },
    clearActivity: async () => {
      store.rows = store.rows.filter((row) => row.type !== "activity");
      activity("Activity log cleared", "Previous preview activity removed.");
      persist();
    },
    chooseAvatar: async () => ({}),
    websiteIcon: async () => null,
    importMarkdown: () =>
      new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".md,.markdown,.txt";
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return resolve({ canceled: true });
          const text = (await file.text()).replace(/^﻿/, "");
          const heading = text.match(/^#\s+(.+)$/m);
          const title = (heading ? heading[1] : file.name.replace(/\.[^.]+$/, "")).trim().slice(0, 200) || "Imported note";
          resolve({ canceled: false, title, body: text.slice(0, 100000) });
        };
        input.click();
      }),
    reset: async (phrase) => {
      if (phrase !== "RESET DESKKEEP") throw new Error("Type RESET DESKKEEP exactly.");
      store = defaults();
      persist();
    },
    onLocked: () => () => {},
  };
}
