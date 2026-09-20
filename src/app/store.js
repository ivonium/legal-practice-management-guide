// Persistence layer - Sheet A section 9. One overlay object; localStorage primary,
// IndexedDB fallback above 4 MB; debounced save; embedded overlay seeding.

export const STORAGE_KEY = 'pmguides:overlay';
export const IDB_NAME = 'pmguides';
export const IDB_STORE = 'overlay';
export const SIZE_LIMIT = 4 * 1024 * 1024;

export function emptyOverlay() {
  const t = nowIso();
  return {
    version: 1,
    createdAt: t,
    updatedAt: t,
    notes: {},
    edits: {},
    order: {},
    moved: {},
    checklists: {},
    calculators: {},
    collapsed: {},
    reading: {},
    changeLog: {},
    settings: { searchScope: 'all', printIncludeNotes: true, firmName: 'Ivan Law' },
    calendarItems: [],
    fills: {}, // diagram fillable cells: "{slotId}:{cell}" -> { text, updatedAt }
  };
}

export function normaliseOverlay(o) {
  const base = emptyOverlay();
  if (!o || typeof o !== 'object') return base;
  const out = { ...base, ...o };
  for (const k of ['notes', 'edits', 'order', 'moved', 'checklists', 'calculators', 'collapsed', 'reading', 'changeLog', 'fills']) if (!out[k] || typeof out[k] !== 'object') out[k] = {};
  out.settings = { ...base.settings, ...(o.settings || {}) };
  if (!Array.isArray(out.calendarItems)) out.calendarItems = [];
  out.version = 1;
  return out;
}

function idbOpen() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB unavailable'));
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function idbGet() {
  try {
    const db = await idbOpen();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(STORAGE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}
export async function idbSet(json) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(json, STORAGE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
export async function idbDelete() {
  try {
    const db = await idbOpen();
    await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(STORAGE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

export class Store {
  constructor() {
    this.overlay = emptyOverlay();
    this.backend = 'localStorage';
    this.listeners = new Set();
    this.saveDebounced = debounce(() => this.saveNow(), 500);
    this.lastSaveOk = true;
  }

  async load(embeddedJson) {
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {}
    if (raw) {
      try {
        this.overlay = normaliseOverlay(JSON.parse(raw));
        this.backend = 'localStorage';
        return { source: 'localStorage' };
      } catch {}
    }
    const idbRaw = await idbGet();
    if (idbRaw) {
      try {
        this.overlay = normaliseOverlay(JSON.parse(idbRaw));
        this.backend = 'indexedDB';
        return { source: 'indexedDB' };
      } catch {}
    }
    if (embeddedJson) {
      try {
        const parsed = JSON.parse(embeddedJson);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length) {
          this.overlay = normaliseOverlay(parsed);
          await this.saveNow();
          return { source: 'embedded' };
        }
      } catch {}
    }
    this.overlay = emptyOverlay();
    return { source: 'empty' };
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // mutate through this so saves are scheduled
  update(fn) {
    fn(this.overlay);
    this.overlay.updatedAt = nowIso();
    this.saveDebounced();
    for (const l of this.listeners) l('pending');
  }

  serialise() {
    return JSON.stringify(this.overlay);
  }

  async saveNow() {
    const json = this.serialise();
    try {
      if (json.length > SIZE_LIMIT) {
        await idbSet(json);
        if (this.backend !== 'indexedDB') {
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {}
        }
        this.backend = 'indexedDB';
      } else {
        try {
          localStorage.setItem(STORAGE_KEY, json);
          if (this.backend === 'indexedDB') await idbDelete();
          this.backend = 'localStorage';
        } catch (e) {
          // quota exceeded or storage disabled: fall back to IndexedDB
          await idbSet(json);
          this.backend = 'indexedDB';
        }
      }
      this.lastSaveOk = true;
      for (const l of this.listeners) l('saved');
    } catch (e) {
      this.lastSaveOk = false;
      for (const l of this.listeners) l('error', e);
    }
  }

  async replace(overlay) {
    this.overlay = normaliseOverlay(overlay);
    await this.saveNow();
    for (const l of this.listeners) l('replaced');
  }

  async reset() {
    this.overlay = emptyOverlay();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    await idbDelete();
    await this.saveNow();
    for (const l of this.listeners) l('replaced');
  }
}
