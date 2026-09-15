'use client';

import type { CSSProperties, RefObject } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Heart, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import type { Track } from '@/types/track';
import { TrackArt } from './track-art';

type PlayerApi = {
  state: {
    player: { status: string; currentTrack: Track | null };
    queue: { items: Track[]; currentIndex: number };
  };
  play: () => Promise<void> | void;
  pause: () => void;
  previous: () => Promise<void> | void;
  next: () => Promise<void> | void;
  playAt: (index: number) => void;
};

function useArtworkPalette(track: Track | null, enabled: boolean) {
  const [rgb, setRgb] = useState('78, 78, 96');

  useEffect(() => {
    let cancelled = false;
    if (!enabled || !track?.thumbnail) {
      setRgb('78, 78, 96');
      return undefined;
    }

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 28;
        canvas.height = 28;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return;
        context.drawImage(image, 0, 0, 28, 28);
        const data = context.getImageData(0, 0, 28, 28).data;
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        for (let index = 0; index < data.length; index += 4) {
          const alpha = data[index + 3];
          if (alpha < 170) continue;
          const rr = data[index];
          const gg = data[index + 1];
          const bb = data[index + 2];
          const brightness = (rr + gg + bb) / 3;
          if (brightness < 16 || brightness > 248) continue;
          r += rr;
          g += gg;
          b += bb;
          count += 1;
        }
        if (count > 0 && !cancelled) setRgb(`${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)}`);
      } catch {
        // Some remote thumbnails disallow canvas sampling; keep the neutral palette.
      }
    };
    image.src = track.thumbnail;

    return () => {
      cancelled = true;
      image.onload = null;
    };
  }, [enabled, track?.thumbnail]);

  return rgb;
}

