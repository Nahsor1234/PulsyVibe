'use client';

import type { CSSProperties, ReactNode } from 'react';
import { Home, History, Search, Settings } from 'lucide-react';
import { CommandPalette } from './command-palette';

type View = 'home' | 'search' | 'history' | 'settings';
type TransitionDirection = 'forward' | 'back';

const NAV = [
  ['home', Home, 'Home'],
  ['search', Search, 'Discover'],
  ['history', History, 'History'],
] as const;

export function AppShell({ view, onNavigate, onSearch, transitionDirection = 'forward', children }: {
  view: View;
  onNavigate: (view: View) => void;
  onSearch: (query: string) => void;
  transitionDirection?: TransitionDirection;
  children: ReactNode;
}) {
  const activeIndex = Math.max(0, NAV.findIndex(([id]) => id === view));

  return (
    <>
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px]">
        <aside className="hidden w-64 shrink-0 border-r border-white/[0.06] bg-[#09090b] px-5 py-7 md:flex md:flex-col">
          <button onClick={() => onNavigate('home')} className="mb-10 flex items-center gap-3 px-2 text-left">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-primary">
              <svg viewBox="0 0 40 40" className="h-6 w-6" aria-hidden="true" fill="none">
                <path d="M11 24.5 16.5 13l4.6 9.3L25 15l4 8.4" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 28.5h22" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
              </svg>
            </span>
            <span><strong className="block text-lg tracking-tight">PulsyVibe</strong><small className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">AI music discovery</small></span>
          </button>
          <nav className="space-y-1">
            {([
              ['home', Home, 'Home'],
              ['search', Search, 'Discover'],
              ['history', History, 'History'],
              ['settings', Settings, 'Settings'],
            ] as const).map(([id, Icon, label]) => (
              <button key={id} onClick={() => onNavigate(id)} className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium ${view === id ? 'bg-white/[0.07] text-foreground' : 'text-muted-foreground hover:bg-white/[0.035] hover:text-foreground'}`}>
                <Icon size={18} />{label}
              </button>
            ))}
          </nav>
          <div className="mt-auto rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs text-muted-foreground">
            <p className="mb-1 font-semibold text-foreground">Tap a song to play ▶️</p>
            <p>Every discovery is saved to History with its original results.</p>
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-4 py-5 pb-28 sm:px-6 md:px-10 md:py-8 md:pb-8">
          <header className="mb-7 flex items-center justify-between gap-3 md:hidden">
            <button onClick={() => onNavigate('home')} className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-primary">
                <svg viewBox="0 0 40 40" className="h-5 w-5" aria-hidden="true" fill="none"><path d="M11 24.5 16.5 13l4.6 9.3L25 15l4 8.4" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 28.5h22" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" /></svg>
              </span>
              <strong>PulsyVibe</strong>
            </button>
            <button onClick={() => onNavigate('settings')} aria-label="Open settings" className={`rounded-full border border-white/[0.09] bg-[#111113] p-2.5 ${view === 'settings' ? 'text-primary' : 'text-white/65'}`}><Settings size={18} /></button>
          </header>

          <p className="mb-7 hidden text-xs uppercase tracking-[0.22em] text-muted-foreground md:block">{view === 'home' ? 'Your music space' : view === 'search' ? 'AI discovery' : view === 'history' ? 'Discovery history' : 'Preferences'}</p>

          <div key={`${view}-${transitionDirection}`} className={`pv-screen pv-screen-${transitionDirection}`}>
            {children}
          </div>
        </section>
      </div>

      <nav className="pv-floating-nav fixed bottom-[max(.65rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex w-[min(82vw,330px)] -translate-x-1/2 items-center gap-1.5 md:hidden" aria-label="Primary navigation">
        <div className="pv-floating-nav-pill relative flex min-w-0 flex-1 items-center rounded-[1.15rem] border border-white/[0.1] bg-[#111113] p-1 shadow-[0_14px_42px_rgba(0,0,0,.56)]" style={{ '--pv-nav-index': activeIndex } as CSSProperties}>
          <span className="pv-floating-nav-indicator" aria-hidden="true" />
          {NAV.map(([id, Icon, label]) => {
            const active = view === id;
            return (
              <button key={id} onClick={() => onNavigate(id)} aria-current={active ? 'page' : undefined} className={`pv-floating-nav-item relative z-10 flex min-h-10 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[0.9rem] px-1 py-1.5 text-[9px] font-medium ${active ? 'is-active text-primary' : 'text-white/48'}`}>
                <Icon size={17} strokeWidth={2.1} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
        <button onClick={() => onNavigate('settings')} aria-label="Open settings" aria-current={view === 'settings' ? 'page' : undefined} className={`pv-floating-settings flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-[#111113] shadow-[0_14px_42px_rgba(0,0,0,.56)] ${view === 'settings' ? 'text-primary' : 'text-white/52'}`}><Settings size={17} /></button>
      </nav>

      <CommandPalette onNavigate={onNavigate} onSearch={onSearch} />
    </>
  );
}
