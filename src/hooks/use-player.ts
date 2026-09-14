import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { Track } from '@/types/track';
import type { PlaybackSource, PlaybackState } from '@/types/playback';
import { PlaybackController } from '@/services/playback/controller';

export interface UsePlayerOptions {
  source: PlaybackSource;
  initialTracks?: Track[];
}

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

export function usePlayer({ source, initialTracks = [] }: UsePlayerOptions) {
  const controller = useMemo(
    () => new PlaybackController(source, initialTracks),
    [source],
  );

  const state = useSyncExternalStore(
    controller.subscribe.bind(controller),
    controller.getState.bind(controller),
    () => EMPTY_STATE,
  );

  useEffect(() => () => controller.destroy(), [controller]);

  return {
    state,
    controller,
    queue: state.queue,
    player: state.player,
    play: controller.play.bind(controller),
    pause: controller.pause.bind(controller),
    next: controller.next.bind(controller),
    previous: controller.previous.bind(controller),
    playAt: controller.playAt.bind(controller),
    enqueue: controller.enqueue.bind(controller),
    removeAt: controller.removeAt.bind(controller),
    seek: controller.seek.bind(controller),
    setVolume: controller.setVolume.bind(controller),
    setMuted: controller.setMuted.bind(controller),
    setShuffle: controller.setShuffle.bind(controller),
    setRepeat: controller.setRepeat.bind(controller),
  };
}
