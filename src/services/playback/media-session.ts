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
];

export function configureMediaSession(controls: MediaSessionControls): () => void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return () => {};

  const session = navigator.mediaSession;
  const handlers: Partial<Record<MediaSessionAction, () => void | Promise<void>>> = {
    play: controls.play,
    pause: controls.pause,
    nexttrack: controls.next,
    previoustrack: controls.previous,
    seekbackward: () => controls.seek(-10),
    seekforward: () => controls.seek(10),
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
  state: { duration: number; currentTime: number },
): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

  if (track) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.channel ?? 'PulsyVibe',
      artwork: track.thumbnail ? [{ src: track.thumbnail }] : [],
    });
  } else {
    navigator.mediaSession.metadata = null;
  }

  if (Number.isFinite(state.duration) && state.duration > 0) {
    const position = Math.max(0, Math.min(state.currentTime, state.duration));
    try {
      navigator.mediaSession.setPositionState({
        duration: state.duration,
        playbackRate: 1,
        position,
      });
    } catch {
      // Ignore invalid lifecycle states.
    }
  }
}
