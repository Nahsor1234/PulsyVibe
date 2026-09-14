import type { SongCandidate } from '@/types/discovery';
import type { TrackResolution } from '@/types/track';
import type { YouTubeSearchClient } from '@/services/youtube/types';
import { getSongIdentity } from '@/lib/normalization';
import { deduplicateSongs } from './deduplicator';
import { createMemoryResolutionCache, type ResolutionCache } from './cache';
import { resolveSong, type ResolveOptions } from './resolver';

export type BatchResolveOptions = ResolveOptions & {
  concurrency?: number;
  cache?: ResolutionCache;
};

const DEFAULT_CONCURRENCY = 3;

async function mapBounded<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  }

  const workerCount = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
}

export async function resolveBatch(
  candidates: SongCandidate[],
  searchClient: YouTubeSearchClient,
  options: BatchResolveOptions = {},
): Promise<TrackResolution[]> {
  const uniqueCandidates = deduplicateSongs(candidates);
  const cache = options.cache ?? createMemoryResolutionCache();
  const uncached: SongCandidate[] = [];
  const results = new Map<string, TrackResolution>();

  for (const candidate of uniqueCandidates) {
    const key = getSongIdentity(candidate.title, candidate.artist);
    const cached = cache.get(key);

    if (cached) {
      results.set(key, { candidate, track: { ...cached.track, source: 'cache' } });
    } else {
      uncached.push(candidate);
    }
  }

  const resolved = await mapBounded(
    uncached,
    options.concurrency ?? DEFAULT_CONCURRENCY,
    candidate => resolveSong(candidate, searchClient, options),
  );

  for (const resolution of resolved) {
    const key = getSongIdentity(resolution.candidate.title, resolution.candidate.artist);
    results.set(key, resolution);
    if (resolution.track.status === 'verified') cache.set(key, resolution.track);
  }

  return uniqueCandidates
    .map(candidate => results.get(getSongIdentity(candidate.title, candidate.artist)))
    .filter((resolution): resolution is TrackResolution => Boolean(resolution));
}

export { DEFAULT_CONCURRENCY };
