'use client';

import { useEffect, useRef, useState } from 'react';
import type { Track } from '@/types/track';
import type { PlaybackState } from '@/types/playback';
import { YouTubePlaybackController } from '@/services/playback/youtube-controller';

const EMPTY_STATE: PlaybackState = {
  queue: {
    items: [],
    currentIndex: -1,
    shuffle: false,
    repeat: 'off',
  },
  player: {
    status: 'idle',
    currentTrack: null,
    currentTime: 0,
    duration: 0,
    volume: 1,
    muted: false,
    error: null,
  },
};

export function useYouTubePlayer(initialTracks: Track[] = []) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<YouTubePlaybackController | null>(null);
  const [controller, setController] = useState<YouTubePlaybackController | null>(null);
  const [state, setState] = useState<PlaybackState>(EMPTY_STATE);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const nextController = new YouTubePlaybackController(container, initialTracks);
    controllerRef.current = nextController;
    setController(nextController);

    const unsubscribe = nextController.subscribe(setState);

    void nextController.mount().catch(error => {
      const message = error instanceof Error ? error.message : 'Unable to initialize YouTube playback.';
      setState(current => ({
        ...current,
        player: {
          ...current.player,
          status: 'error',
          error: message,
        },
      }));
    });

    return () => {
      unsubscribe();
      nextController.destroy();
      controllerRef.current = null;
      setController(null);
    };
  }, [initialTracks]);

  return {
    containerRef,
    state,
    controller,
    play: () => void controllerRef.current?.play(),
    pause: () => controllerRef.current?.pause(),
    next: () => void controllerRef.current?.next(),
    previous: () => void controllerRef.current?.previous(),
    playAt: (index: number) => void controllerRef.current?.playAt(index),
    enqueue: (tracks: Track[]) => controllerRef.current?.enqueue(tracks),
    removeAt: (index: number) => controllerRef.current?.removeAt(index),
    seek: (seconds: number) => controllerRef.current?.seek(seconds),
    setVolume: (volume: number) => controllerRef.current?.setVolume(volume),
    setMuted: (muted: boolean) => controllerRef.current?.setMuted(muted),
    setShuffle: (shuffle: boolean) => controllerRef.current?.setShuffle(shuffle),
    setRepeat: (repeat: PlaybackState['queue']['repeat']) => controllerRef.current?.setRepeat(repeat),
  };
}
