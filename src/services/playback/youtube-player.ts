export type YouTubePlayerState =
  | 'unstarted'
  | 'ended'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'cued';

export type YouTubePlayerSnapshot = {
  state: YouTubePlayerState;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  error: string | null;
};

export type YouTubePlayerListener = (snapshot: YouTubePlayerSnapshot) => void;

type YouTubeApiPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  loadVideoById(videoId: string): void;
  cueVideoById(videoId: string): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  getVolume(): number;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
};

type YouTubePlayerEvent = {
  target: YouTubeApiPlayer;
  data?: number;
};

type YouTubePlayerConstructor = new (
  element: HTMLElement,
  options: {
    videoId?: string;
    playerVars?: Record<string, number | string>;
    events?: {
      onReady?: (event: YouTubePlayerEvent) => void;
      onStateChange?: (event: YouTubePlayerEvent) => void;
      onError?: (event: YouTubePlayerEvent) => void;
      onAutoplayBlocked?: () => void;
    };
  },
) => YouTubeApiPlayer;

declare global {
  interface Window {
    YT?: {
      Player: YouTubePlayerConstructor;
      PlayerState: {
        UNSTARTED: -1;
        ENDED: 0;
        PLAYING: 1;
        PAUSED: 2;
        BUFFERING: 3;
        CUED: 5;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

/** Loads Google's official YouTube IFrame Player API once per page. */
export function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('YouTube playback requires a browser.'));
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<void>((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve();
    };

    const existing = document.querySelector<HTMLScriptElement>('script[data-pulsyvibe-youtube-api]');
    if (existing) return;

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.dataset.pulsyvibeYoutubeApi = 'true';
    script.onerror = () => {
      apiPromise = null;
      reject(new Error('Unable to load the YouTube IFrame Player API.'));
    };
    document.head.appendChild(script);
  });

  return apiPromise;
}

function mapState(state: number | undefined): YouTubePlayerState {
  switch (state) {
    case 0: return 'ended';
    case 1: return 'playing';
    case 2: return 'paused';
    case 3: return 'buffering';
    case 5: return 'cued';
    default: return 'unstarted';
  }
}

/**
 * Thin adapter around the official YouTube IFrame Player API.
 * It deliberately exposes videoId playback, not extracted media URLs.
 */
export class YouTubePlayerAdapter {
  private player: YouTubeApiPlayer | null = null;
  private listeners = new Set<YouTubePlayerListener>();
  private state: YouTubePlayerState = 'unstarted';
  private error: string | null = null;
  private ready = false;
  private pendingLoad: { videoId: string; autoplay: boolean } | null = null;

  constructor(private readonly container: HTMLElement) {}

  async mount(): Promise<void> {
    await loadYouTubeIframeApi();
    if (!window.YT?.Player) throw new Error('YouTube IFrame Player API is unavailable.');

    this.player = new window.YT.Player(this.container, {
      playerVars: {
        playsinline: 1,
        enablejsapi: 1,
        rel: 0,
      },
      events: {
        onReady: () => {
          this.ready = true;
          const pending = this.pendingLoad;
          this.pendingLoad = null;
          if (pending) this.applyLoad(pending.videoId, pending.autoplay);
          this.emit();
        },
        onStateChange: event => {
          this.state = mapState(event.data);
          this.emit();
        },
        onError: event => {
          this.error = `YouTube playback error (${event.data ?? 'unknown'}).`;
          this.state = 'unstarted';
          this.emit();
        },
        onAutoplayBlocked: () => {
          this.error = 'Autoplay was blocked. Start playback with a user action.';
          this.emit();
        },
      },
    });
  }

  load(videoId: string, autoplay = false): void {
    if (!this.player || !this.ready) {
      this.pendingLoad = { videoId, autoplay };
      return;
    }
    this.applyLoad(videoId, autoplay);
  }

  play(): void { this.player?.playVideo(); }
  pause(): void { this.player?.pauseVideo(); }

  seek(seconds: number): void {
    if (!this.player || !Number.isFinite(seconds)) return;
    this.player.seekTo(Math.max(0, seconds), true);
  }

  setVolume(volume: number): void {
    if (!this.player) return;
    this.player.setVolume(Math.max(0, Math.min(100, volume)));
    this.emit();
  }

  setMuted(muted: boolean): void {
    if (!this.player) return;
    if (muted) this.player.mute();
    else this.player.unMute();
    this.emit();
  }

  getSnapshot(): YouTubePlayerSnapshot {
    return {
      state: this.state,
      currentTime: this.player?.getCurrentTime() ?? 0,
      duration: this.player?.getDuration() ?? 0,
      volume: this.player?.getVolume() ?? 100,
      muted: this.player?.isMuted() ?? false,
      error: this.error,
    };
  }

  subscribe(listener: YouTubePlayerListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  destroy(): void {
    this.pendingLoad = null;
    this.ready = false;
    this.player?.destroy();
    this.player = null;
    this.listeners.clear();
  }

  private applyLoad(videoId: string, autoplay: boolean): void {
    if (!this.player) return;
    this.error = null;
    if (autoplay) this.player.loadVideoById(videoId);
    else this.player.cueVideoById(videoId);
    this.emit();
  }

  private emit(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach(listener => listener(snapshot));
  }
}
