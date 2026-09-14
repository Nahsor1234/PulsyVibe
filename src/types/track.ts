import type { SongCandidate } from './discovery';

/**
 * Canonical resolved track representation used by discovery and playback.
 */
export interface Track {
  id: string;
  title: string;
  artist: string;
  videoId: string;
  channel?: string;
  duration?: number;
  thumbnail?: string;

  confidence: number;

  verification: {
    titleMatch: number;
    artistMatch: number;
    channelScore: number;
    durationScore: number;
    musicScore: number;
  };

  source: 'cache' | 'youtube-search';

  status:
    | 'candidate'
    | 'searching'
    | 'verified'
    | 'unavailable';
}

export type TrackResolution = {
  candidate: SongCandidate;
  track: Track;
};
