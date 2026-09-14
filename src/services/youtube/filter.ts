import type { SongCandidate } from '@/types/discovery';
import type { YouTubeCandidate } from './types';

const REJECT_TITLE_TERMS = [
  'interview',
  'reaction',
  'trailer',
  'teaser',
  'behind the scenes',
  'documentary',
  'movie clip',
  'scene',
  'news',
  'status',
  'shorts',
  'jukebox',
  'compilation',
  'full album',
  'playlist',
  'mashup',
];

const VARIANT_TERMS = [
  'remix',
  'cover',
  'live',
  'acoustic',
  'sped up',
  'slowed',
  'nightcore',
  '8d',
  'instrumental',
  'karaoke',
  'lyrics',
  'lyric video',
];

function normalized(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isRejectedCandidate(candidate: YouTubeCandidate): boolean {
  const title = normalized(candidate.title);
  return REJECT_TITLE_TERMS.some(term => title.includes(term));
}

export function isVariantCandidate(candidate: YouTubeCandidate): boolean {
  const title = normalized(candidate.title);
  return VARIANT_TERMS.some(term => title.includes(term));
}

export function filterCandidates(
  candidates: YouTubeCandidate[],
  _song: SongCandidate,
): YouTubeCandidate[] {
  const seen = new Set<string>();

  return candidates.filter(candidate => {
    if (!candidate.videoId || !candidate.title || seen.has(candidate.videoId)) return false;
    if (isRejectedCandidate(candidate)) return false;
    seen.add(candidate.videoId);
    return true;
  });
}

export { REJECT_TITLE_TERMS, VARIANT_TERMS };
