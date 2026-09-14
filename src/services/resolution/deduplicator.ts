import type { SongCandidate } from '@/types/discovery';
import { getSongIdentity } from '@/lib/normalization';

/** Removes repeated logical songs while preserving the first occurrence. */
export function deduplicateSongs(candidates: SongCandidate[]): SongCandidate[] {
  const seen = new Set<string>();
  const result: SongCandidate[] = [];

  for (const candidate of candidates) {
    const identity = getSongIdentity(candidate.title, candidate.artist);
    if (seen.has(identity)) continue;
    seen.add(identity);
    result.push(candidate);
  }

  return result;
}

export function deduplicateByIdentity<T>(
  items: T[],
  identityOf: (item: T) => string,
): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const identity = identityOf(item);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}
