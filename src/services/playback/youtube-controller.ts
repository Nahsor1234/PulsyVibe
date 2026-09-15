'use client';

import type { Track } from '@/types/track';
import type { PlaybackState, PlayerState, QueueState } from '@/types/playback';
import {
  createQueueState,
  currentTrack,
  enqueue,
  moveTo,
  nextIndex,
  previousIndex,
  removeAt,
} from './queue';
import {
  YouTubePlayerAdapter,
  type YouTubePlayerSnapshot,
} from './youtube-player';
import { configureMediaSession, updateMediaSession } from './media-session';

function mapPlayerState(snapshot: YouTubePlayerSnapshot, current: Track | null): PlayerState {
  switch (snapshot.state) {
    case 'playing':
      return {
        status: 'playing',
        currentTrack: current,
        currentTime: snapshot.currentTime,
        duration: snapshot.duration,
        volume: snapshot.volume / 100,
        muted: snapshot.muted,
        error: snapshot.error,
      };
    case 'paused':
    case 'cued':
      return {
        status: 'paused',
        currentTrack: current,
        currentTime: snapshot.currentTime,
        duration: snapshot.duration,
        volume: snapshot.volume / 100,
        muted: snapshot.muted,
        error: snapshot.error,
      };
    case 'buffering':
      return {
        status: 'loading',
        currentTrack: current,
        currentTime: snapshot.currentTime,
        duration: snapshot.duration,
        volume: snapshot.volume / 100,
        muted: snapshot.muted,
        error: snapshot.error,
      };
    case 'ended':
      return {
        status: 'ended',
        currentTrack: current,
        currentTime: snapshot.currentTime,
        duration: snapshot.duration,
        volume: snapshot.volume / 100,
        muted: snapshot.muted,
        error: snapshot.error,
      };
    case 'unstarted':
    default:
      return {
        status: snapshot.error ? 'error' : 'idle',
        currentTrack: current,
        currentTime: snapshot.currentTime,
        duration: snapshot.duration,
        volume: snapshot.volume / 100,
        muted: snapshot.muted,
        error: snapshot.error,
      };
  }
}

/**
 * Queue-aware playback controller for the official YouTube IFrame Player API.
 * It never handles or exposes extracted media URLs.
 */
export class YouTubePlaybackController {
  private queue: QueueState;
  private readonly player: YouTubePlayerAdapter;
  private playerState: PlayerState;
  private readonly listeners = new Set<(state: PlaybackState) => void>();
  private readonly cleanupMediaSession: () => void;
  private unsubscribePlayer: (() => void) | null = null;
  private mounted = false;
  private destroyed = false;
  private transitionId = 0;

  constructor(container: HTMLElement, initialTracks: Track[] = []) {
    this.queue = createQueueState(initialTracks);
    this.player = new YouTubePlayerAdapter(container);
    this.playerState = mapPlayerState(this.player.getSnapshot(), currentTrack(this.queue));

    this.cleanupMediaSession = configureMediaSession({
      play: () => this.play(),
      pause: () => this.pause(),
      next: () => this.next(),
      previous: () => this.previous(),
      seek: seconds => this.seek(this.playerState.currentTime + seconds),
    });
  }

  async mount(): Promise<void> {
    if (this.destroyed || this.mounted) return;

    await this.player.mount();
    if (this.destroyed) return;

    this.mounted = true;
    this.unsubscribePlayer = this.player.subscribe(snapshot => this.handlePlayerSnapshot(snapshot));
    const track = currentTrack(this.queue);
    if (track?.status === 'verified') this.player.load(track.videoId, false);
    this.syncPlayerState(this.player.getSnapshot());
    this.emit();
  }

  getState(): PlaybackState {
    return {
      queue: { ...this.queue, items: [...this.queue.items] },
      player: { ...this.playerState },
    };
  }

