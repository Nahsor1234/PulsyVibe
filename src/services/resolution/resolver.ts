import type { SongCandidate } from '@/types/discovery';
import type { Track, TrackResolution } from '@/types/track';
import type { YouTubeSearchClient } from '@/services/youtube/types';
import { filterCandidates } from '@/services/youtube/filter';
import { rankCandidates } from './ranker';
import { getSongIdentity } from '@/lib/normalization';

export type ResolveOptions = {
  searchLimit?: number;
  queries?: string[];
  minimumScore?: number;
};

const DEFAULT_MINIMUM_SCORE = 70;

export async function resolveSong(
  candidate: SongCandidate,
  searchClient: YouTubeSearchClient,
  options: ResolveOptions = {},
): Promise<TrackResolution> {
  const searchResults = await searchClient.search(candidate, {
    limit: options.searchLimit ?? 10,
    queries: options.queries,
  });

  const filtered = filterCandidates(searchResults, candidate);
  const ranked = rankCandidates(candidate, filtered);
  const best = ranked[0];
  const minimumScore = options.minimumScore ?? DEFAULT_MINIMUM_SCORE;

  if (!best || best.score < minimumScore) {
    return {
      candidate,
      track: {
        id: getSongIdentity(candidate.title, candidate.artist),
        title: candidate.title,
        artist: candidate.artist,
        videoId: '',
        confidence: best?.score ?? 0,
        verification: {
          titleMatch: best?.breakdown.titleMatch ?? 0,
          artistMatch: best?.breakdown.artistMatch ?? 0,
          channelScore: best?.breakdown.channelScore ?? 0,
          durationScore: best?.breakdown.durationScore ?? 0,
          musicScore: best?.breakdown.musicScore ?? 0,
        },
        source: 'youtube-search',
        status: 'unavailable',
      },
    };
  }

  return {
    candidate,
    track: {
      id: getSongIdentity(candidate.title, candidate.artist),
      title: best.title,
      artist: candidate.artist,
      videoId: best.videoId,
      channel: best.channel,
      duration: best.duration,
      thumbnail: best.thumbnail,
      confidence: best.score,
      verification: {
        titleMatch: best.breakdown.titleMatch,
        artistMatch: best.breakdown.artistMatch,
        channelScore: best.breakdown.channelScore,
        durationScore: best.breakdown.durationScore,
        musicScore: best.breakdown.musicScore,
      },
      source: 'youtube-search',
      status: 'verified',
    },
  };
}
