const { app, BrowserWindow, ipcMain, dialog, clipboard, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { randomInt } = require('node:crypto');
const { Vault } = require('./vault.cjs');

let window;
let vault;
let lastActivity = Date.now();
const isDev = !app.isPackaged;
let pendingCsv = null;
const readableTypes = new Set(['credential', 'note', 'task', 'income', 'subscription', 'folder', 'activity']);
const writableFields = {
  credential: ['id', 'title', 'username', 'password', 'website', 'notes', 'tags', 'folderId', 'favorite'],
  note: ['id', 'title', 'body', 'labels', 'folderId', 'favorite'],
  task: ['id', 'title', 'description', 'dueDate', 'priority', 'status', 'tags'],
  income: ['id', 'source', 'amountMinor', 'currency', 'date', 'category', 'notes'],
  subscription: ['id', 'name', 'provider', 'website', 'amountMinor', 'currency', 'billingCycle', 'nextPaymentDate', 'category', 'paymentMethod', 'notes', 'active'],
  folder: ['id', 'name', 'color', 'kind', 'favorite']
};

function assertType(type, writable = false) {
  const allowed = writable ? Object.hasOwn(writableFields, type) : readableTypes.has(type);
  if (!allowed) throw new Error('Unsupported data type.');
  return type;
}

function cleanText(value, max = 10000) {
  if (value == null) return value;
  return String(value).slice(0, max);
}

function sanitize(type, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid record.');
  if (JSON.stringify(value).length > 256000) throw new Error('Record is too large.');
  const result = {};
  for (const key of writableFields[type]) {
    if (!(key in value)) continue;
    const item = value[key];
    if (Array.isArray(item)) result[key] = item.slice(0, 30).map((entry) => cleanText(entry, 100));
    else if (typeof item === 'string') result[key] = cleanText(item, key === 'body' || key === 'notes' ? 100000 : 2000);
    else if (typeof item === 'boolean' || typeof item === 'number' || item == null) result[key] = item;
  }
  return result;
}

function parseCsv(text) {
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted && char === '"' && text[i + 1] === '"') { field += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(field); field = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = ''; if (row.some((cell) => cell.trim())) rows.push(row); row = [];
    } else field += char;
  }
  row.push(field); if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function validateSender(event) {
  const url = event.senderFrame?.url || '';
  return isDev ? url.startsWith('http://127.0.0.1:5173') : url.startsWith('file:');
}

function handler(channel, fn) {
  ipcMain.handle(channel, async (event, ...args) => {
    if (!validateSender(event)) throw new Error('Request rejected.');
    lastActivity = Date.now();
    return fn(...args);
  });
}

