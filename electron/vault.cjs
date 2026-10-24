const Database = require('better-sqlite3');
const { randomBytes, randomUUID, createCipheriv, createDecipheriv, timingSafeEqual } = require('node:crypto');
const { hashRawSync } = require('@node-rs/argon2');
const fs = require('node:fs');

const KDF = { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32, algorithm: 2 };
const b64 = (value) => Buffer.from(value).toString('base64');
const unb64 = (value) => Buffer.from(value, 'base64');

function derive(secret, salt) {
  return hashRawSync(Buffer.from(secret, 'utf8'), { ...KDF, salt });
}

function seal(key, value, aad = '') {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(Buffer.from(aad));
  const ciphertext = Buffer.concat([cipher.update(Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value))), cipher.final()]);
  return { nonce: b64(nonce), ciphertext: b64(ciphertext), tag: b64(cipher.getAuthTag()) };
}

function open(key, box, aad = '', asBuffer = false) {
  const decipher = createDecipheriv('aes-256-gcm', key, unb64(box.nonce));
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(unb64(box.tag));
  const plain = Buffer.concat([decipher.update(unb64(box.ciphertext)), decipher.final()]);
  return asBuffer ? plain : JSON.parse(plain.toString('utf8'));
}

class Vault {
  constructor(filePath) {
    this.filePath = filePath;
    this.db = null;
    this.key = null;
    this.displayName = '';
    this.openDb();
  }

