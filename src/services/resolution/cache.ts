import type { Track } from '@/types/track';

export type ResolutionCacheEntry = {
  track: Track;
  createdAt: number;
  expiresAt: number;
  schemaVersion: number;
};

export type ResolutionCache = {
  get(key: string): ResolutionCacheEntry | undefined;
  set(key: string, track: Track, ttlMs?: number): void;
  delete(key: string): void;
  clear(): void;
};

export type PersistentStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const DEFAULT_MAX_MEMORY_ENTRIES = 100;
const SCHEMA_VERSION = 1;
const DEFAULT_STORAGE_KEY = 'pulsyvibe:resolution-cache:v1';

type SerializedCache = Record<string, ResolutionCacheEntry>;

function isValidEntry(value: unknown): value is ResolutionCacheEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<ResolutionCacheEntry>;
  return Boolean(
    entry.track &&
      typeof entry.createdAt === 'number' &&
      typeof entry.expiresAt === 'number' &&
      entry.schemaVersion === SCHEMA_VERSION,
  );
}

export function createMemoryResolutionCache(
  defaultTtlMs = DEFAULT_TTL_MS,
  maxEntries = DEFAULT_MAX_MEMORY_ENTRIES,
): ResolutionCache {
  const entries = new Map<string, ResolutionCacheEntry>();
  const capacity = Math.max(1, Math.floor(maxEntries));

  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) return undefined;

      if (entry.schemaVersion !== SCHEMA_VERSION || entry.expiresAt <= Date.now()) {
        entries.delete(key);
        return undefined;
      }

      // Refresh recency so L1 behaves as a small LRU cache.
      entries.delete(key);
      entries.set(key, entry);
      return entry;
    },

    set(key, track, ttlMs = defaultTtlMs) {
      const now = Date.now();
      entries.delete(key);
      entries.set(key, {
        track,
        createdAt: now,
        expiresAt: now + Math.max(0, ttlMs),
        schemaVersion: SCHEMA_VERSION,
      });

      while (entries.size > capacity) {
        const oldestKey = entries.keys().next().value as string | undefined;
        if (oldestKey === undefined) break;
        entries.delete(oldestKey);
      }
    },

    delete(key) {
      entries.delete(key);
    },

    clear() {
      entries.clear();
    },
  };
}

/**
 * L2 browser-persistent cache backed by localStorage (or a compatible Storage).
 * Invalid, expired, and incompatible entries are discarded rather than surfaced.
 * L1 is bounded to keep browser memory usage predictable.
 */
export function createPersistentResolutionCache(
  storage?: PersistentStorage,
  storageKey = DEFAULT_STORAGE_KEY,
  defaultTtlMs = DEFAULT_TTL_MS,
  maxMemoryEntries = DEFAULT_MAX_MEMORY_ENTRIES,
): ResolutionCache {
  const memory = createMemoryResolutionCache(defaultTtlMs, maxMemoryEntries);
  const resolvedStorage = storage ?? getBrowserStorage();

  function readAll(): SerializedCache {
    if (!resolvedStorage) return {};

    try {
      const raw = resolvedStorage.getItem(storageKey);
      if (!raw) return {};
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      return parsed as SerializedCache;
    } catch {
      return {};
    }
  }

  function writeAll(entries: SerializedCache): void {
    if (!resolvedStorage) return;

    try {
      resolvedStorage.setItem(storageKey, JSON.stringify(entries));
    } catch {
      // Storage can be unavailable, full, or blocked. L2 is an optimization;
      // resolution must continue to work without it.
    }
  }

  return {
    get(key) {
      const memoryEntry = memory.get(key);
      if (memoryEntry) return memoryEntry;
      if (!resolvedStorage) return undefined;

      const entries = readAll();
      const entry = entries[key];
      if (!isValidEntry(entry) || entry.expiresAt <= Date.now()) {
        if (entry) {
          delete entries[key];
          writeAll(entries);
        }
        return undefined;
      }

      memory.set(key, entry.track, Math.max(0, entry.expiresAt - Date.now()));
      return entry;
    },

    set(key, track, ttlMs = defaultTtlMs) {
      memory.set(key, track, ttlMs);
      if (!resolvedStorage) return;

      const entries = readAll();
      const now = Date.now();
      entries[key] = {
        track,
        createdAt: now,
        expiresAt: now + Math.max(0, ttlMs),
        schemaVersion: SCHEMA_VERSION,
      };
      writeAll(entries);
    },

    delete(key) {
      memory.delete(key);
      if (!resolvedStorage) return;

      const entries = readAll();
      delete entries[key];
      writeAll(entries);
    },

    clear() {
      memory.clear();
      if (!resolvedStorage) return;

      try {
        resolvedStorage.removeItem(storageKey);
      } catch {
        // Ignore unavailable storage; L1 has still been cleared.
      }
    },
  };
}

function getBrowserStorage(): PersistentStorage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export {
  DEFAULT_TTL_MS,
  DEFAULT_MAX_MEMORY_ENTRIES,
  SCHEMA_VERSION,
  DEFAULT_STORAGE_KEY,
};
