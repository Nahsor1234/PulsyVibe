import type { SongCandidate } from '@/types/discovery';
import type { YouTubeCandidate } from '@/services/youtube/types';
import { normalizeArtist, normalizeTitle } from '@/lib/normalization';
import { isVariantCandidate } from '@/services/youtube/filter';

export type RankingBreakdown = {
  titleMatch: number;
  artistMatch: number;
  channelScore: number;
  durationScore: number;
  musicScore: number;
  variantPenalty: number;
  total: number;
};

export type RankedYouTubeCandidate = YouTubeCandidate & {
  score: number;
  breakdown: RankingBreakdown;
};

function tokens(value: string): Set<string> {
  return new Set(normalizeTitle(value).split(/[^a-z0-9]+/).filter(Boolean));
}

function tokenSimilarity(a: string, b: string): number {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.size || !right.size) return 0;

  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection++;
  return intersection / Math.max(left.size, right.size);
}

function artistSimilarity(expected: string, actual: string): number {
  const a = normalizeArtist(expected);
  const b = normalizeArtist(actual);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (b.includes(a) || a.includes(b)) return 0.85;
  return tokenSimilarity(a, b);
}

function channelScore(candidate: YouTubeCandidate): number {
  if (candidate.isVevoChannel) return 1;
  if (candidate.isTopicChannel) return 0.95;
  if (candidate.isVerifiedChannel) return 0.85;
  return 0.35;
}

function durationScore(duration: number | undefined): number {
  if (duration == null) return 0.5;
  if (duration < 45) return 0;
  if (duration <= 600) return 1;
  if (duration <= 900) return 0.7;
  return 0.25;
}

function musicScore(candidate: YouTubeCandidate): number {
  const title = normalizeTitle(candidate.title);
  const channel = normalizeTitle(candidate.channel);
  let score = 0.5;
  if (/\b(official|music video|audio)\b/.test(title)) score += 0.25;
  if (candidate.isTopicChannel || candidate.isVevoChannel) score += 0.2;
  if (/\b(official artist channel|records|music)\b/.test(channel)) score += 0.05;
  return Math.min(1, score);
}

function variantPenalty(candidate: YouTubeCandidate): number {
  return isVariantCandidate(candidate) ? 0.25 : 0;
}

export function scoreCandidate(song: SongCandidate, candidate: YouTubeCandidate): RankingBreakdown {
  const titleMatch = tokenSimilarity(song.title, candidate.title);
  const artistMatch = artistSimilarity(song.artist, candidate.channel);
  const channel = channelScore(candidate);
  const duration = durationScore(candidate.duration);
  const music = musicScore(candidate);
  const penalty = variantPenalty(candidate);

  // Deliberately normalized to 0..100 so the score is easy to inspect and benchmark.
  const total = Math.max(0, Math.min(100,
    titleMatch * 40 +
    artistMatch * 30 +
    channel * 15 +
    duration * 5 +
    music * 10 -
    penalty * 100,
  ));

  return {
    titleMatch,
    artistMatch,
    channelScore: channel,
    durationScore: duration,
    musicScore: music,
    variantPenalty: penalty,
    total,
  };
}

export function rankCandidates(
  song: SongCandidate,
  candidates: YouTubeCandidate[],
): RankedYouTubeCandidate[] {
  return candidates
    .map(candidate => ({
      ...candidate,
      score: scoreCandidate(song, candidate).total,
      breakdown: scoreCandidate(song, candidate),
    }))
    .sort((a, b) => b.score - a.score || a.videoId.localeCompare(b.videoId));
}
