'use client';

import type { ReactNode } from 'react';
import { Home, ListMusic, Menu, Search, Settings, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { BottomSheet } from './bottom-sheet';
import { CommandPalette } from './command-palette';

type View = 'home' | 'search' | 'library' | 'settings';

const NAV = [
  ['home', Home, 'Home'],
  ['search', Search, 'Discover'],
  ['library', ListMusic, 'Library'],
  ['settings', Settings, 'Settings'],
] as const;

export function AppShell({ view, onNavigate, onSearch, onOpenPlayer, playerAvailable, children }: {
  view: View;
  onNavigate: (view: View) => void;
  onSearch: (query: string) => void;
  onOpenPlayer: () => void;
  playerAvailable: boolean;
  children: ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px]">
        <aside className="hidden w-60 shrink-0 border-r border-white/[0.06] px-5 py-7 md:flex md:flex-col">
          <button onClick={() => onNavigate('home')} className="mb-10 flex items-center gap-3 px-2 text-left">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary"><Sparkles size={22} /></span>
            <span><strong className="block text-lg tracking-tight">PulsyVibe</strong><small className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">V2 discovery</small></span>
          </button>
          <nav className="space-y-1">
            {NAV.map(([id, Icon, label]) => (
              <button key={id} onClick={() => onNavigate(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${view === id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'}`}>
                <Icon size={19} />{label}
              </button>
            ))}
          </nav>
          <div className="mt-auto rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 text-xs text-muted-foreground">
            <p className="mb-1 font-semibold text-foreground">AI finds the song.</p>
            <p>YouTube resolution and playback stay separate from recommendations.</p>
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-4 py-5 pb-28 sm:px-6 md:px-10 md:py-8 md:pb-8">
          <header className="mb-8 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 md:hidden"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary"><Sparkles size={19} /></span><strong>PulsyVibe</strong></div>
            <p className="hidden text-xs uppercase tracking-[0.22em] text-muted-foreground md:block">{view === 'home' ? 'Your music space' : view === 'search' ? 'Discovery' : view === 'library' ? 'Your library' : 'Preferences'}</p>
            <button onClick={() => setMobileMenuOpen(true)} aria-label="Open navigation" className="ml-auto rounded-full border border-white/[0.07] bg-white/[0.025] p-2.5 md:hidden"><Menu size={20} /></button>
          </header>

          {children}
        </section>
      </div>

      <nav className="pv-mobile-nav fixed bottom-3 left-1/2 z-40 flex w-[min(94vw,430px)] -translate-x-1/2 items-center justify-between gap-1 rounded-[1.4rem] border border-white/10 bg-[#111111]/88 px-2 py-2 shadow-[0_14px_50px_rgba(0,0,0,.45)] backdrop-blur-2xl md:hidden" aria-label="Primary navigation">
        {NAV.map(([id, Icon, label]) => {
          const active = view === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              aria-current={active ? 'page' : undefined}
              className={`pv-mobile-nav-item relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[1rem] px-2 text-[10px] font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}
            >
              {active && <span className="pv-mobile-nav-pill" aria-hidden="true" />}
              <Icon size={18} strokeWidth={active ? 2.4 : 2} className="relative z-[1]" />
              <span className="relative z-[1]">{label}</span>
            </button>
          );
        })}
      </nav>

      <BottomSheet open={mobileMenuOpen} title="Navigate" onClose={() => setMobileMenuOpen(false)}>
        <div className="grid gap-1">
          {NAV.map(([id, Icon, label]) => <button key={id} onClick={() => { onNavigate(id); setMobileMenuOpen(false); }} className={`flex min-h-12 items-center gap-3 rounded-2xl px-3 text-left text-sm ${view === id ? 'bg-primary/10 text-primary' : 'hover:bg-white/[0.06]'}`}><Icon size={18} />{label}</button>)}
        </div>
      </BottomSheet>

      <CommandPalette onNavigate={onNavigate} onSearch={onSearch} onOpenPlayer={onOpenPlayer} playerAvailable={playerAvailable} />
    </>
  );
}
