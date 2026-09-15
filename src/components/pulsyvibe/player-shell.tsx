'use client';

import type { RefObject } from 'react';
import { useMemo } from 'react';
import { ChevronDown, Heart, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
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

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  return `${Math.floor(value / 60)}:${Math.floor(value % 60).toString().padStart(2, '0')}`;
}

export function PlayerShell({ current, progress, player, playerOpen, setPlayerOpen, containerRef }: {
  current: Track | null;
  progress: number;
  player: PlayerApi;
  playerOpen: boolean;
  setPlayerOpen: (open: boolean) => void;
  containerRef: RefObject<HTMLDivElement | null>;
}) {
  const isPlaying = player.state.player.status === 'playing';
  const duration = current?.duration ?? 0;
  const currentSeconds = duration > 0 ? Math.round((progress / 100) * duration) : 0;
  const upNext = useMemo(() => {
    const { items, currentIndex } = player.state.queue;
    return items.slice(Math.max(0, currentIndex + 1), currentIndex + 6);
  }, [player.state.queue.items, player.state.queue.currentIndex]);

  return (
    <>
      {current && (
        <div className="pv-player-shell fixed bottom-[5.5rem] left-3 right-3 z-50 rounded-[1.5rem] border border-white/[0.09] bg-[#0e0e10] shadow-[0_18px_60px_rgba(0,0,0,.58)] md:bottom-4 md:left-1/2 md:right-auto md:w-[min(820px,calc(100%-32px))] md:-translate-x-1/2">
          <div className="px-3 pt-2">
            <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>
            <div className="flex items-center gap-3 pb-2">
              <button onClick={() => setPlayerOpen(true)} className="min-w-0 flex-1 text-left" aria-label="Open now playing">
                <div className="flex items-center gap-3"><TrackArt track={current} size="sm" /><div className="min-w-0"><p className="truncate text-xs font-semibold">{current.title}</p><p className="truncate text-[11px] text-white/45">{current.artist}</p></div></div>
              </button>
              <button onClick={() => void player.previous()} aria-label="Previous" className="rounded-full p-2 text-white/75 hover:bg-white/[0.06]"><SkipBack size={18} /></button>
              <button onClick={() => isPlaying ? player.pause() : void player.play()} aria-label="Play or pause" className="rounded-full bg-white p-3 text-black shadow-[0_8px_24px_rgba(0,0,0,.28)]">{isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button>
              <button onClick={() => void player.next()} aria-label="Next" className="rounded-full p-2 text-white/75 hover:bg-white/[0.06]"><SkipForward size={18} /></button>
            </div>
          </div>
        </div>
      )}

      <div ref={containerRef} className="fixed -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0 pointer-events-none" aria-hidden="true" />

      {playerOpen && current && (
        <div className="pv-player-overlay fixed inset-0 z-[70] bg-[#070708]" onClick={() => setPlayerOpen(false)}>
          <div className="flex min-h-[100dvh] w-full flex-col overflow-hidden text-white" onClick={event => event.stopPropagation()}>
            <div className="relative flex-1 overflow-y-auto px-5 pb-10 pt-3 sm:px-8">
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {current.thumbnail && <img src={current.thumbnail} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-[0.09] blur-3xl" />}
                <div className="absolute inset-0 bg-gradient-to-b from-[#070708]/80 via-[#070708]/95 to-[#070708]" />
              </div>

              <div className="relative mx-auto flex min-h-full w-full max-w-6xl flex-col">
                <header className="flex items-center justify-between py-2"><button onClick={() => setPlayerOpen(false)} aria-label="Close player" className="rounded-full bg-white/[0.07] p-3 hover:bg-white/[0.11]"><ChevronDown size={21} /></button><div className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">Now Playing</div><button aria-label="Player options" className="rounded-full bg-white/[0.07] px-3 py-2 text-sm font-bold text-white/65">•••</button></header>

                <div className="grid flex-1 gap-8 py-6 md:grid-cols-[minmax(0,1fr)_360px] md:items-center md:gap-12">
                  <section className="mx-auto w-full max-w-xl">
                    <div className="mx-auto w-fit"><TrackArt track={current} size="hero" /></div>
                    <div className="mt-7"><div className="flex items-start gap-4"><div className="min-w-0 flex-1"><h1 className="line-clamp-2 text-[2rem] font-black leading-[1.05] tracking-tight sm:text-4xl">{current.title}</h1><p className="mt-2 text-base text-white/50">{current.artist}</p></div><button aria-label="Favorite current track" className="rounded-full bg-white/[0.07] p-3 text-white/65 hover:bg-white/[0.11]"><Heart size={21} /></button></div>

                      <div className="mt-7"><div className="h-1.5 overflow-hidden rounded-full bg-white/[0.09]"><div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} /></div><div className="mt-2 flex justify-between text-[10px] font-medium text-white/35"><span>{formatTime(currentSeconds)}</span><span>{formatTime(duration)}</span></div></div>

                      <div className="mt-6 flex items-center justify-center gap-8 sm:gap-12"><button onClick={() => void player.previous()} aria-label="Previous" className="rounded-full bg-white/[0.08] p-4 hover:bg-white/[0.13]"><SkipBack size={23} /></button><button onClick={() => isPlaying ? player.pause() : void player.play()} aria-label="Play or pause" className="rounded-full bg-white p-5 text-black shadow-[0_12px_38px_rgba(0,0,0,.32)]">{isPlaying ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" />}</button><button onClick={() => void player.next()} aria-label="Next" className="rounded-full bg-white/[0.08] p-4 hover:bg-white/[0.13]"><SkipForward size={23} /></button></div>
                    </div>
                  </section>

                  <section className="w-full rounded-[1.5rem] border border-white/[0.08] bg-[#0e0e10] p-4 shadow-[0_18px_60px_rgba(0,0,0,.26)] md:max-h-[min(70dvh,560px)] md:overflow-y-auto">
                    <div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Up Next</p><p className="mt-1 text-sm text-white/40">{upNext.length ? `${upNext.length} queued` : 'Nothing queued'}</p></div><span className="rounded-full bg-white/[0.06] px-3 py-1 text-[10px] text-white/45">Queue</span></div>
                    {upNext.length ? <div className="space-y-1">{upNext.map((track, index) => { const queueIndex = player.state.queue.currentIndex + 1 + index; return <button key={`${track.id}-${queueIndex}`} onClick={() => player.playAt(queueIndex)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left hover:bg-white/[0.05]"><span className="w-5 text-center text-[10px] text-white/25">{index + 1}</span><TrackArt track={track} size="sm" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{track.title}</span><span className="block truncate text-xs text-white/40">{track.artist}</span></span><SkipForward size={15} className="text-white/20" /></button>; })}</div> : <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center"><p className="text-sm font-medium text-white/55">Your queue is empty</p><p className="mt-1 text-xs text-white/30">Add tracks from Discovery to build your next session.</p></div>}
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
