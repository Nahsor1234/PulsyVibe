import type { SongCandidate } from '@/types/discovery';
import type { TrackResolution } from '@/types/track';
import type { YouTubeSearchClient } from '@/services/youtube/types';
import { mapBounded } from '@/services/youtube/concurrency';
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

  const resolveAt = async (candidate: SongCandidate, index: number): Promise<TrackResolution> => {
    const key = getSongIdentity(candidate.title, candidate.artist);
    const cached = cache.get(key);

    const resolution = cached
      ? { candidate, track: { ...cached.track, source: 'cache' as const } }
      : await resolveWithFallback(candidate, searchClient, options);

    results[index] = resolution;
    if (resolution.track.status === 'verified') cache.set(key, resolution.track);
    await options.onResolved?.(resolution, index);
    return resolution;
  };

  // The first track is the critical path: don't make playback wait for the queue.
  try {
    await resolveAt(uniqueCandidates[0], 0);
  } catch {
    // A single resolution failure must not prevent the rest of the queue from resolving.
  }

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
      ({ item, index }) => resolveAt(item, index),
    );
  }

  const remaining = uniqueCandidates.slice(nextEnd).map((item, offset) => ({
    item,
    index: nextEnd + offset,
  }));

  if (remaining.length > 0) {
    // Still awaited for API callers that need a complete result. The shared helper
    // isolates individual failures; UI integration can later detach this phase.
    await mapBounded(
      remaining,
      Math.max(1, Math.floor(options.backgroundConcurrency ?? DEFAULT_BACKGROUND_CONCURRENCY)),
      ({ item, index }) => resolveAt(item, index),
    );
  }

  return results.filter((resolution): resolution is TrackResolution => Boolean(resolution));
}

export { DEFAULT_NEXT_COUNT, DEFAULT_BACKGROUND_CONCURRENCY };
