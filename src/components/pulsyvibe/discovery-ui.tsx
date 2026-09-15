'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Binary, BrainCircuit, Car, ChevronRight, CloudRain, Coffee, Dices, Flame, Headphones, Languages, Loader2, Moon, Music2, Search, Sparkles } from 'lucide-react';

const VIBE_POOL = [
  { label: 'Late Night Drive', icon: <Moon size={14} />, query: 'Late Night Drive' },
  { label: 'Rainy Mood', icon: <CloudRain size={14} />, query: 'Rainy Mood' },
  { label: 'Night Coding', icon: <Binary size={14} />, query: 'Night Coding' },
  { label: 'Feel Good', icon: <Sparkles size={14} />, query: 'Feel Good' },
  { label: 'Morning Boost', icon: <Coffee size={14} />, query: 'Morning Boost' },
  { label: 'Road Trip', icon: <Car size={14} />, query: 'Road Trip' },
  { label: 'Workout Flow', icon: <Flame size={14} />, query: 'Workout Flow' },
  { label: 'Lofi Beats', icon: <Headphones size={14} />, query: 'Lofi Beats' },
];

function shuffledVibes() {
  return [...VIBE_POOL].sort(() => 0.5 - Math.random()).slice(0, 4);
}

export function DiscoveryForm({ query, setQuery, isSearching, onSubmit, compact = false }: { query: string; setQuery: (value: string) => void; isSearching: boolean; onSubmit: (event: FormEvent) => void; compact?: boolean }) {
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [count, setCount] = useState(12);
  const [language, setLanguage] = useState('');
  const [suggestions, setSuggestions] = useState(VIBE_POOL.slice(0, 4));

  useEffect(() => setSuggestions(shuffledVibes()), []);

  const handleSuggestion = useCallback((value: string) => setQuery(value), [setQuery]);
  const handleRandomize = useCallback(() => {
    const picked = VIBE_POOL[Math.floor(Math.random() * VIBE_POOL.length)];
    setQuery(picked.query);
  }, [setQuery]);
  const title = useMemo(() => (isSearchMode ? 'Start Vibe' : 'AI Sync'), [isSearchMode]);
  const subtitle = useMemo(() => (isSearchMode ? 'Crawler' : 'Cognitive'), [isSearchMode]);

  if (compact) {
    return (
      <form onSubmit={onSubmit} className="appy-command-shell appy-command-shell-compact">
        <div className="appy-command-row">
          <Search className="appy-command-icon" size={20} aria-hidden="true" />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search music..." disabled={isSearching} className="appy-command-input" aria-label="Search music" />
          <button type="submit" disabled={!query.trim() || isSearching} className="appy-primary-button appy-compact-submit">
            {isSearching ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={18} strokeWidth={3} />}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="w-full max-w-[600px] mx-auto flex flex-col items-center gap-6 px-1 transform-gpu">
      <div className="appy-brand-block text-center flex flex-col items-center gap-4">
        <h1 className="appy-logo text-gradient">PulsyVibe.</h1>
        <p className="appy-tagline">Organic Sonic Curation</p>
      </div>

      <form onSubmit={onSubmit} className="appy-command-shell w-full">
        <div className="appy-mode-row">
          <div className="flex items-center gap-4 pl-2">
            <div className={`appy-mode-icon ${isSearchMode ? 'is-search' : ''}`}>{isSearchMode ? <Search size={18} strokeWidth={3} /> : <BrainCircuit size={18} strokeWidth={3} />}</div>
            <div className="flex flex-col"><span className="appy-mode-title">{title}</span><span className="appy-mode-subtitle">{subtitle}</span></div>
          </div>
          <button type="button" aria-pressed={isSearchMode} onClick={() => setIsSearchMode(current => !current)} className={`appy-switch ${isSearchMode ? 'is-on' : ''}`} aria-label="Toggle between AI Sync and Start Vibe"><span /></button>
        </div>

        <div className="appy-main-input">
          <Music2 size={22} className="appy-main-input-icon" aria-hidden="true" />
          <input type="text" disabled={isSearching} value={query} onChange={event => setQuery(event.target.value)} placeholder={isSearchMode ? 'Search music...' : 'Describe your vibe...'} className="appy-main-text-input" aria-label="Describe your vibe" />
          {!isSearchMode && <button type="button" onClick={handleRandomize} disabled={isSearching} className="appy-dice-button" aria-label="Random vibe"><Dices size={22} /></button>}
        </div>

        <div className="appy-vibe-pills">
          {suggestions.map(suggestion => (
            <button key={suggestion.label} type="button" disabled={isSearching} onClick={() => handleSuggestion(suggestion.query)} className={`appy-vibe-pill ${query === suggestion.query ? 'is-selected' : ''}`}>
              <span>{suggestion.icon}</span>{suggestion.label}
            </button>
          ))}
        </div>

        <div className="appy-control-stack">
          <div className="appy-inline-control">
            <div className="min-w-[80px]"><span className="appy-control-label">Quantity</span><span className="appy-control-value">{count}</span></div>
            <input type="range" min="5" max="21" step="1" value={count} onChange={event => setCount(Number(event.target.value))} disabled={isSearching} className="appy-range" aria-label="Number of songs" />
          </div>
          <div className="appy-inline-control">
            <div className="flex flex-col flex-1"><span className="appy-control-label">Region</span><label className="appy-region-input"><Languages size={12} /><input disabled={isSearching || isSearchMode} value={language} onChange={event => setLanguage(event.target.value)} placeholder="GLOBAL" aria-label="Region" /></label></div>
          </div>
        </div>

        <button type="submit" disabled={isSearching || !query.trim()} className="appy-primary-button w-full">
          {isSearching ? <Loader2 size={20} className="animate-spin" /> : <span className="flex items-center gap-3">{isSearchMode ? 'Start Vibe' : 'Sync My Vibe'}<ChevronRight size={19} strokeWidth={3} /></span>}
        </button>
      </form>
    </div>
  );
}

export function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return <div className="mb-3 flex items-center gap-2 text-sm font-bold">{icon}<span>{title}</span></div>;
}

export function LoadingResults({ query }: { query: string }) {
  return <div className="appy-loading-card"><div className="flex items-center gap-4"><div className="appy-loading-icon"><Sparkles className="appy-loading-spark" size={22} /></div><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">AI Sync</p><p className="mt-1 truncate text-base font-semibold">Finding music for “{query}”</p></div></div><div className="mt-6 space-y-3 text-sm text-muted-foreground"><div className="flex items-center gap-3"><span className="pv-loading-dot h-2 w-2 rounded-full bg-primary" /><span>Understanding your request</span></div><div className="flex items-center gap-3"><span className="pv-loading-dot pv-loading-dot-delay-1 h-2 w-2 rounded-full bg-primary/70" /><span>Generating candidate tracks</span></div><div className="flex items-center gap-3"><span className="pv-loading-dot pv-loading-dot-delay-2 h-2 w-2 rounded-full bg-primary/40" /><span>Verifying playable results</span></div></div><div className="mt-6 h-1 overflow-hidden rounded-full bg-white/[0.06]"><div className="pv-loading-bar h-full w-1/3 rounded-full bg-primary" /></div></div>;
}

export function StateCard({ title, message, action, onAction }: { title: string; message: string; action?: string; onAction?: () => void }) {
  return <div className="appy-state-card"><div className="appy-state-icon"><Sparkles size={21} /></div><h2 className="text-lg font-bold">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{message}</p>{action && onAction && <button onClick={onAction} className="appy-primary-button appy-state-action">{action}</button>}</div>;
}
