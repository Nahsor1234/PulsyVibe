import type { Track } from '@/types/track';
import type { PlaybackSource, PlaybackState, QueueState } from '@/types/playback';
import {
  createQueueState,
  currentTrack,
  enqueue,
  moveTo,
  nextIndex,
  previousIndex,
  removeAt,
} from './queue';
import { AudioPlayer } from './player';
import { configureMediaSession, updateMediaSession } from './media-session';

export class PlaybackController {
  private queue: QueueState;
  private readonly player: AudioPlayer;
  private readonly listeners = new Set<(state: PlaybackState) => void>();
  private readonly cleanupMediaSession: () => void;
  private operationId = 0;
  private destroyed = false;

  constructor(source: PlaybackSource, initialTracks: Track[] = [], audio?: HTMLAudioElement) {
    this.queue = createQueueState(initialTracks);
    this.player = new AudioPlayer(source, audio);

    this.player.subscribe(playerState => {
      updateMediaSession(playerState.currentTrack, playerState);

      if (playerState.status === 'ended') {
        void this.next(true);
      }

      this.emit();
    });

    this.cleanupMediaSession = configureMediaSession({
      play: () => this.play(),
      pause: () => this.pause(),
      next: () => this.next(),
      previous: () => this.previous(),
      seek: seconds => this.seek(this.player.getState().currentTime + seconds),
    });

    this.emit();
  }

  getState(): PlaybackState {
    return {
      queue: this.queue,
      player: this.player.getState(),
    };
  }

  subscribe(listener: (state: PlaybackState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  enqueue(tracks: Track[]): void {
    if (this.destroyed || tracks.length === 0) return;
    this.queue = enqueue(this.queue, tracks);
    this.emit();
  }

  removeAt(index: number): void {
    if (this.destroyed) return;
    const wasCurrent = index === this.queue.currentIndex;
    this.queue = removeAt(this.queue, index);

    if (wasCurrent) {
      const track = currentTrack(this.queue);
      if (track) void this.playCurrent();
      else this.player.pause();
    }

    this.emit();
  }

  async play(): Promise<void> {
    if (this.destroyed) return;
    const track = currentTrack(this.queue);
    if (!track) return;

    const playerState = this.player.getState();
    if (playerState.currentTrack?.id === track.id && playerState.status !== 'ended') {
      await this.player.play();
      return;
    }

    await this.playCurrent();
  }

  pause(): void {
    if (this.destroyed) return;
    this.player.pause();
  }

  async next(fromEnded = false): Promise<void> {
    if (this.destroyed) return;

    const index = nextIndex(this.queue);
    if (index < 0) {
      if (fromEnded) this.emit();
      return;
    }

    this.queue = moveTo(this.queue, index);
    this.emit();
    await this.playCurrent();
  }

  async previous(): Promise<void> {
    if (this.destroyed) return;

    const index = previousIndex(this.queue);
    if (index < 0) return;

    this.queue = moveTo(this.queue, index);
    this.emit();
    await this.playCurrent();
  }

  async playAt(index: number): Promise<void> {
    if (this.destroyed || index < 0 || index >= this.queue.items.length) return;
    this.queue = moveTo(this.queue, index);
    this.emit();
    await this.playCurrent();
  }

  seek(seconds: number): void {
    if (this.destroyed) return;
    this.player.seek(seconds);
  }

  setVolume(volume: number): void {
    if (this.destroyed) return;
    this.player.setVolume(volume);
  }

  setMuted(muted: boolean): void {
    if (this.destroyed) return;
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
    this.operationId += 1;
    this.cleanupMediaSession();
    this.listeners.clear();
    this.player.destroy();
  }

  private async playCurrent(): Promise<void> {
    const track = currentTrack(this.queue);
    if (!track || this.destroyed) return;

    const operationId = ++this.operationId;

    try {
      await this.player.playTrack(track);
    } catch (error) {
      if (operationId !== this.operationId || this.destroyed) return;
      // AudioPlayer owns the detailed error state. Keep the controller alive so
      // the UI can decide whether to retry, skip, or report the failure.
      this.emit();
      throw error;
    }

    if (operationId !== this.operationId || this.destroyed) {
      this.player.pause();
    }
  }

  private emit(): void {
    if (this.destroyed) return;
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }
}
