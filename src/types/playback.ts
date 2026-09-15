import type { Track } from './track';

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

export interface QueueState {
  items: Track[];
  currentIndex: number;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
}

export interface PlayerState {
  status: PlaybackStatus;
  currentTrack: Track | null;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  error: string | null;
}

export interface PlaybackState {
  queue: QueueState;
  player: PlayerState;
}
