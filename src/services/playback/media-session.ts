import type { Track } from '@/types/track';

export type MediaSessionControls = {
  play: () => void | Promise<void>;
  pause: () => void;
  next: () => void | Promise<void>;
  previous: () => void | Promise<void>;
  seek: (seconds: number) => void;
};

const SUPPORTED_ACTIONS: MediaSessionAction[] = [
  'play',
  'pause',
  'nexttrack',
  'previoustrack',
  'seekbackward',
  'seekforward',
  'seekto',
];

export function configureMediaSession(controls: MediaSessionControls): () => void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return () => {};

  const session = navigator.mediaSession;
  const handlers: Partial<Record<MediaSessionAction, (details?: MediaSessionActionDetails) => void | Promise<void>>> = {
    play: controls.play,
    pause: controls.pause,
    nexttrack: controls.next,
    previoustrack: controls.previous,
    seekbackward: () => controls.seek(-10),
    seekforward: () => controls.seek(10),
    seekto: details => {
      if (!details || !Number.isFinite(details.seekTime)) return;
      controls.seek(Math.max(0, details.seekTime));
    },
  };

  for (const action of SUPPORTED_ACTIONS) {
    try {
      session.setActionHandler(action, handlers[action] ?? null);
    } catch {
      // Some browsers expose Media Session but do not support every action.
    }
  }

  return () => {
    for (const action of SUPPORTED_ACTIONS) {
      try {
        session.setActionHandler(action, null);
      } catch {
        // Ignore unsupported actions during cleanup.
      }
    }
  };
}

export function updateMediaSession(
  track: Track | null,
  state: { status?: string; duration: number; currentTime: number; playbackRate?: number },
): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

  const session = navigator.mediaSession;
  session.playbackState = state.status === 'playing' ? 'playing' : state.status === 'paused' ? 'paused' : 'none';

  if (track) {
    session.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.channel ?? 'PulsyVibe',
      artwork: track.thumbnail
        ? [
            { src: track.thumbnail, sizes: '96x96', type: 'image/jpeg' },
            { src: track.thumbnail, sizes: '192x192', type: 'image/jpeg' },
            { src: track.thumbnail, sizes: '512x512', type: 'image/jpeg' },
          ]
        : [],
    });
  } else {
    session.metadata = null;
  }

  if (Number.isFinite(state.duration) && state.duration > 0) {
    const position = Math.max(0, Math.min(state.currentTime, state.duration));
    try {
      session.setPositionState({
        duration: state.duration,
        playbackRate: state.playbackRate && state.playbackRate > 0 ? state.playbackRate : 1,
        position,
      });
    } catch {
      // Ignore invalid lifecycle states.
    }
  }
}
