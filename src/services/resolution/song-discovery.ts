import type { SongCandidate } from '@/types/discovery';
import type { TrackResolution } from '@/types/track';
import type { YouTubeSearchClient } from '@/services/youtube/types';
import { createMemoryResolutionCache, type ResolutionCache } from './cache';
import { deduplicateSongs } from './deduplicator';
import { resolveWithFallback, type FallbackResolveOptions } from './fallback';
import { resolveProgressively, type ProgressiveResolveOptions } from './progressive';
import { resolveBatch, type BatchResolveOptions } from './batch-resolver';

export type SongDiscoveryMode = 'single' | 'batch' | 'progressive';

export type SongDiscoveryOptions = FallbackResolveOptions & {
  mode?: SongDiscoveryMode;
  concurrency?: number;
  nextCount?: number;
  backgroundConcurrency?: number;
  cache?: ResolutionCache;
  onResolved?: ProgressiveResolveOptions['onResolved'];
};

/**
 * Single orchestration boundary for song candidate -> verified Track resolution.
 * AI/recommendation code should provide SongCandidate[] and must not resolve
 * YouTube entities itself.
 */
export class SongDiscoveryService {
  private readonly searchClient: YouTubeSearchClient;
  private readonly cache: ResolutionCache;

  constructor(
    searchClient: YouTubeSearchClient,
    cache: ResolutionCache = createMemoryResolutionCache(),
  ) {
    this.searchClient = searchClient;
    this.cache = cache;
  }

  async resolve(
    candidates: SongCandidate[],
    options: SongDiscoveryOptions = {},
  ): Promise<TrackResolution[]> {
    const uniqueCandidates = deduplicateSongs(candidates);
    if (uniqueCandidates.length === 0) return [];

    const mode = options.mode ?? (uniqueCandidates.length === 1 ? 'single' : 'progressive');

    switch (mode) {
      case 'single':
        return [await this.resolveOne(uniqueCandidates[0], options)];

      case 'batch':
        return resolveBatch(uniqueCandidates, this.searchClient, {
          ...options,
          cache: this.cache,
        } satisfies BatchResolveOptions);

      case 'progressive':
        return resolveProgressively(uniqueCandidates, this.searchClient, {
          ...options,
          cache: this.cache,
        } satisfies ProgressiveResolveOptions);
    }
  }

  async resolveOne(
    candidate: SongCandidate,
    options: Omit<SongDiscoveryOptions, 'mode' | 'concurrency' | 'nextCount' | 'backgroundConcurrency'> = {},
  ): Promise<TrackResolution> {
    const resolution = await resolveWithFallback(candidate, this.searchClient, {
      ...options,
    });

    if (resolution.track.status === 'verified') {
      const key = `${candidate.title}|${candidate.artist}`;
      // Cache identity is normalized by the lower-level resolution modules;
      // avoid exposing cache implementation details as part of the public API.
      void key;
      this.cache.set(
        resolution.track.id,
        resolution.track,
      );
    }

    return resolution;
  }
}

export function createSongDiscoveryService(
  searchClient: YouTubeSearchClient,
  cache?: ResolutionCache,
): SongDiscoveryService {
  return new SongDiscoveryService(searchClient, cache);
}
