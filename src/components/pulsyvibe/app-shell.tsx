'use client';

import type { CSSProperties, ReactNode } from 'react';
import { Home, ListMusic, Search, Settings, Sparkles } from 'lucide-react';
import { CommandPalette } from './command-palette';

type View = 'home' | 'search' | 'library' | 'settings';
type TransitionDirection = 'forward' | 'back';

const NAV = [
  ['home', Home, 'Home'],
  ['search', Search, 'Discover'],
  ['library', ListMusic, 'Library'],
] as const;

export function AppShell({ view, onNavigate, onSearch, onOpenPlayer, playerAvailable, transitionDirection = 'forward', children }: {
  view: View;
  onNavigate: (view: View) => void;
  onSearch: (query: string) => void;
  onOpenPlayer: () => void;
  playerAvailable: boolean;
  transitionDirection?: TransitionDirection;
  children: ReactNode;
}) {
  const activeIndex = Math.max(0, NAV.findIndex(([id]) => id === view));

  return (
    <>
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px]">
        <aside className="hidden w-60 shrink-0 border-r border-white/[0.06] px-5 py-7 md:flex md:flex-col">
          <button onClick={() => onNavigate('home')} className="mb-10 flex items-center gap-3 px-2 text-left">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.06] text-primary"><Sparkles size={22} /></span>
            <span><strong className="block text-lg tracking-tight">PulsyVibe</strong><small className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">V2 discovery</small></span>
          </button>
          <nav className="space-y-1">
            {([
              ['home', Home, 'Home'],
              ['search', Search, 'Discover'],
              ['library', ListMusic, 'Library'],
              ['settings', Settings, 'Settings'],
            ] as const).map(([id, Icon, label]) => (
              <button key={id} onClick={() => onNavigate(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${view === id ? 'bg-white/[0.06] text-foreground' : 'text-muted-foreground hover:bg-white/[0.035] hover:text-foreground'}`}>
                <Icon size={19} />{label}
              </button>
            ))}
          </nav>
          <div className="mt-auto rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs text-muted-foreground">
            <p className="mb-1 font-semibold text-foreground">AI finds the song.</p>
            <p>YouTube resolution and playback stay separate from recommendations.</p>
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-4 py-5 pb-36 sm:px-6 md:px-10 md:py-8 md:pb-8">
          <header className="mb-8 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 md:hidden"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-primary"><Sparkles size={19} /></span><strong>PulsyVibe</strong></div>
            <p className="hidden text-xs uppercase tracking-[0.22em] text-muted-foreground md:block">{view === 'home' ? 'Your music space' : view === 'search' ? 'Discovery' : view === 'library' ? 'Your library' : 'Preferences'}</p>
          </header>

          <div key={view} className={`pv-screen pv-screen-${transitionDirection}`}>
            {children}
          </div>
        </section>
      </div>

      <nav className="pv-floating-nav fixed bottom-[max(.85rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex w-[min(94vw,430px)] -translate-x-1/2 items-center gap-2 md:hidden" aria-label="Primary navigation">
        <div className="pv-floating-nav-pill relative flex min-w-0 flex-1 items-center rounded-[1.35rem] border border-white/[0.12] bg-[#111113] p-1 shadow-[0_18px_55px_rgba(0,0,0,.62)]" style={{ '--pv-nav-index': activeIndex } as CSSProperties}>
          <span className="pv-floating-nav-indicator" aria-hidden="true" />
          {NAV.map(([id, Icon, label]) => {
            const active = view === id;
            return (
              <button key={id} onClick={() => onNavigate(id)} aria-current={active ? 'page' : undefined} className={`pv-floating-nav-item flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[1.05rem] px-2 py-2 text-[10px] font-medium ${active ? 'is-active text-primary' : 'text-white/50'}`}>
                <span className="pv-floating-nav-icon"><Icon size={19} /></span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
        <button onClick={() => onNavigate('settings')} aria-label="Open settings" aria-current={view === 'settings' ? 'page' : undefined} className={`pv-floating-settings flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/[0.12] bg-[#111113] shadow-[0_18px_55px_rgba(0,0,0,.62)] ${view === 'settings' ? 'is-active text-primary' : 'text-white/55'}`}><Settings size={20} /></button>
      </nav>

      <CommandPalette onNavigate={onNavigate} onSearch={onSearch} onOpenPlayer={onOpenPlayer} playerAvailable={playerAvailable} />
    </>
  );
}
