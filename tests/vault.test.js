import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { Vault } = require('../electron/vault.cjs');
const roots = [];
const createVault = () => { const root = mkdtempSync(join(tmpdir(), 'deskkeep-test-')); const vault = new Vault(join(root, 'deskkeep.sqlite')); roots.push({ root, vault }); return vault; };
afterEach(() => { for (const entry of roots.splice(0)) { entry.vault.close(); rmSync(entry.root, { recursive: true, force: true }); } });

describe('encrypted vault', () => {
  it('creates, locks, unlocks, and decrypts records', () => {
    const vault = createVault();
    vault.setup({ masterPassword: 'correct horse battery staple', displayName: 'Nicko' });
    vault.save('credential', { title: 'GitHub', username: 'nicko', password: 'secret', tags: [], favorite: true });
    expect(vault.list('credential')[0].password).toBeUndefined();
    expect(vault.get('credential', vault.list('credential')[0].id).password).toBe('secret');
    vault.lock();
    expect(() => vault.list('credential')).toThrow('locked');
    expect(() => vault.unlock('wrong password')).toThrow('incorrect');
    vault.unlock('correct horse battery staple');
    expect(vault.list('credential')[0].title).toBe('GitHub');
  });

  it('recovers access and replaces the master password', () => {
    const vault = createVault();
    const { recoveryCode } = vault.setup({ masterPassword: 'first master password', displayName: 'Nicko' });
    vault.save('note', { title: 'Private', body: 'still here', labels: [], favorite: false });
    vault.lock();
    vault.recover({ recoveryCode, newMasterPassword: 'second master password' });
    expect(vault.list('note')[0].body).toBe('still here');
    vault.lock();
    expect(() => vault.unlock('first master password')).toThrow();
    expect(vault.unlock('second master password').locked).toBe(false);
  });

  it('persists encrypted settings and supports password and recovery rotation', () => {
    const vault = createVault();
    const original = vault.setup({ masterPassword: 'first master password', displayName: 'Nicko' }).recoveryCode;
    expect(vault.settings({ theme: 'dark', autoLockMinutes: 15 }).theme).toBe('dark');
    vault.changeMasterPassword('first master password', 'replacement password');
    const rotated = vault.rotateRecoveryCode();
    vault.lock();
    expect(() => vault.unlock('first master password')).toThrow();
    expect(vault.unlock('replacement password').settings.theme).toBe('dark');
    vault.lock();
    expect(() => vault.recover({ recoveryCode: original, newMasterPassword: 'another password' })).toThrow();
    expect(vault.recover({ recoveryCode: rotated, newMasterPassword: 'another password' }).locked).toBe(false);
  });

  it('clears activity while retaining an auditable clear event', () => {
    const vault = createVault();
    vault.setup({ masterPassword: 'correct horse battery staple', displayName: 'Nicko' });
    vault.save('note', { title: 'One', body: 'Body', labels: [], favorite: false });
    expect(vault.list('activity').length).toBeGreaterThan(1);
    vault.clearActivity();
    const entries = vault.list('activity');
    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe('Activity log cleared');
  });
});