  openDb() {
    this.db?.close();
    this.db = new Database(this.filePath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS records (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        nonce TEXT NOT NULL,
        ciphertext TEXT NOT NULL,
        tag TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS records_type ON records(type);
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        nonce TEXT NOT NULL,
        ciphertext TEXT NOT NULL,
        tag TEXT NOT NULL,
        size INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }

  meta(key, value) {
    if (value !== undefined) this.db.prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, JSON.stringify(value));
    const row = this.db.prepare('SELECT value FROM meta WHERE key=?').get(key);
    return row ? JSON.parse(row.value) : null;
  }

  state() { return { exists: Boolean(this.meta('vault')), locked: !this.key, displayName: this.displayName || undefined, settings: this.key ? this.settings() : undefined }; }

  setup({ masterPassword, displayName }) {
    if (this.meta('vault')) throw new Error('A vault already exists.');
    if (!masterPassword || masterPassword.length < 10) throw new Error('Use at least 10 characters for the master password.');
    const vdek = randomBytes(32);
    const masterSalt = randomBytes(16);
    const recoverySalt = randomBytes(16);
    const recoveryCode = `${b64(randomBytes(9)).replace(/[+/=]/g, '').slice(0, 12)}-${b64(randomBytes(9)).replace(/[+/=]/g, '').slice(0, 12)}`.toUpperCase();
    const vaultId = randomUUID();
    const masterWrap = seal(derive(masterPassword, masterSalt), vdek, `${vaultId}:master`);
    const recoveryWrap = seal(derive(recoveryCode, recoverySalt), vdek, `${vaultId}:recovery`);
    this.meta('vault', { version: 1, vaultId, masterSalt: b64(masterSalt), recoverySalt: b64(recoverySalt), masterWrap, recoveryWrap, kdf: KDF });
    this.meta('profile', seal(vdek, { displayName: displayName?.trim() || 'Local user' }, `${vaultId}:profile`));
    this.meta('settings', seal(vdek, { theme: 'light', accent: 'blue', fontSize: 'compact', websiteIcons: true, autoLockMinutes: 5, clipboardSeconds: 30 }, `${vaultId}:settings`));
    this.key = vdek;
    this.displayName = displayName?.trim() || 'Local user';
    this.activity('Vault created', 'Local encrypted workspace initialized.');
    return { recoveryCode };
  }

  unlock(masterPassword) {
    const meta = this.meta('vault');
    if (!meta) throw new Error('No vault exists yet.');
    try {
      this.key = open(derive(masterPassword, unb64(meta.masterSalt)), meta.masterWrap, `${meta.vaultId}:master`, true);
      const profile = open(this.key, this.meta('profile'), `${meta.vaultId}:profile`);
      this.displayName = profile.displayName;
      this.activity('Vault unlocked', 'Master password verified.');
      return this.state();
    } catch {
      this.key = null;
      throw new Error('The master password is incorrect.');
    }
  }

  recover({ recoveryCode, newMasterPassword }) {
    const meta = this.meta('vault');
    if (!meta) throw new Error('No vault exists yet.');
    if (!newMasterPassword || newMasterPassword.length < 10) throw new Error('Use at least 10 characters for the new master password.');
    try {
      const vdek = open(derive(recoveryCode.trim().toUpperCase(), unb64(meta.recoverySalt)), meta.recoveryWrap, `${meta.vaultId}:recovery`, true);
      const masterSalt = randomBytes(16);
      meta.masterSalt = b64(masterSalt);
      meta.masterWrap = seal(derive(newMasterPassword, masterSalt), vdek, `${meta.vaultId}:master`);
      this.meta('vault', meta);
      this.key = vdek;
      this.displayName = open(vdek, this.meta('profile'), `${meta.vaultId}:profile`).displayName;
      this.activity('Vault recovered', 'Master password replaced using the recovery code.');
      return this.state();
    } catch {
      this.key = null;
      throw new Error('The recovery code is invalid.');
    }
  }

  lock() { if (this.key) this.activity('Vault locked', 'Manual or automatic lock.'); this.key = null; this.displayName = ''; }
  requireKey() { if (!this.key) throw new Error('The vault is locked.'); return this.key; }

  settings(next) {
    const key = this.requireKey();
    const meta = this.meta('vault');
    const defaults = { theme: 'light', accent: 'blue', fontSize: 'compact', websiteIcons: true, autoLockMinutes: 5, clipboardSeconds: 30 };
    const currentBox = this.meta('settings');
    const current = currentBox ? open(key, currentBox, `${meta.vaultId}:settings`) : defaults;
    if (next) {
      const value = { ...defaults, ...current, ...next };
      this.meta('settings', seal(key, value, `${meta.vaultId}:settings`));
      this.activity('Settings updated', Object.keys(next).join(', '));
      return value;
    }
    return { ...defaults, ...current };
  }

  updateProfile(displayName) {
    const key = this.requireKey();
    const meta = this.meta('vault');
    const name = String(displayName || '').trim();
    if (!name) throw new Error('Display name is required.');
    this.meta('profile', seal(key, { displayName: name }, `${meta.vaultId}:profile`));
    this.displayName = name;
    this.activity('Profile updated', name);
    return this.state();
  }

  changeMasterPassword(currentPassword, newPassword) {
    if (!newPassword || newPassword.length < 10) throw new Error('Use at least 10 characters for the new master password.');
    const meta = this.meta('vault');
    let verified;
    try { verified = open(derive(currentPassword, unb64(meta.masterSalt)), meta.masterWrap, `${meta.vaultId}:master`, true); }
    catch { throw new Error('The current master password is incorrect.'); }
    if (!timingSafeEqual(verified, this.requireKey())) throw new Error('The current master password is incorrect.');
    const salt = randomBytes(16);
    meta.masterSalt = b64(salt);
    meta.masterWrap = seal(derive(newPassword, salt), verified, `${meta.vaultId}:master`);
    this.meta('vault', meta);
    this.activity('Master password changed', 'Vault encryption key re-wrapped.');
  }

  rotateRecoveryCode() {
    const key = this.requireKey();
    const meta = this.meta('vault');
    const code = `${b64(randomBytes(9)).replace(/[+/=]/g, '').slice(0, 12)}-${b64(randomBytes(9)).replace(/[+/=]/g, '').slice(0, 12)}`.toUpperCase();
    const salt = randomBytes(16);
    meta.recoverySalt = b64(salt);
    meta.recoveryWrap = seal(derive(code, salt), key, `${meta.vaultId}:recovery`);
    this.meta('vault', meta);
    this.activity('Recovery code rotated', 'Previous recovery code invalidated.');
    return code;
  }

  list(type, includeSecrets = false) {
    const key = this.requireKey();
    const rows = type ? this.db.prepare('SELECT * FROM records WHERE type=? ORDER BY updated_at DESC').all(type) : this.db.prepare('SELECT * FROM records ORDER BY updated_at DESC').all();
    return rows.map((row) => {
      const entity = open(key, row, `${row.id}:${row.type}`);
      return entity.type === 'credential' && !includeSecrets ? { ...entity, password: undefined } : entity;
    });
  }

  get(type, id) {
    const key = this.requireKey();
    const row = this.db.prepare('SELECT * FROM records WHERE id=? AND type=?').get(id, type);
    if (!row) throw new Error('The requested item was not found.');
    return open(key, row, `${row.id}:${row.type}`);
  }

  save(type, data) {
    const key = this.requireKey();
    const now = new Date().toISOString();
    const id = typeof data.id === 'string' && data.id ? data.id : randomUUID();
    const existing = this.db.prepare('SELECT created_at FROM records WHERE id=?').get(id);
    const entity = { ...data, id, type, createdAt: existing?.created_at || now, updatedAt: now };
    const box = seal(key, entity, `${id}:${type}`);
    this.db.prepare(`INSERT INTO records(id,type,nonce,ciphertext,tag,created_at,updated_at) VALUES(@id,@type,@nonce,@ciphertext,@tag,@createdAt,@updatedAt)
      ON CONFLICT(id) DO UPDATE SET type=excluded.type, nonce=excluded.nonce, ciphertext=excluded.ciphertext, tag=excluded.tag, updated_at=excluded.updated_at`).run({ id, type, ...box, createdAt: entity.createdAt, updatedAt: now });
    if (type !== 'activity') this.activity(`${type[0].toUpperCase()}${type.slice(1)} ${existing ? 'updated' : 'created'}`, String(data.title || data.name || data.source || 'Item'));
    return entity;
  }

  // Encrypted file blobs (for example book PDFs). Stored apart from records because records are capped in size.
  storeFile(fileName, bytes) {
    const key = this.requireKey();
    const id = randomUUID();
    const box = seal(key, bytes, `${id}:file`);
    this.db.prepare('INSERT INTO files(id,nonce,ciphertext,tag,size,created_at) VALUES(?,?,?,?,?,?)')
      .run(id, box.nonce, box.ciphertext, box.tag, bytes.length, new Date().toISOString());
    this.activity('File stored', fileName);
    return id;
  }

  readFile(id) {
    const key = this.requireKey();
    const row = this.db.prepare('SELECT * FROM files WHERE id=?').get(id);
    if (!row) throw new Error('The stored file was not found.');
    return open(key, row, `${row.id}:file`, true);
  }

  removeFile(id) {
    this.requireKey();
    this.db.prepare('DELETE FROM files WHERE id=?').run(id);
  }

  remove(type, id) {
    this.requireKey();
    if (type === 'book') {
      try {
        const book = this.get('book', id);
        if (book.fileId) this.removeFile(book.fileId);
      } catch { /* record already gone */ }
    }
    this.db.prepare('DELETE FROM records WHERE id=? AND type=?').run(id, type);
    this.activity(`${type[0].toUpperCase()}${type.slice(1)} deleted`, id);
  }

  clearActivity() {
    this.requireKey();
    this.db.prepare("DELETE FROM records WHERE type='activity'").run();
    this.activity('Activity log cleared', 'Previous local activity entries removed.');
  }

  activity(action, detail) {
    if (!this.key) return;
    this.save('activity', { action, detail });
  }

  exportTo(destination) {
    this.requireKey();
    this.db.pragma('wal_checkpoint(TRUNCATE)');
    fs.copyFileSync(this.filePath, destination);
    this.activity('Encrypted backup exported', destination.split(/[\\/]/).pop());
  }

  verifyBackup(source, secret) {
    const candidate = new Database(source, { readonly: true });
    try {
      const row = candidate.prepare("SELECT value FROM meta WHERE key='vault'").get();
      if (!row) throw new Error('The selected file is not a Deskkeep backup.');
      const meta = JSON.parse(row.value);
      const key = open(derive(secret, unb64(meta.masterSalt)), meta.masterWrap, `${meta.vaultId}:master`, true);
      const records = candidate.prepare('SELECT * FROM records').all();
      for (const record of records) open(key, record, `${record.id}:${record.type}`);
      return true;
    } finally { candidate.close(); }
  }

  restoreFrom(source) {
    const staging = `${this.filePath}.staging`;
    const rollback = `${this.filePath}.rollback`;
    fs.copyFileSync(source, staging);
    this.db.close();
    try {
      if (fs.existsSync(this.filePath)) fs.copyFileSync(this.filePath, rollback);
      fs.copyFileSync(staging, this.filePath);
      this.key = null;
      this.displayName = '';
      this.openDb();
      fs.rmSync(staging, { force: true });
      fs.rmSync(rollback, { force: true });
    } catch (error) {
      if (fs.existsSync(rollback)) fs.copyFileSync(rollback, this.filePath);
      fs.rmSync(staging, { force: true });
      fs.rmSync(rollback, { force: true });
      this.openDb();
      throw error;
    }
  }

  reset() {
    this.db.close();
    for (const suffix of ['', '-wal', '-shm']) if (fs.existsSync(this.filePath + suffix)) fs.rmSync(this.filePath + suffix);
    this.key = null;
    this.displayName = '';
    this.openDb();
  }

  close() { this.key = null; this.db?.close(); }
}

module.exports = { Vault, derive, seal, open };
