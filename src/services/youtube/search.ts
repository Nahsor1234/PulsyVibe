import { Innertube, UniversalCache } from 'youtubei.js';
import type { SongCandidate } from '@/types/discovery';
import type { SearchOptions, YouTubeCandidate, YouTubeSearchClient } from './types';
import { mapBounded } from './concurrency';

let clientPromise: Promise<Innertube> | null = null;
const DEFAULT_QUERY_CONCURRENCY = 3;

async function getClient(): Promise<Innertube> {
  if (!clientPromise) {
    clientPromise = Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true,
    }).catch(error => {
      clientPromise = null;
      throw error;
    });
  }
  return clientPromise;
}

function buildQueries(candidate: SongCandidate): string[] {
  const base = `${candidate.title} ${candidate.artist}`.trim();
  return [base, `${base} official`, `${base} music video`];
}

function toCandidate(item: any, sourceQuery: string): YouTubeCandidate | null {
  if (!item?.id || item.type !== 'Video') return null;

  const channel = item.author?.name?.toString() || '';
  const lowerChannel = channel.toLowerCase();

  return {
    videoId: item.id,
    title: item.title?.toString() || '',
    channel,
    duration: typeof item.duration?.seconds === 'number' ? item.duration.seconds : undefined,
    thumbnail: item.thumbnails?.[0]?.url,
    isVerifiedChannel: Boolean(item.author?.is_verified),
    isTopicChannel: lowerChannel.includes('topic'),
    isVevoChannel: lowerChannel.includes('vevo'),
    sourceQuery,
  };
}

export const youtubeSearchClient: YouTubeSearchClient = {
  async search(candidate, options: SearchOptions = {}) {
    const client = await getClient();
    const queries = options.queries?.length ? options.queries : buildQueries(candidate);
    const limit = Math.max(0, options.limit ?? 10);
    if (limit === 0 || queries.length === 0) return [];

    const settled = await mapBounded(
      queries,
      DEFAULT_QUERY_CONCURRENCY,
      async query => {
        const searchResult = await client.search(query, { type: 'video' });
        return (searchResult.results || [])
          .map(item => toCandidate(item, query))
          .filter((item): item is YouTubeCandidate => Boolean(item));
      },
    );

    const seen = new Set<string>();
    const results: YouTubeCandidate[] = [];

    // Merge in query order so output remains deterministic even though searches run concurrently.
    for (const result of settled) {
      if (result.status === 'rejected') continue;
      for (const candidateResult of result.value) {
        if (seen.has(candidateResult.videoId)) continue;
        seen.add(candidateResult.videoId);
        results.push(candidateResult);
        if (results.length >= limit) return results;
      }
    }

    return results;
  },
};

export { buildQueries, DEFAULT_QUERY_CONCURRENCY };
