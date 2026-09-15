'use client';

import type { Track } from '@/types/track';
import type { PlaybackState, PlayerState, QueueState } from '@/types/playback';
import { createQueueState, currentTrack, enqueue, moveTo, nextIndex, previousIndex, removeAt } from './queue';
import { YouTubePlayerAdapter, type YouTubePlayerSnapshot } from './youtube-player';
import { configureMediaSession, updateMediaSession } from './media-session';

const STORAGE_KEY = 'pulsyvibe:playback:v1';

type PersistedPlayback = { queue: QueueState; currentTime: number };

function readPersistedPlayback(): PersistedPlayback | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<PersistedPlayback>;
    const queue = value.queue;
    if (!queue || !Array.isArray(queue.items) || typeof queue.currentIndex !== 'number') return null;
    if (queue.currentIndex < -1 || queue.currentIndex >= queue.items.length) return null;
    if (queue.repeat !== 'off' && queue.repeat !== 'all' && queue.repeat !== 'one') return null;
    if (typeof queue.shuffle !== 'boolean') return null;
    return {
      queue: { items: queue.items, currentIndex: queue.currentIndex, shuffle: queue.shuffle, repeat: queue.repeat },
      currentTime: typeof value.currentTime === 'number' && Number.isFinite(value.currentTime) ? Math.max(0, value.currentTime) : 0,
    };
  } catch {
    return null;
  }
}

