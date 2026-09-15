'use client';

import { useState } from 'react';
import { Heart, MoreHorizontal, Pause, Play, Plus, Sparkles } from 'lucide-react';
import type { Track } from '@/types/track';
import { BottomSheet } from './bottom-sheet';
import { TrackArt } from './track-art';

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function TrackRow({ track, onPlay, onQueue, onFavorite, onSeed, active, favorite }: {
  track: Track;
  onPlay: () => void;
  onQueue: () => void;
  onFavorite?: () => void;
  onSeed?: () => void;
  active: boolean;
  favorite?: boolean;
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <div className={`group flex items-center gap-3 rounded-2xl p-2.5 transition sm:p-3 ${active ? 'bg-primary/10' : 'hover:bg-white/[0.04]'}`}>
        <button aria-label={`Play ${track.title}`} onClick={onPlay} className="relative shrink-0">
          <TrackArt track={track} />
          <span className="absolute inset-0 hidden items-center justify-center rounded-xl bg-black/60 group-hover:flex">
            {active ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
          </span>
        </button>
        <button onClick={onPlay} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold">{track.title}</p>
          <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
        </button>
        <span className="hidden text-[11px] text-muted-foreground sm:block">{track.duration ? formatTime(track.duration) : ''}</span>
        {onFavorite && <button aria-label={`${favorite ? 'Remove' : 'Add'} ${track.title} ${favorite ? 'from' : 'to'} favorites`} onClick={onFavorite} className={`rounded-full p-2 ${favorite ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}><Heart size={17} fill={favorite ? 'currentColor' : 'none'} /></button>}
        <button aria-label={`Add ${track.title} to queue`} onClick={onQueue} className="rounded-full p-2 text-muted-foreground hover:bg-white/10 hover:text-foreground"><Plus size={18} /></button>
        <button aria-label={`More actions for ${track.title}`} onClick={() => setMoreOpen(true)} className="rounded-full p-2 text-muted-foreground hover:bg-white/10 hover:text-foreground"><MoreHorizontal size={18} /></button>
      </div>

      <BottomSheet open={moreOpen} title={track.title} onClose={() => setMoreOpen(false)}>
        <div className="grid gap-1">
          <button onClick={() => { onPlay(); setMoreOpen(false); }} className="flex min-h-12 items-center gap-3 rounded-2xl px-3 text-left text-sm hover:bg-white/[0.06]"><Play size={18} /> Play now</button>
          <button onClick={() => { onQueue(); setMoreOpen(false); }} className="flex min-h-12 items-center gap-3 rounded-2xl px-3 text-left text-sm hover:bg-white/[0.06]"><Plus size={18} /> Add to queue</button>
          {onFavorite && <button onClick={() => { onFavorite(); setMoreOpen(false); }} className="flex min-h-12 items-center gap-3 rounded-2xl px-3 text-left text-sm hover:bg-white/[0.06]"><Heart size={18} fill={favorite ? 'currentColor' : 'none'} /> {favorite ? 'Remove from favorites' : 'Add to favorites'}</button>}
          {onSeed && <button onClick={() => { onSeed(); setMoreOpen(false); }} className="flex min-h-12 items-center gap-3 rounded-2xl px-3 text-left text-sm hover:bg-white/[0.06]"><Sparkles size={18} /> Use as discovery seed</button>}
        </div>
      </BottomSheet>
    </>
  );
}
