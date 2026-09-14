/**
 * Canonical song identity produced by the recommendation layer.
 *
 * AI recommends a song; it does not choose a YouTube video. Resolution is
 * handled separately by the discovery/resolution engine.
 */
export interface SongCandidate {
  title: string;
  artist: string;
  album?: string;
  year?: number;
  language?: string;
  genre?: string;
  mood?: string;
  energy?: number;
}

export type DiscoveryRequest = {
  candidates: SongCandidate[];
};

export type DiscoveryResult = {
  candidates: SongCandidate[];
};