function mapPlayerState(snapshot: YouTubePlayerSnapshot, current: Track | null): PlayerState {
  switch (snapshot.state) {
    case 'playing': return { status: 'playing', currentTrack: current, currentTime: snapshot.currentTime, duration: snapshot.duration, volume: snapshot.volume / 100, muted: snapshot.muted, error: snapshot.error };
    case 'paused':
    case 'cued': return { status: 'paused', currentTrack: current, currentTime: snapshot.currentTime, duration: snapshot.duration, volume: snapshot.volume / 100, muted: snapshot.muted, error: snapshot.error };
    case 'buffering': return { status: 'loading', currentTrack: current, currentTime: snapshot.currentTime, duration: snapshot.duration, volume: snapshot.volume / 100, muted: snapshot.muted, error: snapshot.error };
    case 'ended': return { status: 'ended', currentTrack: current, currentTime: snapshot.currentTime, duration: snapshot.duration, volume: snapshot.volume / 100, muted: snapshot.muted, error: snapshot.error };
    default: return { status: snapshot.error ? 'error' : 'idle', currentTrack: current, currentTime: snapshot.currentTime, duration: snapshot.duration, volume: snapshot.volume / 100, muted: snapshot.muted, error: snapshot.error };
  }
}

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
  private persistedCurrentTime = 0;
  private persistTimer: ReturnType<typeof setInterval> | null = null;

  constructor(container: HTMLElement, initialTracks: Track[] = []) {
    const persisted = readPersistedPlayback();
    this.queue = persisted?.queue ?? createQueueState(initialTracks);
    this.persistedCurrentTime = persisted?.currentTime ?? 0;
    this.player = new YouTubePlayerAdapter(container);
    this.playerState = mapPlayerState(this.player.getSnapshot(), currentTrack(this.queue));
    this.cleanupMediaSession = configureMediaSession({ play: () => this.play(), pause: () => this.pause(), next: () => this.next(), previous: () => this.previous(), seek: seconds => this.seek(this.playerState.currentTime + seconds) });
  }

  async mount(): Promise<void> {
    if (this.destroyed || this.mounted) return;
    await this.player.mount();
    if (this.destroyed) return;
    this.mounted = true;
    this.unsubscribePlayer = this.player.subscribe(snapshot => this.handlePlayerSnapshot(snapshot));
    const track = currentTrack(this.queue);
    if (track?.status === 'verified') {
      this.player.load(track.videoId, false);
      if (this.persistedCurrentTime > 0) {
        window.setTimeout(() => {
          if (!this.destroyed && this.mounted && currentTrack(this.queue)?.id === track.id) this.player.seek(this.persistedCurrentTime);
        }, 300);
      }
    }
    this.persistTimer = setInterval(() => this.persistPlayback(), 5000);
    this.syncPlayerState(this.player.getSnapshot());
    this.persistPlayback();
    this.emit();
  }

  getState(): PlaybackState { return { queue: { ...this.queue, items: [...this.queue.items] }, player: { ...this.playerState } }; }

  subscribe(listener: (state: PlaybackState) => void): () => void { this.listeners.add(listener); listener(this.getState()); return () => this.listeners.delete(listener); }

  enqueue(tracks: Track[]): void {
    if (this.destroyed || tracks.length === 0) return;
    const verified = tracks.filter(track => track.status === 'verified');
    if (!verified.length) return;
    this.queue = enqueue(this.queue, verified);
    this.persistPlayback();
    this.emit();
  }

  removeAt(index: number): void {
    if (this.destroyed || !this.mounted) return;
    const wasCurrent = index === this.queue.currentIndex;
    this.queue = removeAt(this.queue, index);
    if (wasCurrent) {
      const track = currentTrack(this.queue);
      if (track?.status === 'verified') this.player.load(track.videoId, true); else this.player.pause();
    }
    this.persistPlayback();
    this.syncPlayerState(this.player.getSnapshot());
    this.emit();
  }

  async play(): Promise<void> {
    if (this.destroyed || !this.mounted) return;
    const track = currentTrack(this.queue);
    if (!track || track.status !== 'verified') return;
    if (this.playerState.currentTrack?.id === track.id && this.playerState.status !== 'ended') { this.player.play(); return; }
    await this.playCurrent();
  }

  pause(): void { if (this.destroyed || !this.mounted) return; this.player.pause(); this.persistPlayback(); }

  async next(fromEnded = false): Promise<void> {
    if (this.destroyed || !this.mounted) return;
    const index = nextIndex(this.queue);
    if (index < 0) {
      if (fromEnded) { this.playerState = { ...this.playerState, status: 'ended' }; this.persistPlayback(); this.emit(); }
      return;
    }
    this.queue = moveTo(this.queue, index);
    this.persistedCurrentTime = 0;
    this.persistPlayback();
    this.emit();
    await this.playCurrent();
  }

  async previous(): Promise<void> {
    if (this.destroyed || !this.mounted) return;
    const index = previousIndex(this.queue);
    if (index < 0) return;
    this.queue = moveTo(this.queue, index);
    this.persistedCurrentTime = 0;
    this.persistPlayback();
    this.emit();
    await this.playCurrent();
  }

  async playAt(index: number): Promise<void> {
    if (this.destroyed || !this.mounted || index < 0 || index >= this.queue.items.length) return;
    this.queue = moveTo(this.queue, index);
    this.persistedCurrentTime = 0;
    this.persistPlayback();
    this.emit();
    await this.playCurrent();
  }

  seek(seconds: number): void {
    if (this.destroyed || !this.mounted) return;
    const nextSeconds = Math.max(0, seconds);
    this.player.seek(nextSeconds);
    this.persistedCurrentTime = nextSeconds;
    this.persistPlayback();
  }

  setVolume(volume: number): void { if (this.destroyed || !this.mounted) return; this.player.setVolume(Math.max(0, Math.min(1, volume)) * 100); }
  setMuted(muted: boolean): void { if (this.destroyed || !this.mounted) return; this.player.setMuted(muted); }

  setShuffle(shuffle: boolean): void { if (this.destroyed) return; this.queue = { ...this.queue, shuffle }; this.persistPlayback(); this.emit(); }
  setRepeat(repeat: QueueState['repeat']): void { if (this.destroyed) return; this.queue = { ...this.queue, repeat }; this.persistPlayback(); this.emit(); }

  destroy(): void {
    if (this.destroyed) return;
    this.persistPlayback();
    this.destroyed = true;
    this.transitionId += 1;
    this.mounted = false;
    if (this.persistTimer !== null) { clearInterval(this.persistTimer); this.persistTimer = null; }
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
    if (transitionId !== this.transitionId || this.destroyed) return;
  }

  private handlePlayerSnapshot(snapshot: YouTubePlayerSnapshot): void {
    this.syncPlayerState(snapshot);
    if (snapshot.state === 'playing' || snapshot.state === 'paused' || snapshot.state === 'buffering') this.persistedCurrentTime = snapshot.currentTime;
    if (snapshot.state === 'ended') { this.persistedCurrentTime = 0; void this.next(true); }
    updateMediaSession(this.playerState.currentTrack, this.playerState);
    this.emit();
  }

  private syncPlayerState(snapshot: YouTubePlayerSnapshot): void { this.playerState = mapPlayerState(snapshot, currentTrack(this.queue)); }

  private persistPlayback(): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ queue: { ...this.queue, items: [...this.queue.items] }, currentTime: this.persistedCurrentTime } satisfies PersistedPlayback));
    } catch {
      // Ignore unavailable or full storage.
    }
  }

  private emit(): void { if (this.destroyed) return; const state = this.getState(); this.listeners.forEach(listener => listener(state)); }
}
