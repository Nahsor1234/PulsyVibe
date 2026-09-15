'use client';

import type { ReactNode } from 'react';
import { History, Settings, SlidersHorizontal } from 'lucide-react';
import { CommandPalette } from './command-palette';

 type View = 'home' | 'search' | 'history' | 'settings';
 type TransitionDirection = 'forward' | 'back';

function PulsyVibeMark({ className = 'h-9 w-9' }: { className?: string }) {
  return <svg viewBox="0 0 100 100" className={className} fill="none" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="#121318" stroke="#34313f" strokeWidth="2"/><path d="M26 50C26 50 32 30 38 50C44 70 48 20 54 50C60 80 66 40 74 50" stroke="#8B7CFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="54" cy="50" r="3.5" fill="#A99CFF"/><path d="M72 28L75 25M72 25L75 28" stroke="#A99CFF" strokeWidth="2" strokeLinecap="round"/></svg>;
}

export function AppShell({ view, onNavigate, onSearch, transitionDirection = 'forward', children }: { view: View; onNavigate: (view: View) => void; onSearch: (query: string) => void; transitionDirection?: TransitionDirection; children: ReactNode }) {
  const subtitle = view === 'home' ? 'Discovery Hub' : view === 'history' ? 'History' : view === 'settings' ? 'Settings' : 'Discovery';
  return <>
    <div className="appy-app-shell">
      <header className="appy-topbar">
        <div className="appy-top-left">
          <button onClick={() => onNavigate('home')} className="appy-history-trigger" aria-label="Open home"><PulsyVibeMark className="h-9 w-9"/></button>
          <span className="appy-top-context"><strong>PulsyVibe</strong><small>{subtitle}</small></span>
        </div>
        <div className="appy-top-actions">
          <button onClick={() => onNavigate('settings')} aria-label="Audio settings" className="appy-top-action"><SlidersHorizontal size={18}/></button>
          <button onClick={() => onNavigate('history')} aria-label="History" className={`appy-top-action ${view === 'history' ? 'is-active' : ''}`}><History size={18}/></button>
          <button onClick={() => onNavigate('settings')} aria-label="Settings" className={`appy-top-action ${view === 'settings' ? 'is-active' : ''}`}><Settings size={18}/></button>
        </div>
      </header>

      <main className="appy-content">
        <div key={`${view}-${transitionDirection}`} className={`pv-screen pv-screen-${view} pv-screen-${transitionDirection}`}>{children}</div>
      </main>
    </div>
    <nav className="pv-floating-nav fixed bottom-[max(.75rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex w-[260px] -translate-x-1/2" aria-label="Primary navigation">
      <div className="pv-floating-nav-pill relative flex h-[50px] w-full items-center rounded-full border border-white/[0.08] bg-[#111113] px-2 shadow-[0_4px_24px_rgba(0,0,0,0.42)]">
        {([['home','⌂','Home'],['history','◷','History'],['settings','⚙','Settings']] as const).map(([id, icon, label]) => <button key={id} onClick={() => onNavigate(id)} aria-current={view === id ? 'page' : undefined} className={`pv-floating-nav-item relative z-10 flex h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-medium ${view === id ? 'is-active text-primary' : 'text-white/48'}`}><span className="text-base leading-none">{icon}</span><span>{label}</span></button>)}
      </div>
    </nav>
    <CommandPalette onNavigate={onNavigate} onSearch={onSearch}/>
  </>;
}