export function PlayerShell({ current, progress, player, playerOpen, setPlayerOpen, containerRef, adaptivePalette }: {
  current: Track | null;
  progress: number;
  player: PlayerApi;
  playerOpen: boolean;
  setPlayerOpen: (open: boolean) => void;
  containerRef: RefObject<HTMLDivElement | null>;
  adaptivePalette: boolean;
}) {
  const isPlaying = player.state.player.status === 'playing';
  const artworkRgb = useArtworkPalette(current, adaptivePalette);
  const paletteStyle = { '--pv-art-rgb': artworkRgb } as CSSProperties;
  const upNext = useMemo(() => {
    const { items, currentIndex } = player.state.queue;
    return items.slice(Math.max(0, currentIndex + 1), currentIndex + 7);
  }, [player.state.queue.items, player.state.queue.currentIndex]);

  return (
    <>
      {current && <div className="pv-player-shell fixed bottom-[5.25rem] left-3 right-3 z-50 rounded-[1.75rem] border border-white/[0.08] bg-[#101010]/96 shadow-2xl backdrop-blur-2xl md:bottom-4 md:left-1/2 md:right-auto md:w-[min(760px,calc(100%-32px))] md:-translate-x-1/2" style={paletteStyle}>
        <div className="px-3 pt-2">
          <div className="mb-2 h-0.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>
          <div className="flex items-center gap-3 pb-2">
            <button onClick={() => setPlayerOpen(true)} className="min-w-0 flex-1 text-left" aria-label="Open now playing"><div className="flex items-center gap-3"><span className={isPlaying ? 'pv-player-art-playing' : ''}><TrackArt track={current} size="sm" /></span><div className="min-w-0"><p className="truncate text-xs font-semibold">{current.title}</p><p className="truncate text-[11px] text-muted-foreground">{current.artist}</p></div></div></button>
            <button onClick={() => void player.previous()} aria-label="Previous"><SkipBack size={18} /></button>
            <button onClick={() => isPlaying ? player.pause() : void player.play()} aria-label="Play or pause" className="rounded-full bg-foreground p-2 text-background">{isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button>
            <button onClick={() => void player.next()} aria-label="Next"><SkipForward size={18} /></button>
          </div>
        </div>
      </div>}

      <div ref={containerRef} className={playerOpen ? 'fixed left-1/2 top-1/2 z-[76] h-[min(58vw,460px)] w-[min(92vw,760px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl' : 'fixed -left-[9999px] top-0 h-1 w-1 overflow-hidden'} />

      {playerOpen && current && <div className="pv-player-overlay fixed inset-0 z-[70] bg-[#070707] px-4 pb-28 pt-4" style={{ ...paletteStyle, background: `radial-gradient(circle at 50% 19%, rgb(${artworkRgb} / .34), transparent 42%), radial-gradient(circle at 50% 68%, rgb(${artworkRgb} / .12), transparent 50%), #070707` }} onClick={() => setPlayerOpen(false)}>
        <div className="pointer-events-auto mx-auto flex min-h-full w-full max-w-5xl flex-col" onClick={event => event.stopPropagation()}>
          <header className="flex items-center justify-between px-1 py-2"><button onClick={() => setPlayerOpen(false)} aria-label="Close player" className="rounded-full bg-white/[0.07] p-3"><ChevronDown size={20} /></button><span className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/50">Now playing</span><button aria-label="Player options" className="rounded-full bg-white/[0.07] px-3 py-2 text-xs font-semibold text-white/65">•••</button></header>

          <div className="flex flex-1 flex-col items-center overflow-y-auto py-5 sm:justify-center">
            <div className="pv-hero-art" style={{ boxShadow: `0 30px 90px rgb(${artworkRgb} / .28)` }}><TrackArt track={current} size="hero" /></div>

            <div className="mt-7 w-full max-w-2xl text-left sm:mt-9">
              <div className="flex items-start gap-4"><div className="min-w-0 flex-1"><h2 className="line-clamp-2 text-3xl font-black tracking-tight sm:text-4xl">{current.title}</h2><p className="mt-1 text-base text-white/55">{current.artist}</p></div><button aria-label="Favorite current track" className="rounded-full bg-white/[0.07] p-3 text-white/65"><Heart size={21} /></button></div>
              <div className="mt-7"><div className="h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} /></div><div className="mt-2 flex justify-between text-[10px] font-medium text-white/40"><span>{progress > 0 ? `${Math.round(progress)}% played` : 'Starting'}</span><span>{isPlaying ? 'Playing' : 'Paused'}</span></div></div>
              <div className="mt-5 flex items-center justify-center gap-8 sm:gap-12"><button onClick={() => void player.previous()} className="rounded-full bg-white/[0.07] p-4" aria-label="Previous"><SkipBack size={22} /></button><button onClick={() => isPlaying ? player.pause() : void player.play()} className="rounded-full bg-white p-5 text-black shadow-xl" aria-label="Play or pause">{isPlaying ? <Pause size={25} fill="currentColor" /> : <Play size={25} fill="currentColor" />}</button><button onClick={() => void player.next()} className="rounded-full bg-white/[0.07] p-4" aria-label="Next"><SkipForward size={22} /></button></div>
            </div>

            <section className="mt-8 w-full max-w-2xl rounded-[1.75rem] border border-white/[0.08] bg-black/20 p-4 backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Up next</p><p className="mt-1 text-xs text-white/45">{upNext.length ? `${upNext.length} queued` : 'Queue is empty'}</p></div><span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[10px] text-white/45">Queue</span></div>
              {upNext.length ? <div className="space-y-1">{upNext.slice(0, 5).map((track, index) => { const queueIndex = player.state.queue.currentIndex + 1 + index; return <button key={`${track.id}-${queueIndex}`} onClick={() => player.playAt(queueIndex)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left hover:bg-white/[0.05]"><span className="w-5 text-center text-[10px] text-white/30">{index + 1}</span><TrackArt track={track} size="sm" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{track.title}</span><span className="block truncate text-[11px] text-white/40">{track.artist}</span></span><SkipForward size={14} className="text-white/25" /></button>; })}</div> : <p className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-center text-xs text-white/35">Play more tracks or run another discovery to build Up Next.</p>}
            </section>
          </div>
        </div>
      </div>}
    </>
  );
}
