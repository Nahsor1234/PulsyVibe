import type { SongCandidate } from '@/types/discovery';

export type YouTubeCandidate = {
  videoId: string;
  title: string;
  channel: string;
  duration?: number;
  thumbnail?: string;
  isVerifiedChannel: boolean;
  isTopicChannel: boolean;
  isVevoChannel: boolean;
  sourceQuery: string;
};

export type SearchOptions = {
  limit?: number;
  queries?: string[];
};

export type YouTubeSearchClient = {
  search(candidate: SongCandidate, options?: SearchOptions): Promise<YouTubeCandidate[]>;
};
