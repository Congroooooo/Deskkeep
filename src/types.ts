export type EntityType = 'credential' | 'note' | 'task' | 'income' | 'subscription' | 'folder' | 'activity' | 'settings';
export type Entity = { id: string; type: EntityType; createdAt: string; updatedAt: string; [key: string]: unknown };
export type Credential = Entity & { type: 'credential'; title: string; username: string; password: string; website: string; notes: string; tags: string[]; folderId?: string; favorite: boolean };
export type Note = Entity & { type: 'note'; title: string; body: string; labels: string[]; folderId?: string; favorite: boolean };
export type Task = Entity & { type: 'task'; title: string; description: string; dueDate: string; priority: 'Low' | 'Medium' | 'High'; status: 'To Do' | 'In Progress' | 'Completed'; tags: string[] };
export type Income = Entity & { type: 'income'; source: string; amountMinor: number; currency: string; date: string; category: string; notes: string };
export type Subscription = Entity & { type: 'subscription'; name: string; provider: string; website: string; amountMinor: number; currency: string; billingCycle: 'Monthly' | 'Quarterly' | 'Yearly' | 'Weekly'; nextPaymentDate: string; category: string; paymentMethod: string; notes: string; active: boolean };
export type Folder = Entity & { type: 'folder'; name: string; color: string; kind: 'credential' | 'note'; favorite: boolean };
export type Activity = Entity & { type: 'activity'; action: string; detail: string };
export type VaultState = { exists: boolean; locked: boolean; displayName?: string; settings?: Record<string, unknown> };
export type DeskkeepSettings = { theme: 'light'|'dark'; accent: 'blue'|'green'|'violet'; fontSize: 'compact'|'comfortable'|'large'; websiteIcons: boolean; autoLockMinutes: number; clipboardSeconds: number; profileAvatar?: string };

declare global {
  interface Window {
    deskkeep: {
      state(): Promise<VaultState>;
      setup(input: { masterPassword: string; displayName: string }): Promise<{ recoveryCode: string }>;
      unlock(masterPassword: string): Promise<VaultState>;
      recover(input: { recoveryCode: string; newMasterPassword: string }): Promise<VaultState>;
      lock(): Promise<void>;
      list(type?: EntityType): Promise<Entity[]>;
      save(type: EntityType, data: Record<string, unknown>): Promise<Entity>;
      remove(type: EntityType, id: string): Promise<void>;
      get(type: EntityType, id: string): Promise<Entity>;
      revealCredential(id: string): Promise<string>;
      copyCredential(id: string, clearAfterSeconds: number): Promise<void>;
      generate(options: { length: number; upper: boolean; lower: boolean; numbers: boolean; symbols: boolean }): Promise<string>;
      copy(text: string, clearAfterSeconds: number): Promise<void>;
      exportBackup(): Promise<{ path?: string }>;
      restoreBackup(masterPassword: string): Promise<{ restored: boolean }>;
      exportCsv(): Promise<{ path?: string }>;
      csvTemplate(): Promise<{ path?: string }>;
      inspectCsv(): Promise<{ canceled?: boolean; count?: number; errors?: string[]; mapping?: Record<string,string|null>; preview?: Record<string, unknown>[] }>;
      commitCsv(): Promise<{ count: number }>;
      exportIncomeCsv(): Promise<{ path?: string }>;
      getSettings(): Promise<DeskkeepSettings>;
      updateSettings(input: Partial<DeskkeepSettings>): Promise<DeskkeepSettings>;
      updateProfile(name: string): Promise<VaultState>;
      changeMasterPassword(input: { currentPassword: string; newPassword: string }): Promise<void>;
      rotateRecovery(): Promise<string>;
      clearActivity(): Promise<void>;
      chooseAvatar(): Promise<{ avatar?: string }>;
      websiteIcon(website: string): Promise<string | null>;
      importMarkdown(): Promise<{ canceled: boolean; title?: string; body?: string }>;
      reset(phrase: string): Promise<void>;
      onLocked(callback: () => void): () => void;
    };
  }
}
