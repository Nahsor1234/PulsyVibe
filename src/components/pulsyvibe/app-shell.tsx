'use client';

import type { CSSProperties, ReactNode } from 'react';
import { Home, History, Search, Settings } from 'lucide-react';
import { CommandPalette } from './command-palette';

type View = 'home' | 'search' | 'history' | 'settings';
type TransitionDirection = 'forward' | 'back';

const NAV = [
  ['home', Home, 'Home'],
  ['history', History, 'History'],
] as const;

function PulsyVibeMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="#121318" stroke="#252836" strokeWidth="2" />
      <path d="M26 50C26 50 32 30 38 50C44 70 48 20 54 50C60 80 66 40 74 50" stroke="#8B7CFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="54" cy="50" r="3.5" fill="#A99CFF" />
      <path d="M72 28L75 25M72 25L75 28" stroke="#A99CFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

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
            <PulsyVibeMark className="h-10 w-10" />
            <span><strong className="block text-lg tracking-tight">PulsyVibe</strong><small className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">AI music discovery</small></span>
          </button>
          <nav className="space-y-1">
            {([
              ['home', Home, 'Home'],
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
              <PulsyVibeMark className="h-9 w-9" />
              <strong>PulsyVibe</strong>
            </button>
            <button onClick={() => onNavigate('settings')} aria-label="Open settings" className={`rounded-full border border-white/[0.09] bg-[#111113] p-2.5 ${view === 'settings' ? 'text-primary' : 'text-white/65'}`}><Settings size={18} /></button>
          </header>

          <p className="mb-7 hidden text-xs uppercase tracking-[0.22em] text-muted-foreground md:block">{view === 'home' ? 'Your music space' : view === 'search' ? 'AI discovery' : view === 'history' ? 'Discovery history' : 'Preferences'}</p>

          <div key={`${view}-${transitionDirection}`} className={`pv-screen pv-screen-${view} pv-screen-${transitionDirection}`}>
            {children}
          </div>
        </section>
      </div>

      <nav className="pv-floating-nav fixed bottom-[max(.65rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 items-center gap-2" aria-label="Primary navigation">
        <div className="pv-floating-nav-pill relative flex h-[50px] w-[260px] items-center justify-between rounded-full border border-white/[0.08] bg-[#111113] px-2 shadow-[0_4px_24px_rgba(0,0,0,0.42)]" style={{ '--pv-nav-index': activeIndex } as CSSProperties}>
          <span className="pv-floating-nav-indicator" aria-hidden="true" />
          {NAV.map(([id, Icon, label]) => {
            const active = view === id;
            return (
              <button key={id} onClick={() => onNavigate(id)} aria-current={active ? 'page' : undefined} className={`pv-floating-nav-item relative z-10 flex h-11 min-w-[72px] flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-medium transition-colors ${active ? 'is-active text-primary' : 'text-white/48'}`}>
                <Icon size={19} strokeWidth={2} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
        <button onClick={() => onNavigate('settings')} aria-label="Open settings" aria-current={view === 'settings' ? 'page' : undefined} className={`pv-floating-settings flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-[#111113] shadow-[0_4px_24px_rgba(0,0,0,0.42)] ${view === 'settings' ? 'text-primary' : 'text-white/52'}`}><Settings size={19} /></button>
      </nav>

      <CommandPalette onNavigate={onNavigate} onSearch={onSearch} />
    </>
  );
}
