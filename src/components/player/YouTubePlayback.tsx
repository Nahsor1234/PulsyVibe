'use client';

import { useEffect, useRef, useState } from 'react';
import type { Track } from '@/types/track';
import { YouTubePlayerAdapter, type YouTubePlayerSnapshot } from '@/services/playback/youtube-player';

type YouTubePlaybackProps = {
  track: Track | null;
  autoplay?: boolean;
  onEnded?: () => void;
  onStateChange?: (snapshot: YouTubePlayerSnapshot & { error: string | null }) => void;
};

/**
 * V2 playback surface backed by the official YouTube IFrame Player API.
 * Keep this player mounted in a visible >=200x200 viewport when rendered,
 * as required by YouTube's embedded-player requirements.
 */
export function YouTubePlayback({
  track,
  autoplay = false,
  onEnded,
  onStateChange,
}: YouTubePlaybackProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<YouTubePlayerAdapter | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const adapter = new YouTubePlayerAdapter(container);
    adapterRef.current = adapter;

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    void adapter.mount().then(() => {
      if (cancelled) return;
      unsubscribe = adapter.subscribe(snapshot => {
        setError(snapshot.error);
        onStateChange?.(snapshot);
        if (snapshot.state === 'ended') onEnded?.();
      });

      if (track?.status === 'verified') {
        adapter.load(track.videoId, autoplay);
      }
    }).catch(reason => {
      if (cancelled) return;
      const message = reason instanceof Error ? reason.message : 'Unable to initialize YouTube playback.';
      setError(message);
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
      adapter.destroy();
      adapterRef.current = null;
    };
  }, []);

  useEffect(() => {
    const adapter = adapterRef.current;
    if (!adapter || !track || track.status !== 'verified') return;
    adapter.load(track.videoId, autoplay);
  }, [track?.id, track?.videoId, track?.status, autoplay]);

  if (error) {
    return (
      <div className="flex min-h-[200px] min-w-[200px] items-center justify-center rounded-2xl bg-black/80 p-6 text-center text-sm text-white/70">
        {error}
      </div>
    );
  }

  return <div ref={containerRef} className="aspect-video min-h-[200px] min-w-[200px] w-full overflow-hidden rounded-2xl bg-black" />;
}
