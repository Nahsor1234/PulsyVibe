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

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const SCHEMA_VERSION = 1;

export function createMemoryResolutionCache(
  defaultTtlMs = DEFAULT_TTL_MS,
): ResolutionCache {
  const entries = new Map<string, ResolutionCacheEntry>();

  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) return undefined;

      if (entry.schemaVersion !== SCHEMA_VERSION || entry.expiresAt <= Date.now()) {
        entries.delete(key);
        return undefined;
      }

      return entry;
    },

    set(key, track, ttlMs = defaultTtlMs) {
      const now = Date.now();
      entries.set(key, {
        track,
        createdAt: now,
        expiresAt: now + Math.max(0, ttlMs),
        schemaVersion: SCHEMA_VERSION,
      });
    },

    delete(key) {
      entries.delete(key);
    },

    clear() {
      entries.clear();
    },
  };
}

export { DEFAULT_TTL_MS, SCHEMA_VERSION };
