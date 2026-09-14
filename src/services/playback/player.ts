import type { Track } from '@/types/track';
import type { PlayerState, PlaybackSource } from '@/types/playback';

export class AudioPlayer {
  private readonly audio: HTMLAudioElement;
  private readonly source: PlaybackSource;
  private listeners = new Set<(state: PlayerState) => void>();
  private track: Track | null = null;
  private status: PlayerState['status'] = 'idle';
  private error: string | null = null;

  constructor(source: PlaybackSource, audio?: HTMLAudioElement) {
    this.source = source;
    this.audio = audio ?? new Audio();
    this.audio.preload = 'auto';
    this.audio.addEventListener('timeupdate', () => this.emit());
    this.audio.addEventListener('durationchange', () => this.emit());
    this.audio.addEventListener('play', () => { this.status = 'playing'; this.emit(); });
    this.audio.addEventListener('pause', () => { if (!this.audio.ended) this.status = 'paused'; this.emit(); });
    this.audio.addEventListener('ended', () => { this.status = 'ended'; this.emit(); });
    this.audio.addEventListener('error', () => { this.status = 'error'; this.error = 'Playback source failed.'; this.emit(); });
  }

  get element(): HTMLAudioElement { return this.audio; }

  getState(): PlayerState {
    return {
      status: this.status,
      currentTrack: this.track,
      currentTime: Number.isFinite(this.audio.currentTime) ? this.audio.currentTime : 0,
      duration: Number.isFinite(this.audio.duration) ? this.audio.duration : 0,
      volume: this.audio.volume,
      muted: this.audio.muted,
      error: this.error,
    };
  }

  subscribe(listener: (state: PlayerState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  async load(track: Track): Promise<void> {
    if (track.status !== 'verified') throw new Error('Only verified tracks can be played.');
    this.status = 'loading';
    this.error = null;
    this.track = track;
    this.emit();
    try {
      const url = await this.source.getSource(track);
      this.audio.src = url;
      this.audio.load();
    } catch (error) {
      this.status = 'error';
      this.error = error instanceof Error ? error.message : 'Unable to load playback source.';
      this.emit();
      throw error;
    }
  }

  async play(): Promise<void> {
    this.error = null;
    await this.audio.play();
  }

  pause(): void { this.audio.pause(); }

  async playTrack(track: Track): Promise<void> {
    await this.load(track);
    await this.play();
  }

  seek(seconds: number): void {
    if (!Number.isFinite(seconds)) return;
    const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : Infinity;
    this.audio.currentTime = Math.max(0, Math.min(seconds, duration));
    this.emit();
  }

  setVolume(volume: number): void {
    this.audio.volume = Math.max(0, Math.min(1, volume));
    this.emit();
  }

  setMuted(muted: boolean): void {
    this.audio.muted = muted;
    this.emit();
  }

  destroy(): void {
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    this.listeners.clear();
  }

  private emit(): void {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }
}
