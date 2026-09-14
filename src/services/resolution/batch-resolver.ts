import type { SongCandidate } from '@/types/discovery';
import type { TrackResolution } from '@/types/track';
import type { YouTubeSearchClient } from '@/services/youtube/types';
import { mapBounded } from '@/services/youtube/concurrency';
import { getSongIdentity } from '@/lib/normalization';
import { deduplicateSongs } from './deduplicator';
import { createMemoryResolutionCache, type ResolutionCache } from './cache';
import { resolveSong, type ResolveOptions } from './resolver';

export type BatchResolveOptions = ResolveOptions & {
  concurrency?: number;
  cache?: ResolutionCache;
};

const DEFAULT_CONCURRENCY = 3;

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

  const settled = await mapBounded(
    uncached,
    options.concurrency ?? DEFAULT_CONCURRENCY,
    candidate => resolveSong(candidate, searchClient, options),
  );

  for (const result of settled) {
    if (result.status === 'rejected') continue;
    const resolution = result.value;
    const key = getSongIdentity(resolution.candidate.title, resolution.candidate.artist);
    results.set(key, resolution);
    if (resolution.track.status === 'verified') cache.set(key, resolution.track);
  }

  return uniqueCandidates
    .map(candidate => results.get(getSongIdentity(candidate.title, candidate.artist)))
    .filter((resolution): resolution is TrackResolution => Boolean(resolution));
}

export { DEFAULT_CONCURRENCY };
