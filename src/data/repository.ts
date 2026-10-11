// Storage layer. The UI only talks to a `Repository`, so the local IndexedDB
// implementation can later be swapped for a synced backend (Supabase, a REST
// API, etc.) without touching any screen.

import type { LibrarySnapshot } from '../types';

export interface Repository {
  /** Where recipes are kept, in words the person recognizes. */
  readonly label: string;
  /** Milliseconds to wait after a change before saving. */
  readonly saveDelay?: number;
  load(): Promise<LibrarySnapshot | null>;
  save(snapshot: LibrarySnapshot): Promise<void>;
  clear(): Promise<void>;
  /** For shared storage: returns the library if another device changed it since the last load or save. */
  pull?(): Promise<LibrarySnapshot | null>;
}

const DB_NAME = 'recipe-box';
const STORE = 'library';
const KEY = 'snapshot';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** IndexedDB holds photos comfortably (localStorage caps out around 5 MB). */
export class IndexedDbRepository implements Repository {
  readonly label = 'This device';
  private db?: Promise<IDBDatabase>;

  private conn() {
    this.db ??= openDb();
    return this.db;
  }

  async load() {
    const db = await this.conn();
    return new Promise<LibrarySnapshot | null>((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as LibrarySnapshot) ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  async save(snapshot: LibrarySnapshot) {
    const db = await this.conn();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(snapshot, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clear() {
    const db = await this.conn();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

/** Used when the browser blocks storage (private windows, embedded previews). */
export class MemoryRepository implements Repository {
  readonly label = 'This visit only';
  private data: LibrarySnapshot | null = null;
  async load() { return this.data; }
  async save(s: LibrarySnapshot) { this.data = s; }
  async clear() { this.data = null; }
}

export const PASSCODE_KEY = 'recipe-box:passcode';

export function savedPasscode(): string {
  try { return localStorage.getItem(PASSCODE_KEY) ?? ''; } catch { return ''; }
}

export interface ServerInfo {
  ok: boolean;
  /** Hosted online (Vercel) rather than on a computer at home. */
  online?: boolean;
  /** The family passcode is required to read or change recipes. */
  auth?: boolean;
  /** Recipe photos can be scanned into new recipes. */
  scan?: boolean;
}

/** Talks to the shared library (the home server in server/index.mjs, or the
 *  online functions in api/), so every device sees the same recipes. */
export class HttpRepository implements Repository {
  readonly label: string;
  /** Online storage is billed per write, so quick edits are batched longer. */
  readonly saveDelay: number;
  private revision = '';
  private online: boolean;
  private photoUrls = new Map<string, string>();

  constructor(info: ServerInfo) {
    this.online = !!info.online;
    this.label = this.online ? 'Online' : 'Home server';
    this.saveDelay = this.online ? 3000 : 250;
  }

  private async request(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    const code = savedPasscode();
    if (code) headers.set('x-family-passcode', code);
    const res = await fetch(path, { ...init, headers, cache: 'no-store' });
    if (res.status === 401) {
      // The passcode was changed; ask for the new one.
      try { localStorage.removeItem(PASSCODE_KEY); } catch { /* ignore */ }
      location.reload();
      throw new Error('Passcode needed.');
    }
    return res;
  }

  private async get(since = ''): Promise<{ revision: string | number; snapshot?: LibrarySnapshot; unchanged?: boolean } | null> {
    const res = await this.request(`/api/library${since ? `?since=${encodeURIComponent(since)}` : ''}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Couldn’t load recipes (${res.status}).`);
    return res.json();
  }

  async load() {
    const doc = await this.get();
    this.revision = String(doc?.revision ?? '');
    return doc?.snapshot ?? null;
  }

  /** Photos are stored as separate files online so the library itself stays small. */
  private async uploadPhotos(snapshot: LibrarySnapshot): Promise<LibrarySnapshot> {
    if (!this.online || !snapshot.recipes.some((r) => r.photo?.startsWith('data:'))) return snapshot;
    const recipes = await Promise.all(snapshot.recipes.map(async (r) => {
      if (!r.photo?.startsWith('data:')) return r;
      let url = this.photoUrls.get(r.photo);
      if (!url) {
        const blob = await (await fetch(r.photo)).blob();
        const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
        const id = [...new Uint8Array(digest)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
        const res = await this.request(`/api/photo?id=${id}`, { method: 'PUT', headers: { 'content-type': blob.type || 'image/jpeg' }, body: blob });
        if (!res.ok) throw new Error(`Couldn’t save a photo (${res.status}).`);
        url = `/api/photo?id=${id}`;
        this.photoUrls.set(r.photo, url);
      }
      return { ...r, photo: url };
    }));
    return { ...snapshot, recipes };
  }

  async save(snapshot: LibrarySnapshot) {
    const body = await this.uploadPhotos(snapshot);
    const res = await this.request('/api/library', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ snapshot: body }),
    });
    if (!res.ok) throw new Error(`Couldn’t save recipes (${res.status}).`);
    this.revision = String((await res.json()).revision);
  }

  async pull() {
    const doc = await this.get(this.revision);
    if (!doc || doc.unchanged || !doc.snapshot || String(doc.revision) === this.revision) return null;
    this.revision = String(doc.revision);
    return doc.snapshot;
  }

  async clear() { /* the server keeps daily backups; nothing to clear locally */ }
}

export async function serverInfo(): Promise<ServerInfo | null> {
  if (!/^https?:$/.test(location.protocol)) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch('/api/health', { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(t);
    const info = res.ok ? ((await res.json()) as ServerInfo) : null;
    return info?.ok === true ? info : null;
  } catch {
    return null;
  }
}

let info: Promise<ServerInfo | null> | undefined;
/** Asked once per page load; the passcode screen and the store share the answer. */
export const getServerInfo = () => (info ??= serverInfo());

export async function createRepository(): Promise<Repository> {
  const server = await getServerInfo();
  if (server) return new HttpRepository(server);
  try {
    const repo = new IndexedDbRepository();
    await repo.load();
    return repo;
  } catch {
    return new MemoryRepository();
  }
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
