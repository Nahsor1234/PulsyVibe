'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { Track } from '@/types/track';

type ArtSize = 'sm' | 'md' | 'lg' | 'hero';

const dimensions: Record<ArtSize, string> = {
  sm: 'h-11 w-11 rounded-xl',
  md: 'h-14 w-14 rounded-xl',
  lg: 'h-28 w-28 rounded-2xl sm:h-36 sm:w-36',
  hero: 'h-44 w-44 rounded-3xl sm:h-56 sm:w-56',
};

export function TrackArt({ track, size = 'md' }: { track: Track; size?: ArtSize }) {
  const [broken, setBroken] = useState(false);
  const box = dimensions[size];

  if (!track.thumbnail || broken) {
    return (
      <div data-track-art="true" className={`${box} flex shrink-0 items-center justify-center bg-gradient-to-br from-primary/25 via-primary/10 to-white/[0.04]`}>
        <Sparkles className="text-primary" size={size === 'hero' ? 42 : size === 'lg' ? 30 : 20} />
      </div>
    );
  }

  return (
    <div data-track-art="true" className={`${box} relative shrink-0 overflow-hidden bg-white/[0.04] shadow-2xl`}>
      <img
        src={track.thumbnail}
        alt={`${track.title} artwork`}
        loading={size === 'hero' ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setBroken(true)}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
