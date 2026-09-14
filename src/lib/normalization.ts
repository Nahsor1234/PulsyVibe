/**
 * Shared normalization primitives for song identity, deduplication, ranking,
 * and cache keys. Keep this layer deterministic and side-effect free.
 */

const DIACRITICS_RE = /[\u0300-\u036f]/g;
const METADATA_WORDS = new Set(['official','video','audio','music','lyrics','lyric','hd','4k','vevo','topic','original']);

export function normalizeUnicode(value: string): string {
  return value.normalize('NFKD').replace(DIACRITICS_RE, '').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').trim();
}

export function normalizeTitle(value: string): string {
  return normalizeUnicode(value).toLowerCase()
    .replace(/\((?:official|official music video|music video|audio|lyrics?|hd|4k|vevo|topic)\)/gi, ' ')
    .replace(/\b(?:official|music video|lyrics?|audio|hd|4k|vevo|topic)\b/gi, ' ')
    .replace(/\s+/g, ' ').trim();
}

export function normalizeArtist(value: string): string {
  return normalizeUnicode(value).toLowerCase()
    .replace(/\b(?:official|vevo|topic)\b/gi, ' ')
    .replace(/\s+/g, ' ').trim();
}

export function tokenizeIdentity(value: string): string[] {
  return normalizeUnicode(value).toLowerCase().split(/[^a-z0-9]+/i)
    .filter(token => token.length > 0 && !METADATA_WORDS.has(token));
}

export function normalizeIdentity(value: string): string {
  return tokenizeIdentity(value).join('');
}

export function getSongIdentity(title: string, artist: string): string {
  return `${normalizeIdentity(normalizeTitle(title))}|${normalizeIdentity(normalizeArtist(artist))}`;
}

// Backwards-compatible aliases for existing V1-derived callers.
export const normalizeText = normalizeUnicode;
export const tokenize = tokenizeIdentity;
export const compactText = normalizeIdentity;
export const identityKey = getSongIdentity;
