import type { Track } from '@/types/track';

export type MediaSessionControls = {
  play: () => void | Promise<void>;
  pause: () => void;
  next: () => void | Promise<void>;
  previous: () => void | Promise<void>;
  seek: (seconds: number) => void;
};

export function configureMediaSession(controls: MediaSessionControls): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  const session = navigator.mediaSession;
  const register = (action: MediaSessionAction, handler: () => void | Promise<void>) => {
    try { session.setActionHandler(action, handler); } catch { /* Unsupported action on this browser. */ }
  };
  register('play', controls.play);
  register('pause', controls.pause);
  register('nexttrack', controls.next);
  register('previoustrack', controls.previous);
  register('seekbackward', () => controls.seek(-10));
  register('seekforward', () => controls.seek(10));
}

export function updateMediaSession(track: Track | null, state: { duration: number; currentTime: number }): void {
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
    try { navigator.mediaSession.setPositionState({ duration: state.duration, playbackRate: 1, position: Math.min(state.currentTime, state.duration) }); } catch { /* Ignore invalid lifecycle states. */ }
  }
}
