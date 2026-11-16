// Progress backup and restore: every `gregg.` key in localStorage goes into one JSON file
// that can be loaded on another device or browser.
const PREFIX = 'gregg.';
const APP = 'gregg-trainer';
const FORMAT = 1;

// Snapshot of all progress as a plain object (values stay the raw stored strings).
export function exportProgress(storage, now = new Date()) {
  const data = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key !== null && key.startsWith(PREFIX)) data[key] = storage.getItem(key);
  }
  return { app: APP, format: FORMAT, exportedAt: now.toISOString(), data };
}

// Checks a parsed backup; throws an Error with a plain-English message if it is not usable.
function validate(backup) {
  const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  if (!isObject(backup) || backup.app !== APP) throw new Error('this is not a Gregg Trainer backup file.');
  if (backup.format !== FORMAT) throw new Error('this backup was made by a different version of the app.');
  if (!isObject(backup.data)) throw new Error('the backup has no saved progress in it.');
  for (const [key, value] of Object.entries(backup.data)) {
    if (!key.startsWith(PREFIX)) throw new Error(`the backup contains an unexpected entry (${key}).`);
    if (typeof value !== 'string') throw new Error(`the saved value for ${key} is damaged.`);
    try { JSON.parse(value); } catch { throw new Error(`the saved value for ${key} is damaged.`); }
  }
}

// Replaces all progress in `storage` with the backup's. Returns the number of keys restored.
export function importProgress(storage, backup) {
  validate(backup);
  const old = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key !== null && key.startsWith(PREFIX)) old.push(key);
  }
  for (const key of old) storage.removeItem(key);
  const entries = Object.entries(backup.data);
  for (const [key, value] of entries) storage.setItem(key, value);
  return entries.length;
}

// gregg-progress-YYYY-MM-DD.json, using the local date.
export function backupFileName(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `gregg-progress-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}
