import type { RecommendationRequest, RecommendationResult } from '@/types/ai';
import type { SongCandidate } from '@/types/discovery';
import { deduplicateSongs } from '@/services/resolution/deduplicator';

const DEFAULT_COUNT = 20;
const MAX_COUNT = 50;

/**
 * Normalizes provider output before it enters the resolution engine.
 * Provider output is treated as untrusted data: malformed or duplicate songs
 * are removed and the result is capped to a predictable size.
 *
 * DEFENSIVE BOUNDARY:
 * - Strips malformed, non-object, empty, or invalid candidate records.
 * - Does NOT fabricate, generate placeholders, or backfill when the model
 *   returns fewer valid candidates than requested.
 * - Deduplicates songs and enforces strict boundary validation.
 */
export function sanitizeRecommendations(
  result: RecommendationResult,
  count = DEFAULT_COUNT,
): RecommendationResult {
  const limit = Math.min(Math.max(1, Math.floor(count)), MAX_COUNT);
  const rawCandidates = Array.isArray(result?.candidates) ? result.candidates : [];
  const candidates = rawCandidates
    .filter(isSongCandidate)
    .map(normalizeCandidate)
    .filter(candidate => candidate.title.length > 0 && candidate.artist.length > 0);

  // Strictly deduplicate and cap up to limit; never fabricate missing items.
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

function isSongCandidate(value: unknown): value is SongCandidate {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.title === 'string' &&
    candidate.title.trim().length > 0 &&
    typeof candidate.artist === 'string' &&
    candidate.artist.trim().length > 0
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
    year: typeof candidate.year === 'number' && !Number.isNaN(candidate.year) ? candidate.year : undefined,
    energy:
      typeof candidate.energy === 'number' && !Number.isNaN(candidate.energy)
        ? Math.min(10, Math.max(1, Math.round(candidate.energy)))
        : undefined,
  };
}
