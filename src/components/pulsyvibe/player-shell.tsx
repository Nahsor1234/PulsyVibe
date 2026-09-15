'use client';

import type { CSSProperties, RefObject } from 'react';
import { useMemo, useState } from 'react';
import { ChevronDown, Download, Heart, ListMusic, MoreVertical, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward } from 'lucide-react';
import type { Track } from '@/types/track';
import { BottomSheet } from './bottom-sheet';
import { TrackArt } from './track-art';

type PlayerApi = {
  state: {
    player: { status: string; currentTrack: Track | null; currentTime: number; duration: number };
    queue: { items: Track[]; currentIndex: number; shuffle: boolean; repeat: 'off' | 'all' | 'one' };
  };
  play: () => Promise<void> | void;
  pause: () => void;
  previous: () => Promise<void> | void;
  next: () => Promise<void> | void;
  playAt: (index: number) => void;
  seek: (seconds: number) => void;
  setShuffle: (shuffle: boolean) => void;
  setRepeat: (repeat: 'off' | 'all' | 'one') => void;
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
  const duration = player.state.player.duration || current?.duration || 0;
  const currentTime = Math.min(Math.max(player.state.player.currentTime, 0), duration || Number.MAX_SAFE_INTEGER);
  const [queueOpen, setQueueOpen] = useState(false);
  const upNext = useMemo(() => {
    const { items, currentIndex } = player.state.queue;
    return items.slice(Math.max(0, currentIndex + 1), currentIndex + 11);
  }, [player.state.queue.items, player.state.queue.currentIndex]);
  const sliderStyle = { '--pv-slider-progress': `${duration > 0 ? (currentTime / duration) * 100 : 0}%` } as CSSProperties;

  return (
    <>
      {current && (
        <div className="pv-player-shell fixed bottom-[5.5rem] left-3 right-3 z-50 rounded-[1.35rem] border border-white/[0.1] bg-[#0d0d0f] shadow-[0_18px_60px_rgba(0,0,0,.7)] md:bottom-4 md:left-1/2 md:right-auto md:w-[min(820px,calc(100%-32px))] md:-translate-x-1/2">
          <div className="px-3 pt-2">
            <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>
            <div className="flex items-center gap-3 pb-2">
              <button onClick={() => setPlayerOpen(true)} className="min-w-0 flex-1 text-left" aria-label="Open now playing">
                <div className="flex items-center gap-3"><TrackArt track={current} size="sm" /><div className="min-w-0"><p className="truncate text-xs font-semibold">{current.title}</p><p className="truncate text-[11px] text-white/45">{current.artist}</p></div></div>
              </button>
              <button onClick={() => void player.previous()} aria-label="Previous" className="rounded-full p-2 text-white/75 hover:bg-white/[0.06]"><SkipBack size={18} /></button>
              <button onClick={() => isPlaying ? player.pause() : void player.play()} aria-label="Play or pause" className="rounded-full bg-white p-3 text-black shadow-[0_8px_24px_rgba(0,0,0,.28)]">{isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button>
              <button onClick={() => void player.next()} aria-label="Next" className="rounded-full p-2 text-white/75 hover:bg-white/[0.06]"><SkipForward size={18} /></button>
              <button onClick={() => setQueueOpen(true)} aria-label="Open queue" className="rounded-full p-2 text-white/60 hover:bg-white/[0.06]"><ListMusic size={18} /></button>
            </div>
          </div>
        </div>
      )}

      <div ref={containerRef} className="fixed -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0 pointer-events-none" aria-hidden="true" />

      {playerOpen && current && (
        <div className="pv-player-overlay fixed inset-0 z-[70] bg-[#080809] text-white" onClick={() => setPlayerOpen(false)}>
          <div className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden" onClick={event => event.stopPropagation()}>
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {current.thumbnail && <img src={current.thumbnail} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-[0.12] blur-3xl" />}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,9,.58)_0%,rgba(8,8,9,.78)_45%,#080809_78%,#080809_100%)]" />
            </div>

            <header className="relative z-10 flex items-center justify-between px-5 pb-2 pt-[max(.75rem,env(safe-area-inset-top))] sm:px-8">
              <button onClick={() => setPlayerOpen(false)} aria-label="Close player" className="rounded-full bg-white/[0.06] p-3 hover:bg-white/[0.1]"><ChevronDown size={21} /></button>
              <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">Now Playing</span>
              <button aria-label="More player options" className="rounded-full bg-white/[0.06] p-3 text-white/55 hover:bg-white/[0.1]"><MoreVertical size={19} /></button>
            </header>

            <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-8">
              <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center">
                <div className="w-[min(78vw,390px)] sm:w-[min(52vw,430px)]"><TrackArt track={current} size="hero" /></div>

                <div className="mt-7 w-full">
                  <div className="flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <h1 className="line-clamp-2 text-[2rem] font-black leading-[1.04] tracking-tight sm:text-4xl">{current.title}</h1>
                      <p className="mt-2 text-base text-white/50">{current.artist}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button aria-label="Download" className="rounded-2xl bg-white/[0.08] p-3 text-white/75 hover:bg-white/[0.12]"><Download size={20} /></button>
                      <button aria-label="Favorite current track" className="rounded-2xl bg-white/[0.08] p-3 text-white/75 hover:bg-white/[0.12]"><Heart size={21} /></button>
                    </div>
                  </div>

                  <div className="mt-7">
                    <input
                      aria-label="Playback position"
                      type="range"
                      min={0}
                      max={Math.max(duration, 0.1)}
                      step={0.1}
                      value={Math.min(currentTime, duration || 0)}
                      onChange={event => player.seek(Number(event.target.value))}
                      className="pv-player-slider w-full"
                      style={sliderStyle}
                    />
                    <div className="mt-2 flex justify-between text-xs font-medium text-white/45"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
                  </div>

                  <div className="mt-7 flex items-center justify-center gap-7 sm:gap-12">
                    <button onClick={() => void player.previous()} aria-label="Previous" className="rounded-full bg-white/[0.08] p-4 text-white hover:bg-white/[0.13]"><SkipBack size={24} /></button>
                    <button onClick={() => isPlaying ? player.pause() : void player.play()} aria-label="Play or pause" className="rounded-full bg-white p-5 text-black shadow-[0_14px_40px_rgba(0,0,0,.32)]"><span className="block">{isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}</span></button>
                    <button onClick={() => void player.next()} aria-label="Next" className="rounded-full bg-white/[0.08] p-4 text-white hover:bg-white/[0.13]"><SkipForward size={24} /></button>
                  </div>

                  <div className="mt-8 grid grid-cols-5 gap-2">
                    <button onClick={() => setQueueOpen(true)} aria-label="Open queue" className="pv-player-tool"><ListMusic size={20} /><span>Queue</span></button>
                    <button aria-label="Sleep timer" className="pv-player-tool"><span className="text-lg">◔</span><span>Sleep</span></button>
                    <button onClick={() => setQueueOpen(true)} aria-label="View queue" className="pv-player-tool"><ListMusic size={20} /><span>Up next</span></button>
                    <button onClick={() => player.setShuffle(!player.state.queue.shuffle)} aria-label="Toggle shuffle" className={`pv-player-tool ${player.state.queue.shuffle ? 'is-on' : ''}`}><Shuffle size={19} /><span>Shuffle</span></button>
                    <button onClick={() => player.setRepeat(player.state.queue.repeat === 'off' ? 'all' : player.state.queue.repeat === 'all' ? 'one' : 'off')} aria-label="Toggle repeat" className={`pv-player-tool ${player.state.queue.repeat !== 'off' ? 'is-on' : ''}`}><Repeat size={19} /><span>Repeat</span></button>
                  </div>
                </div>
              </div>
            </div>

            <BottomSheet open={queueOpen} title="Up Next" onClose={() => setQueueOpen(false)}>
              <div className="mb-3 flex items-center justify-between text-xs text-white/45"><span>{upNext.length} queued</span><span className="max-w-[48%] truncate">Now Playing: {current.title}</span></div>
              {upNext.length ? <div className="max-h-[58dvh] space-y-1 overflow-y-auto">{upNext.map((track, index) => { const queueIndex = player.state.queue.currentIndex + 1 + index; return <button key={`${track.id}-${queueIndex}`} onClick={() => { player.playAt(queueIndex); setQueueOpen(false); }} className="flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left active:bg-white/[0.06]"><span className="w-5 text-center text-[10px] text-white/25">{index + 1}</span><TrackArt track={track} size="sm" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{track.title}</span><span className="block truncate text-xs text-white/40">{track.artist} · {track.duration ? formatTime(track.duration) : ''}</span></span><MoreVertical size={16} className="text-white/25" /></button>; })}</div> : <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center"><p className="text-sm font-medium text-white/55">Queue is empty</p><p className="mt-1 text-xs text-white/30">Add songs from Discovery to continue playing.</p></div>}
            </BottomSheet>
          </div>
        </div>
      )}
    </>
  );
}