  subscribe(listener: (state: PlaybackState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  enqueue(tracks: Track[]): void {
    if (this.destroyed || tracks.length === 0) return;
    const verified = tracks.filter(track => track.status === 'verified');
    if (!verified.length) return;
    this.queue = enqueue(this.queue, verified);
    this.emit();
  }

  removeAt(index: number): void {
    if (this.destroyed || !this.mounted) return;

    const wasCurrent = index === this.queue.currentIndex;
    this.queue = removeAt(this.queue, index);

    if (wasCurrent) {
      const track = currentTrack(this.queue);
      if (track?.status === 'verified') this.player.load(track.videoId, true);
      else this.player.pause();
    }

    this.syncPlayerState(this.player.getSnapshot());
    this.emit();
  }

  async play(): Promise<void> {
    if (this.destroyed || !this.mounted) return;

    const track = currentTrack(this.queue);
    if (!track || track.status !== 'verified') return;

    if (this.playerState.currentTrack?.id === track.id && this.playerState.status !== 'ended') {
      this.player.play();
      return;
    }

    await this.playCurrent();
  }

  pause(): void {
    if (this.destroyed || !this.mounted) return;
    this.player.pause();
  }

  async next(fromEnded = false): Promise<void> {
    if (this.destroyed || !this.mounted) return;

    const index = nextIndex(this.queue);
    if (index < 0) {
      if (fromEnded) {
        this.playerState = { ...this.playerState, status: 'ended' };
        this.emit();
      }
      return;
    }

    this.queue = moveTo(this.queue, index);
    this.emit();
    await this.playCurrent();
  }

  async previous(): Promise<void> {
    if (this.destroyed || !this.mounted) return;

    const index = previousIndex(this.queue);
    if (index < 0) return;

    this.queue = moveTo(this.queue, index);
    this.emit();
    await this.playCurrent();
  }

  async playAt(index: number): Promise<void> {
    if (this.destroyed || !this.mounted || index < 0 || index >= this.queue.items.length) return;

    this.queue = moveTo(this.queue, index);
    this.emit();
    await this.playCurrent();
  }

  seek(seconds: number): void {
    if (this.destroyed || !this.mounted) return;
    this.player.seek(seconds);
  }

  setVolume(volume: number): void {
    if (this.destroyed || !this.mounted) return;
    this.player.setVolume(Math.max(0, Math.min(1, volume)) * 100);
  }

  setMuted(muted: boolean): void {
    if (this.destroyed || !this.mounted) return;
    this.player.setMuted(muted);
  }

  setShuffle(shuffle: boolean): void {
    if (this.destroyed) return;
    this.queue = { ...this.queue, shuffle };
    this.emit();
  }

  setRepeat(repeat: QueueState['repeat']): void {
    if (this.destroyed) return;
    this.queue = { ...this.queue, repeat };
    this.emit();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.transitionId += 1;
    this.mounted = false;
    this.unsubscribePlayer?.();
    this.unsubscribePlayer = null;
    this.cleanupMediaSession();
    this.listeners.clear();
    this.player.destroy();
  }

  private async playCurrent(): Promise<void> {
    const track = currentTrack(this.queue);
    if (!track || track.status !== 'verified' || this.destroyed || !this.mounted) return;

    const transitionId = ++this.transitionId;
    this.player.load(track.videoId, true);

    // A later queue transition invalidates this request. The adapter load is
    // synchronous with respect to the controller; this guard protects future
    // asynchronous adapter implementations from reviving an obsolete track.
    if (transitionId !== this.transitionId || this.destroyed) return;
  }

  private handlePlayerSnapshot(snapshot: YouTubePlayerSnapshot): void {
    this.syncPlayerState(snapshot);

    if (snapshot.state === 'ended') {
      void this.next(true);
    }

    updateMediaSession(this.playerState.currentTrack, this.playerState);
    this.emit();
  }

  private syncPlayerState(snapshot: YouTubePlayerSnapshot): void {
    this.playerState = mapPlayerState(snapshot, currentTrack(this.queue));
  }

  private emit(): void {
    if (this.destroyed) return;
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }
}
