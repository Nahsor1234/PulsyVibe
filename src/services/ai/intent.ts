import type { IntentEngine, MusicIntent } from '@/types/ai';

const DEFAULT_COUNT = 20;
const MAX_QUERY_LENGTH = 500;

/**
 * Thin application boundary around the AI intent provider.
 * Validation stays here so the rest of V2 can trust the intent contract.
 */
export async function parseMusicIntent(
  engine: IntentEngine,
  query: string,
): Promise<MusicIntent> {
  const normalizedQuery = query.trim().slice(0, MAX_QUERY_LENGTH);
  if (!normalizedQuery) {
    throw new Error('Music query cannot be empty.');
  }

  const intent = await engine.parse(normalizedQuery);
  return sanitizeIntent(intent, normalizedQuery);
}

export function sanitizeIntent(intent: MusicIntent, fallbackQuery: string): MusicIntent {
  return {
    ...intent,
    query: intent.query?.trim() || fallbackQuery,
    count: clampCount(intent.count),
    genres: cleanList(intent.genres),
    artists: cleanList(intent.artists),
    languages: cleanList(intent.languages),
    eras: cleanList(intent.eras),
    seedSongs: intent.seedSongs
      ?.filter(song => song && typeof song.title === 'string' && typeof song.artist === 'string')
      .map(song => ({ title: song.title.trim(), artist: song.artist.trim() }))
      .filter(song => song.title && song.artist),
  };
}

function cleanList(values?: string[]): string[] | undefined {
  if (!values) return undefined;
  const cleaned = [...new Set(values.map(value => value.trim()).filter(Boolean))];
  return cleaned.length ? cleaned : undefined;
}

function clampCount(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_COUNT;
  return Math.min(Math.max(1, Math.floor(value)), 50);
}
