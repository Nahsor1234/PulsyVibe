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
const MAX_SCORE = 100;

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
    isOptionalIntegerInRange(payload.count, 1, MAX_COUNT) &&
    (payload.mode === undefined || ['single', 'batch', 'progressive'].includes(payload.mode)) &&
    isOptionalIntegerInRange(payload.concurrency, 1, MAX_CONCURRENCY) &&
    isOptionalIntegerInRange(payload.searchLimit, 1, MAX_SEARCH_LIMIT) &&
    isOptionalNumberInRange(payload.minimumScore, 0, MAX_SCORE) &&
    isOptionalNumberInRange(payload.relaxedMinimumScore, 0, MAX_SCORE)
  );
}

function isOptionalIntegerInRange(value: unknown, min: number, max: number): value is number | undefined {
  return value === undefined || (typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max);
}

function isOptionalNumberInRange(value: unknown, min: number, max: number): value is number | undefined {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max);
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
        { error: 'Invalid discovery payload.' },
        { status: 400 },
      );
    }

    const orchestrator = createDiscoveryOrchestrator();

    const result = await orchestrator.discover(body.query.trim(), {
      count: body.count,
      mode: body.mode,
      concurrency: body.concurrency,
      searchLimit: body.searchLimit,
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
    return NextResponse.json(
      { error: 'Discovery temporarily failed. Please try again.' },
      { status: 500 },
    );
  }
}
