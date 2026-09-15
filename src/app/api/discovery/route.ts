import { NextResponse } from 'next/server';
import { createDiscoveryOrchestrator } from '@/services/discovery';
import type { SongDiscoveryMode } from '@/services/resolution/song-discovery';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const MAX_QUERY_LENGTH = 500;
const MAX_COUNT = 50;
const MAX_SEARCH_LIMIT = 20;
const MAX_CONCURRENCY = 5;

interface DiscoveryPayload {
  query: string;
  count?: number;
  mode?: SongDiscoveryMode;
  concurrency?: number;
  searchLimit?: number;
  minimumScore?: number;
  relaxedMinimumScore?: number;
}

function isDiscoveryPayload(value: unknown): value is DiscoveryPayload {
  if (!value || typeof value !== 'object') return false;

  const payload = value as Partial<DiscoveryPayload>;
  if (typeof payload.query !== 'string') return false;
  const trimmed = payload.query.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_QUERY_LENGTH) return false;

  return (
    isOptionalPositiveNumber(payload.count) &&
    (payload.mode === undefined || ['single', 'batch', 'progressive'].includes(payload.mode)) &&
    isOptionalPositiveNumber(payload.concurrency) &&
    isOptionalPositiveNumber(payload.searchLimit) &&
    isOptionalNumber(payload.minimumScore) &&
    isOptionalNumber(payload.relaxedMinimumScore)
  );
}

function isOptionalPositiveNumber(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value) && value > 0);
}

function isOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value));
}

/**
 * V2 Discovery Endpoint
 *
 * Full server-side pipeline:
 * query -> Gemini Intent -> Gemini Recommendations -> SongDiscoveryService -> Verified Tracks
 *
 * Runs Gemini completely server-side without exposing GEMINI_API_KEY.
 */
export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();

    if (!isDiscoveryPayload(body)) {
      return NextResponse.json(
        { error: 'Invalid discovery payload. "query" is required and must be a non-empty string under 500 characters.' },
        { status: 400 },
      );
    }

    const orchestrator = createDiscoveryOrchestrator();

    const result = await orchestrator.discover(body.query, {
      count: body.count ? Math.min(Math.floor(body.count), MAX_COUNT) : undefined,
      mode: body.mode,
      concurrency: body.concurrency ? Math.min(body.concurrency, MAX_CONCURRENCY) : undefined,
      searchLimit: body.searchLimit ? Math.min(body.searchLimit, MAX_SEARCH_LIMIT) : undefined,
      minimumScore: body.minimumScore,
      relaxedMinimumScore: body.relaxedMinimumScore,
    });

    return NextResponse.json({
      query: result.query,
      intent: result.intent,
      recommendations: result.recommendations,
      results: result.results,
      summary: {
        recommended: result.recommendations.length,
        resolved: result.results.length,
        verified: result.results.filter(({ track }) => track.status === 'verified').length,
        unavailable: result.results.filter(({ track }) => track.status === 'unavailable').length,
      },
    });
  } catch (error) {
    console.error('[V2 discovery] request failed:', error);
    const message = error instanceof Error ? error.message : 'Discovery pipeline failed.';
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
