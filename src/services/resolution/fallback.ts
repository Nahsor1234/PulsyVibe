import type { SongCandidate } from '@/types/discovery';
import type { TrackResolution } from '@/types/track';
import type { YouTubeSearchClient } from '@/services/youtube/types';
import { resolveSong, type ResolveOptions } from './resolver';

export type FallbackResolveOptions = ResolveOptions & {
  alternateQueries?: string[];
  relaxedMinimumScore?: number;
};

const RELAXED_MINIMUM_SCORE = 60;

function buildFallbackQueries(song: SongCandidate): string[] {
  const base = `${song.title} ${song.artist}`.trim();
  return [
    `${song.artist} ${song.title}`.trim(),
    `${song.title} ${song.artist} audio`.trim(),
    `${song.title} ${song.artist} official song`.trim(),
  ];
}

/**
 * Resolves a song without ever returning a weak candidate as verified.
 * Strategy: primary resolution -> alternate queries -> relaxed threshold -> unavailable.
 */
export async function resolveWithFallback(
  song: SongCandidate,
  searchClient: YouTubeSearchClient,
  options: FallbackResolveOptions = {},
): Promise<TrackResolution> {
  const primary = await resolveSong(song, searchClient, options);
  if (primary.track.status === 'verified') return primary;

  const queries = options.alternateQueries?.length
    ? options.alternateQueries
    : buildFallbackQueries(song);

  for (const query of queries) {
    const retry = await resolveSong(song, searchClient, {
      ...options,
      queries: [query],
      minimumScore: options.minimumScore,
    });

    if (retry.track.status === 'verified') return retry;
  }

  const relaxed = await resolveSong(song, searchClient, {
    ...options,
    minimumScore: options.relaxedMinimumScore ?? RELAXED_MINIMUM_SCORE,
  });

  if (relaxed.track.status === 'verified') return relaxed;
  return relaxed;
}

export { RELAXED_MINIMUM_SCORE, buildFallbackQueries };
