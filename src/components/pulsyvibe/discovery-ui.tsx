'use client';

import type { FormEvent, ReactNode } from 'react';
import { Loader2, Mic, Search, Sparkles } from 'lucide-react';

export function DiscoveryForm({ query, setQuery, isSearching, onSubmit, compact = false }: { query: string; setQuery: (value: string) => void; isSearching: boolean; onSubmit: (event: FormEvent) => void; compact?: boolean }) {
  return (
    <form onSubmit={onSubmit} className={compact ? 'stitch-discovery-form stitch-discovery-form-compact' : 'stitch-discovery-form'}>
      <div className="stitch-discovery-input-row">
        <Search className="stitch-discovery-search-icon" size={19} aria-hidden="true" />
        <textarea
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder={compact ? 'Search or describe a vibe…' : 'Describe a mood, scene, or sound…'}
          rows={compact ? 1 : 2}
          className="stitch-discovery-textarea"
          aria-label="Describe what you want to hear"
        />
      </div>
      {!compact && (
        <div className="stitch-discovery-actions">
          <button type="button" className="stitch-voice-button" aria-label="Voice input">
            <Mic size={15} />
            <span>Voice</span>
          </button>
          <span className="stitch-discovery-hint">Natural language discovery</span>
          <button disabled={!query.trim() || isSearching} className="stitch-generate-button" aria-label="Generate vibe playlist">
            <span>{isSearching ? 'Finding…' : 'Generate'}</span>
            {isSearching ? <Loader2 className="animate-spin" size={15} /> : <Sparkles size={15} />}
          </button>
        </div>
      )}
      {compact && (
        <button disabled={!query.trim() || isSearching} className="stitch-compact-submit" aria-label="Search">
          {isSearching ? <Loader2 className="animate-spin" size={17} /> : <Search size={17} />}
        </button>
      )}
    </form>
  );
}

export function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return <div className="mb-3 flex items-center gap-2 text-sm font-bold">{icon}<span>{title}</span></div>;
}

export function LoadingResults({ query }: { query: string }) {
  return <div className="overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-8">
    <div className="flex items-center gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Sparkles className="pv-loading-spark" size={22} /></div><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">AI discovery</p><p className="mt-1 truncate text-base font-semibold">Finding music for “{query}”</p></div></div>
    <div className="mt-6 space-y-3 text-sm text-muted-foreground"><div className="flex items-center gap-3"><span className="pv-loading-dot h-2 w-2 rounded-full bg-primary" /><span>Understanding your request</span></div><div className="flex items-center gap-3"><span className="pv-loading-dot pv-loading-dot-delay-1 h-2 w-2 rounded-full bg-primary/70" /><span>Generating candidate tracks</span></div><div className="flex items-center gap-3"><span className="pv-loading-dot pv-loading-dot-delay-2 h-2 w-2 rounded-full bg-primary/40" /><span>Verifying playable results</span></div></div>
    <div className="mt-6 h-1 overflow-hidden rounded-full bg-white/[0.06]"><div className="pv-loading-bar h-full w-1/3 rounded-full bg-primary" /></div>
  </div>;
}

export function StateCard({ title, message, action, onAction }: { title: string; message: string; action?: string; onAction?: () => void }) { return <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-10 text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05] text-primary"><Sparkles size={21} /></div><h2 className="text-lg font-bold">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{message}</p>{action && onAction && <button onClick={onAction} className="mt-5 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground">{action}</button>}</div>; }
