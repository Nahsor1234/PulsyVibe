import type { SongCandidate } from '@/types/discovery';
import type { TrackResolution } from '@/types/track';
import type { YouTubeSearchClient } from '@/services/youtube/types';
import { getSongIdentity } from '@/lib/normalization';
import { deduplicateSongs } from './deduplicator';
import { createMemoryResolutionCache, type ResolutionCache } from './cache';
import { resolveWithFallback, type FallbackResolveOptions } from './fallback';

export type ProgressiveResolveOptions = FallbackResolveOptions & {
  nextCount?: number;
  backgroundConcurrency?: number;
  cache?: ResolutionCache;
  onResolved?: (resolution: TrackResolution, index: number) => void | Promise<void>;
};

const DEFAULT_NEXT_COUNT = 3;
const DEFAULT_BACKGROUND_CONCURRENCY = 2;

async function mapBounded<T>(
  items: Array<{ item: T; index: number }>,
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let next = 0;
  const workerCount = Math.min(Math.max(1, Math.floor(concurrency)), items.length);

  async function run(): Promise<void> {
    while (true) {
      const position = next++;
      if (position >= items.length) return;
      const entry = items[position];
      await worker(entry.item, entry.index);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, run));
}

/**
 * Resolves a queue progressively: current track first, then the next few tracks,
 * then the remainder in the background. Output and callbacks retain queue order.
 */
export async function resolveProgressively(
  candidates: SongCandidate[],
  searchClient: YouTubeSearchClient,
  options: ProgressiveResolveOptions = {},
): Promise<TrackResolution[]> {
  const uniqueCandidates = deduplicateSongs(candidates);
  if (uniqueCandidates.length === 0) return [];

  const cache = options.cache ?? createMemoryResolutionCache();
  const results = new Array<TrackResolution | undefined>(uniqueCandidates.length);

  const resolveAt = async (candidate: SongCandidate, index: number): Promise<void> => {
    const key = getSongIdentity(candidate.title, candidate.artist);
    const cached = cache.get(key);

    const resolution = cached
      ? { candidate, track: { ...cached.track, source: 'cache' as const } }
      : await resolveWithFallback(candidate, searchClient, options);

    results[index] = resolution;
    if (resolution.track.status === 'verified') cache.set(key, resolution.track);
    await options.onResolved?.(resolution, index);
  };

  // The first track is the critical path: don't make playback wait for the queue.
  await resolveAt(uniqueCandidates[0], 0);

  const nextCount = Math.max(0, Math.floor(options.nextCount ?? DEFAULT_NEXT_COUNT));
  const nextEnd = Math.min(uniqueCandidates.length, 1 + nextCount);
  const upcoming = uniqueCandidates.slice(1, nextEnd).map((item, offset) => ({
    item,
    index: offset + 1,
  }));

  if (upcoming.length > 0) {
    await mapBounded(
      upcoming,
      Math.max(1, Math.floor(options.backgroundConcurrency ?? DEFAULT_BACKGROUND_CONCURRENCY)),
      resolveAt,
    );
  }

  const remaining = uniqueCandidates.slice(nextEnd).map((item, offset) => ({
    item,
    index: nextEnd + offset,
  }));

  if (remaining.length > 0) {
    // Background work is awaited so callers still receive a complete ordered result,
    // while the critical path above remains isolated for future UI/player integration.
    await mapBounded(
      remaining,
      Math.max(1, Math.floor(options.backgroundConcurrency ?? DEFAULT_BACKGROUND_CONCURRENCY)),
      resolveAt,
    );
  }

  return results.filter((resolution): resolution is TrackResolution => Boolean(resolution));
}

export { DEFAULT_NEXT_COUNT, DEFAULT_BACKGROUND_CONCURRENCY };
