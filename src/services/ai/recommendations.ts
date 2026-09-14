import type { RecommendationRequest, RecommendationResult } from '@/types/ai';
import type { SongCandidate } from '@/types/discovery';
import { deduplicateSongs } from '@/services/resolution/deduplicator';

const DEFAULT_COUNT = 20;
const MAX_COUNT = 50;

/**
 * Normalizes provider output before it enters the resolution engine.
 * Provider output is treated as untrusted data: malformed or duplicate songs
 * are removed and the result is capped to a predictable size.
 */
export function sanitizeRecommendations(
  result: RecommendationResult,
  count = DEFAULT_COUNT,
): RecommendationResult {
  const limit = Math.min(Math.max(1, Math.floor(count)), MAX_COUNT);
  const candidates = result.candidates
    .filter(isSongCandidate)
    .map(normalizeCandidate)
    .filter(candidate => candidate.title.length > 0 && candidate.artist.length > 0);

  return { candidates: deduplicateSongs(candidates).slice(0, limit) };
}

export async function getRecommendations(
  engine: { recommend(request: RecommendationRequest): Promise<RecommendationResult> },
  request: RecommendationRequest,
): Promise<RecommendationResult> {
  const requestedCount = request.count ?? request.intent.count ?? DEFAULT_COUNT;
  const result = await engine.recommend({
    ...request,
    count: Math.min(Math.max(1, Math.floor(requestedCount)), MAX_COUNT),
  });

  return sanitizeRecommendations(result, requestedCount);
}

function isSongCandidate(value: SongCandidate): value is SongCandidate {
  return Boolean(
    value &&
      typeof value.title === 'string' &&
      typeof value.artist === 'string',
  );
}

function normalizeCandidate(candidate: SongCandidate): SongCandidate {
  return {
    ...candidate,
    title: candidate.title.trim(),
    artist: candidate.artist.trim(),
    album: candidate.album?.trim() || undefined,
    language: candidate.language?.trim() || undefined,
    genre: candidate.genre?.trim() || undefined,
    mood: candidate.mood?.trim() || undefined,
  };
}
