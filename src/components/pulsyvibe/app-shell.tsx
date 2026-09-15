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
            {([
              ['home', Home, 'Home'],
              ['search', Search, 'Discover'],
              ['library', ListMusic, 'Library'],
              ['settings', Settings, 'Settings'],
            ] as const).map(([id, Icon, label]) => (
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

        <section className="min-w-0 flex-1 px-4 py-5 pb-32 sm:px-6 md:px-10 md:py-8 md:pb-8">
          <header className="mb-8 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 md:hidden"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary"><Sparkles size={19} /></span><strong>PulsyVibe</strong></div>
            <p className="hidden text-xs uppercase tracking-[0.22em] text-muted-foreground md:block">{view === 'home' ? 'Your music space' : view === 'search' ? 'Discovery' : view === 'library' ? 'Your library' : 'Preferences'}</p>
            <button onClick={() => setMobileMenuOpen(true)} aria-label="Open navigation" className="ml-auto rounded-full border border-white/[0.07] bg-white/[0.025] p-2.5 md:hidden"><Menu size={20} /></button>
          </header>

          {children}
        </section>
      </div>

      <nav className="pv-floating-nav fixed bottom-[max(.75rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 md:hidden" aria-label="Primary navigation">
        <div className="pv-floating-nav-pill flex items-center rounded-[1.65rem] border border-white/[0.09] bg-[#111313]/88 p-1.5 shadow-2xl backdrop-blur-2xl">
          {NAV.map(([id, Icon, label]) => { const active = view === id; return <button key={id} onClick={() => onNavigate(id)} aria-current={active ? 'page' : undefined} className={`pv-floating-nav-item flex min-h-12 min-w-[5.7rem] flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-[10px] font-medium ${active ? 'is-active text-primary' : 'text-muted-foreground'}`}><span className="pv-floating-nav-icon"><Icon size={19} /></span><span>{label}</span></button>; })}
        </div>
        <button onClick={() => onNavigate('settings')} aria-label="Open settings" aria-current={view === 'settings' ? 'page' : undefined} className={`pv-floating-settings flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-[#111313]/90 shadow-2xl backdrop-blur-2xl ${view === 'settings' ? 'is-active text-primary' : 'text-muted-foreground'}`}><Settings size={19} /></button>
      </nav>

      <BottomSheet open={mobileMenuOpen} title="Navigate" onClose={() => setMobileMenuOpen(false)}>
        <div className="grid gap-1">
          {([
            ['home', Home, 'Home'],
            ['search', Search, 'Discover'],
            ['library', ListMusic, 'Library'],
            ['settings', Settings, 'Settings'],
          ] as const).map(([id, Icon, label]) => <button key={id} onClick={() => { onNavigate(id); setMobileMenuOpen(false); }} className={`flex min-h-12 items-center gap-3 rounded-2xl px-3 text-left text-sm ${view === id ? 'bg-primary/10 text-primary' : 'hover:bg-white/[0.06]'}`}><Icon size={18} />{label}</button>)}
        </div>
      </BottomSheet>

      <CommandPalette onNavigate={onNavigate} onSearch={onSearch} onOpenPlayer={onOpenPlayer} playerAvailable={playerAvailable} />
    </>
  );
}