function createWindow() {
  window = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1060, minHeight: 680,
    backgroundColor: '#17201f', title: 'Deskkeep', icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true }
  });
  window.removeMenu();
  window.webContents.setWindowOpenHandler(({ url }) => { if (/^https:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  window.webContents.on('will-navigate', (event, url) => { if (!(isDev && url.startsWith('http://127.0.0.1:5173'))) event.preventDefault(); });
  if (isDev) window.loadURL('http://127.0.0.1:5173'); else window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  vault = new Vault(path.join(app.getPath('userData'), 'deskkeep.sqlite'));
  createWindow();
  setInterval(() => {
    if (!vault.state().locked) {
      const minutes = Math.max(1, Math.min(120, Number(vault.settings().autoLockMinutes) || 5));
      if (Date.now() - lastActivity > minutes * 60 * 1000) { vault.lock(); window?.webContents.send('vault:locked'); }
    }
  }, 15000).unref();
});
app.on('window-all-closed', () => { vault?.lock(); if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

handler('vault:state', () => vault.state());
handler('vault:setup', (input) => vault.setup(input));
handler('vault:unlock', (password) => vault.unlock(password));
handler('vault:recover', (input) => vault.recover(input));
handler('vault:lock', () => { vault.lock(); window.webContents.send('vault:locked'); });
handler('data:list', (type) => vault.list(type === undefined ? undefined : assertType(type)));
handler('data:save', (type, data) => vault.save(assertType(type, true), sanitize(type, data)));
handler('data:remove', (type, id) => vault.remove(assertType(type, true), cleanText(id, 100)));
handler('data:get', (type, id) => vault.get(assertType(type), cleanText(id, 100)));
handler('credential:reveal', (id) => vault.get('credential', cleanText(id, 100)).password);
handler('credential:copy', (id, clearAfterSeconds = 30) => {
  const text = String(vault.get('credential', cleanText(id, 100)).password);
  clipboard.writeText(text);
  const seconds = Math.max(5, Math.min(120, Number(clearAfterSeconds) || 30));
  setTimeout(() => { if (clipboard.readText() === text) clipboard.clear(); }, seconds * 1000).unref();
});
handler('settings:get', () => vault.settings());
handler('settings:update', (input) => {
  const safe = {};
  if (['light', 'dark'].includes(input?.theme)) safe.theme = input.theme;
  if (['blue', 'green', 'violet'].includes(input?.accent)) safe.accent = input.accent;
  if (['compact', 'comfortable', 'large'].includes(input?.fontSize)) safe.fontSize = input.fontSize;
  if (typeof input?.websiteIcons === 'boolean') safe.websiteIcons = input.websiteIcons;
  if (input?.profileAvatar === '' || (typeof input?.profileAvatar === 'string' && input.profileAvatar.startsWith('data:image/') && input.profileAvatar.length < 700000)) safe.profileAvatar = input.profileAvatar;
  if (Number.isFinite(Number(input?.autoLockMinutes))) safe.autoLockMinutes = Math.max(1, Math.min(120, Number(input.autoLockMinutes)));
  if (Number.isFinite(Number(input?.clipboardSeconds))) safe.clipboardSeconds = Math.max(5, Math.min(120, Number(input.clipboardSeconds)));
  return vault.settings(safe);
});
handler('profile:update', (name) => vault.updateProfile(cleanText(name, 80)));
handler('security:change-password', (input) => vault.changeMasterPassword(cleanText(input?.currentPassword, 1000), cleanText(input?.newPassword, 1000)));
handler('security:rotate-recovery', () => vault.rotateRecoveryCode());
handler('activity:clear', () => vault.clearActivity());
handler('profile:choose-avatar', async () => {
  const result = await dialog.showOpenDialog(window, { title: 'Choose a local profile image', properties: ['openFile'], filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }] });
  if (result.canceled || !result.filePaths[0]) return {};
  const file = result.filePaths[0]; const bytes = fs.readFileSync(file);
  if (bytes.length > 500000) throw new Error('Choose an image smaller than 500 KB.');
  const extension = path.extname(file).toLowerCase(); const mime = extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : 'image/jpeg';
  const avatar = `data:${mime};base64,${bytes.toString('base64')}`; vault.settings({ profileAvatar: avatar }); return { avatar };
});
handler('note:import-md', async () => {
  const result = await dialog.showOpenDialog(window, { title: 'Import a Markdown note', properties: ['openFile'], filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }] });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  const file = result.filePaths[0];
  if (fs.statSync(file).size > 200000) throw new Error('That file is too large for a note (200 KB limit).');
  const text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  const heading = text.match(/^#\s+(.+)$/m);
  const title = (heading ? heading[1] : path.basename(file, path.extname(file))).trim().slice(0, 200) || 'Imported note';
  return { canceled: false, title, body: text.slice(0, 100000) };
});
// Favicons come straight from the website itself (the page the user already logs into),
// never from a third-party icon service. Results are cached for this session.
const iconCache = new Map();
// Sites often block non-browser clients, so requests identify as a normal browser.
const BROWSER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const IMAGE_TYPES = /^image\/(png|jpeg|webp|gif|x-icon|vnd\.microsoft\.icon|svg\+xml)$/i;
async function fetchLimited(url, accept, maxBytes) {
  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(8000), headers: { accept, 'user-agent': BROWSER_AGENT, 'accept-language': 'en-US,en;q=0.9' } });
  if (!response.ok) return null;
  const type = (response.headers.get('content-type') || '').split(';')[0].trim();
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > maxBytes) return null;
  return { type, bytes };
}
function iconLinks(html, base) {
  const links = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    const rel = (tag.match(/\brel\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
    if (!/\bicon\b/i.test(rel)) continue;
    const hrefMatch = tag.match(/\bhref\s*=\s*(?:"([^"]+)"|'([^']+)')/i);
    const href = hrefMatch && (hrefMatch[1] || hrefMatch[2]);
    if (!href) continue;
    try { links.push(href.startsWith('data:') ? href : new URL(href.replace(/&amp;/g, '&'), base).href); } catch { /* ignore bad href */ }
  }
  return links;
}
handler('website:icon', async (website) => {
  let value = cleanText(website, 2000); if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = 'https://' + value;
  const url = new URL(value);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const hostname = url.hostname.toLowerCase(); if (!hostname || hostname === 'localhost') return null;
  if (iconCache.has(hostname)) return iconCache.get(hostname);
  let icon = null;
  try {
    const page = `${url.protocol}//${url.host}/`;
    const home = await fetchLimited(page, 'text/html', 512000);
    const html = home ? home.bytes.toString('utf8') : '';
    const candidates = [...iconLinks(html, page), `${url.protocol}//${url.host}/favicon.ico`];
    for (const candidate of candidates) {
      if (candidate.startsWith('data:')) {
        const match = candidate.match(/^data:([^;,]+)[^,]*,/i);
        if (match && IMAGE_TYPES.test(match[1])) { icon = candidate; break; }
        continue;
      }
      const found = await fetchLimited(candidate, 'image/*', 100000).catch(() => null);
      if (found && IMAGE_TYPES.test(found.type)) { icon = `data:${found.type};base64,${found.bytes.toString('base64')}`; break; }
    }
  } catch { icon = null; }
  iconCache.set(hostname, icon);
  return icon;
});
handler('password:generate', ({ length = 20, upper = true, lower = true, numbers = true, symbols = true }) => {
  const pools = [lower && 'abcdefghijkmnopqrstuvwxyz', upper && 'ABCDEFGHJKLMNPQRSTUVWXYZ', numbers && '23456789', symbols && '!@#$%^&*_-+='].filter(Boolean);
  if (!pools.length) throw new Error('Select at least one character group.');
  const all = pools.join('');
  const size = Math.max(pools.length, Math.max(8, Math.min(64, length)));
  const chars = pools.map((pool) => pool[randomInt(pool.length)]);
  while (chars.length < size) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) { const j = randomInt(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join('');
});
handler('clipboard:copy', (text, clearAfterSeconds = 30) => {
  const safeText = cleanText(text, 100000);
  const seconds = Math.max(5, Math.min(120, Number(clearAfterSeconds) || 30));
  clipboard.writeText(safeText);
  setTimeout(() => { if (clipboard.readText() === safeText) clipboard.clear(); }, seconds * 1000).unref();
});
handler('backup:export', async () => {
  const result = await dialog.showSaveDialog(window, { title: 'Export encrypted Deskkeep backup', defaultPath: `deskkeep-${new Date().toISOString().slice(0, 10)}.dkbackup`, filters: [{ name: 'Deskkeep backup', extensions: ['dkbackup'] }] });
  if (!result.canceled && result.filePath) vault.exportTo(result.filePath);
  return { path: result.filePath };
});
handler('backup:restore', async (masterPassword) => {
  const result = await dialog.showOpenDialog(window, { title: 'Restore encrypted Deskkeep backup', properties: ['openFile'], filters: [{ name: 'Deskkeep backup', extensions: ['deskkeep'] }] });
  if (result.canceled || !result.filePaths[0]) return { restored: false };
  vault.verifyBackup(result.filePaths[0], masterPassword);
  vault.restoreFrom(result.filePaths[0]);
  window.webContents.send('vault:locked');
  return { restored: true };
});
handler('csv:export', async () => {
  const rows = vault.list('credential', true);
  const result = await dialog.showSaveDialog(window, { title: 'Export plaintext credentials CSV', defaultPath: 'deskkeep-credentials.csv', filters: [{ name: 'CSV', extensions: ['csv'] }] });
  if (!result.canceled && result.filePath) {
    const quote = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    fs.writeFileSync(result.filePath, ['title,username,password,website,notes,tags', ...rows.map((r) => [r.title, r.username, r.password, r.website, r.notes, (r.tags || []).join('|')].map(quote).join(','))].join('\n'));
    vault.activity('Plaintext CSV exported', path.basename(result.filePath));
  }
  return { path: result.filePath };
});
handler('csv:template', async () => {
  const result = await dialog.showSaveDialog(window, { title: 'Save credential CSV template', defaultPath: 'deskkeep-credential-template.csv', filters: [{ name: 'CSV', extensions: ['csv'] }] });
  if (!result.canceled && result.filePath) fs.writeFileSync(result.filePath, 'title,username,password,website,notes,tags,folder\n');
  return { path: result.filePath };
});
handler('csv:inspect', async () => {
  const result = await dialog.showOpenDialog(window, { title: 'Import credentials CSV', properties: ['openFile'], filters: [{ name: 'CSV', extensions: ['csv'] }] });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  const rows = parseCsv(fs.readFileSync(result.filePaths[0], 'utf8'));
  const headers = (rows.shift() || []).map((value) => value.trim().toLowerCase());
  const aliases = { title: ['title', 'name', 'service'], username: ['username', 'email', 'login'], password: ['password', 'secret'], website: ['website', 'url'], notes: ['notes', 'note'], tags: ['tags', 'labels'], folder: ['folder', 'foldername'] };
  const mapping = Object.fromEntries(Object.entries(aliases).map(([field, names]) => [field, names.find((name) => headers.includes(name)) || null]));
  const missing = ['title', 'username', 'password'].filter((name) => !mapping[name]);
  if (missing.length) throw new Error(`CSV is missing required columns: ${missing.join(', ')}.`);
  const records = rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || '']))).map((item, index) => ({
    row: index + 2, title: item[mapping.title].trim(), username: item[mapping.username].trim(), password: item[mapping.password],
    website: item[mapping.website]?.trim() || '', notes: item[mapping.notes] || '', tags: (item[mapping.tags] || '').split('|').map((x) => x.trim()).filter(Boolean).slice(0, 5), folder: item[mapping.folder]?.trim() || ''
  }));
  const errors = records.filter((item) => !item.title || !item.password).map((item) => `Row ${item.row}: title and password are required.`);
  pendingCsv = errors.length ? null : records;
  return { canceled: false, count: records.length, errors, mapping, preview: records.slice(0, 5).map(({ password, ...item }) => ({ ...item, password: password ? '••••••••' : '' })) };
});
handler('csv:commit', () => {
  if (!pendingCsv) throw new Error('Inspect a valid CSV before importing.');
  const folders = vault.list('folder');
  for (const item of pendingCsv) {
    const folder = folders.find((entry) => entry.kind === 'credential' && entry.name.toLowerCase() === item.folder.toLowerCase());
    vault.save('credential', { title: item.title, username: item.username, password: item.password, website: item.website, notes: item.notes, tags: item.tags, folderId: folder?.id, favorite: false });
  }
  const count = pendingCsv.length; pendingCsv = null; vault.activity('Credential CSV imported', `${count} records imported.`); return { count };
});
handler('income:export-csv', async () => {
  const rows = vault.list('income');
  const result = await dialog.showSaveDialog(window, { title: 'Export income CSV', defaultPath: 'deskkeep-income.csv', filters: [{ name: 'CSV', extensions: ['csv'] }] });
  if (!result.canceled && result.filePath) {
    const quote = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    fs.writeFileSync(result.filePath, ['date,source,amount,currency,category,notes', ...rows.map((r) => [r.date, r.source, (r.amountMinor / 100).toFixed(2), r.currency, r.category, r.notes].map(quote).join(','))].join('\n'));
    vault.activity('Income CSV exported', path.basename(result.filePath));
  }
  return { path: result.filePath };
});
handler('vault:reset', (phrase) => { if (phrase !== 'RESET DESKKEEP') throw new Error('Type RESET DESKKEEP exactly.'); vault.reset(); window.webContents.send('vault:locked'); });
