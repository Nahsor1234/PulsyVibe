/**
 * V2 AI contract.
 *
 * The AI layer describes user intent and recommends canonical songs. It must
 * never resolve YouTube IDs or playback sources.
 */

export type IntentMode =
  | 'mood'
  | 'activity'
  | 'genre'
  | 'artist'
  | 'language'
  | 'era'
  | 'similar'
  | 'search'
  | 'mixed';

export interface MusicIntent {
  query: string;
  mode: IntentMode;
  mood?: string;
  activity?: string;
  genres?: string[];
  artists?: string[];
  languages?: string[];
  eras?: string[];
  seedSongs?: Array<{
    title: string;
    artist: string;
  }>;
  count: number;
}

export interface RecommendationRequest {
  intent: MusicIntent;
  count?: number;
}

export interface RecommendationResult {
  candidates: import('./discovery').SongCandidate[];
}

export interface IntentEngine {
  parse(query: string): Promise<MusicIntent>;
}

export interface RecommendationEngine {
  recommend(request: RecommendationRequest): Promise<RecommendationResult>;
}
