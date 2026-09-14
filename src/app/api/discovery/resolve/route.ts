import { NextResponse } from 'next/server';
import type { SongCandidate } from '@/types/discovery';
import { youtubeSearchClient } from '@/services/youtube/search';
import { createSongDiscoveryService } from '@/services/resolution/song-discovery';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const MAX_CANDIDATES = 50;
const MAX_SEARCH_LIMIT = 20;
const MAX_CONCURRENCY = 5;

/**
 * V2 resolution endpoint.
 *
 * Accepts canonical SongCandidate objects and returns canonical TrackResolution
 * objects. It deliberately has no AI or playback responsibility.
 */
export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();

    if (!isResolvePayload(body)) {
      return NextResponse.json(
        { error: 'Invalid resolution payload.' },
        { status: 400 },
      );
    }

    const service = createSongDiscoveryService(youtubeSearchClient);
    const candidates = body.candidates.slice(0, MAX_CANDIDATES);
    const mode = body.mode ?? (candidates.length === 1 ? 'single' : 'batch');

    const resolutions = await service.resolve(candidates, {
      mode,
      concurrency: Math.min(body.concurrency ?? 3, MAX_CONCURRENCY),
      searchLimit: Math.min(body.searchLimit ?? 10, MAX_SEARCH_LIMIT),
      minimumScore: body.minimumScore,
      relaxedMinimumScore: body.relaxedMinimumScore,
    });

    return NextResponse.json({
      candidates: candidates.length,
      resolved: resolutions.length,
      verified: resolutions.filter(({ track }) => track.status === 'verified').length,
      unavailable: resolutions.filter(({ track }) => track.status === 'unavailable').length,
      resolutions,
    });
  } catch (error) {
    console.error('[V2 resolution] request failed', error);
    return NextResponse.json(
      { error: 'Resolution request failed.' },
      { status: 500 },
    );
  }
}

type ResolvePayload = {
  candidates: SongCandidate[];
  mode?: 'single' | 'batch' | 'progressive';
  concurrency?: number;
  searchLimit?: number;
  minimumScore?: number;
  relaxedMinimumScore?: number;
};

function isResolvePayload(value: unknown): value is ResolvePayload {
  if (!value || typeof value !== 'object') return false;

  const payload = value as Partial<ResolvePayload>;
  if (!Array.isArray(payload.candidates) || payload.candidates.length === 0) return false;
  if (payload.candidates.length > MAX_CANDIDATES) return false;

  return payload.candidates.every(isSongCandidate) &&
    (payload.mode === undefined || ['single', 'batch', 'progressive'].includes(payload.mode)) &&
    isOptionalPositiveNumber(payload.concurrency) &&
    isOptionalPositiveNumber(payload.searchLimit) &&
    isOptionalNumber(payload.minimumScore) &&
    isOptionalNumber(payload.relaxedMinimumScore);
}

function isSongCandidate(value: unknown): value is SongCandidate {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SongCandidate>;
  return typeof candidate.title === 'string' &&
    candidate.title.trim().length > 0 &&
    candidate.title.length <= 300 &&
    typeof candidate.artist === 'string' &&
    candidate.artist.trim().length > 0 &&
    candidate.artist.length <= 300;
}

function isOptionalPositiveNumber(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value) && value > 0);
}

function isOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value));
}
