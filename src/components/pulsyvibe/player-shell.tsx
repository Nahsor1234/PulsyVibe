'use client';

import type { RefObject } from 'react';
import { ChevronUp, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import type { Track } from '@/types/track';
import { TrackArt } from './track-art';

type PlayerApi = {
  state: {
    player: { status: string; currentTrack: Track | null };
  };
  play: () => Promise<void> | void;
  pause: () => void;
  previous: () => Promise<void> | void;
  next: () => Promise<void> | void;
};

export function PlayerShell({ current, progress, player, playerOpen, setPlayerOpen, containerRef }: {
  current: Track | null;
  progress: number;
  player: PlayerApi;
  playerOpen: boolean;
  setPlayerOpen: (open: boolean) => void;
  containerRef: RefObject<HTMLDivElement | null>;
}) {
  const isPlaying = player.state.player.status === 'playing';

  return (
    <>
      {current && <div className="pv-player-shell fixed bottom-[4.75rem] left-2 right-2 z-50 rounded-3xl border border-white/[0.08] bg-[#101010]/96 shadow-2xl backdrop-blur-2xl md:bottom-4 md:left-1/2 md:right-auto md:w-[min(760px,calc(100%-32px))] md:-translate-x-1/2">
        <div className="px-3 pt-2">
          <div className="mb-2 h-0.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>
          <div className="flex items-center gap-3 pb-2">
            <button onClick={() => setPlayerOpen(true)} className="min-w-0 flex-1 text-left" aria-label="Open now playing">
              <div className="flex items-center gap-3">
                <span className={isPlaying ? 'pv-player-art-playing' : ''}><TrackArt track={current} size="sm" /></span>
                <div className="min-w-0"><p className="truncate text-xs font-semibold">{current.title}</p><p className="truncate text-[11px] text-muted-foreground">{current.artist}</p></div>
              </div>
            </button>
            <button onClick={() => void player.previous()} aria-label="Previous"><SkipBack size={18} /></button>
            <button onClick={() => isPlaying ? player.pause() : void player.play()} aria-label="Play or pause" className="rounded-full bg-foreground p-2 text-background">{isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button>
            <button onClick={() => void player.next()} aria-label="Next"><SkipForward size={18} /></button>
            <button onClick={() => setPlayerOpen(true)} aria-label="Open player"><ChevronUp size={18} /></button>
          </div>
        </div>
      </div>}

      <div ref={containerRef} className={playerOpen ? 'fixed left-1/2 top-1/2 z-[76] h-[min(58vw,460px)] w-[min(92vw,760px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl' : 'fixed -left-[9999px] top-0 h-1 w-1 overflow-hidden'} />

      {playerOpen && current && <div className="pv-player-overlay fixed inset-0 z-[70] bg-black/80 p-4 backdrop-blur-xl" onClick={() => setPlayerOpen(false)}>
        <div className="pointer-events-auto mx-auto flex min-h-full w-full max-w-5xl items-end justify-center pb-6 sm:items-center" onClick={event => event.stopPropagation()}>
          <div className="pv-player-hero grid w-full max-w-xl gap-5 rounded-[2rem] border border-white/10 bg-[#151515]/95 p-5 shadow-2xl sm:grid-cols-[auto_1fr] sm:items-center">
            <TrackArt track={current} size="hero" />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Now playing</p>
              <h2 className="mt-2 line-clamp-2 text-2xl font-black tracking-tight">{current.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{current.artist}</p>
              <div className="mt-5 flex items-center gap-2">
                <button onClick={() => void player.previous()} className="rounded-full bg-white/[0.06] p-3" aria-label="Previous"><SkipBack size={18} /></button>
                <button onClick={() => isPlaying ? player.pause() : void player.play()} className="rounded-full bg-foreground p-3 text-background" aria-label="Play or pause">{isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}</button>
                <button onClick={() => void player.next()} className="rounded-full bg-white/[0.06] p-3" aria-label="Next"><SkipForward size={18} /></button>
                <button onClick={() => setPlayerOpen(false)} className="ml-auto rounded-full bg-white/[0.06] p-3" aria-label="Close player"><X size={18} /></button>
              </div>
            </div>
          </div>
        </div>
      </div>}
    </>
  );
}
