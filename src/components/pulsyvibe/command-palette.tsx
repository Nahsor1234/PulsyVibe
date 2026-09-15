'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, History, Home, Search, Settings, X } from 'lucide-react';

type View = 'home' | 'search' | 'history' | 'settings';
type Command = { id: string; label: string; hint: string; icon: typeof Home; action: () => void };

export function CommandPalette({ onNavigate, onSearch }: {
  onNavigate: (view: View) => void;
  onSearch: (query: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const commands = useMemo<Command[]>(() => [
    { id: 'discover', label: 'Search music', hint: 'Start an AI discovery', icon: Search, action: () => { onNavigate('search'); setOpen(false); } },
    { id: 'home', label: 'Go home', hint: 'Open your music space', icon: Home, action: () => { onNavigate('home'); setOpen(false); } },
    { id: 'history', label: 'Open history', hint: 'Browse your saved discoveries', icon: History, action: () => { onNavigate('history'); setOpen(false); } },
    { id: 'settings', label: 'Open settings', hint: 'Playback preferences', icon: Settings, action: () => { onNavigate('settings'); setOpen(false); } },
  ], [onNavigate]);

  const filtered = commands.filter(command => `${command.label} ${command.hint}`.toLowerCase().includes(query.toLowerCase()));

  function submitSearch() {
    const value = query.trim();
    if (!value) return;
    onSearch(value);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/65 px-4 pt-[12vh] backdrop-blur-md">
      <button aria-label="Close command palette" className="absolute inset-0" onClick={() => setOpen(false)} />
      <div role="dialog" aria-modal="true" aria-label="Command palette" className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-[#121214] shadow-2xl">
        <form onSubmit={event => { event.preventDefault(); submitSearch(); }} className="flex items-center gap-3 border-b border-white/[0.07] px-4">
          <Search size={19} className="text-muted-foreground" />
          <input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search music or choose an action…" className="min-w-0 flex-1 bg-transparent py-4 text-sm outline-none placeholder:text-muted-foreground/60" />
          <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-full bg-white/[0.06] p-2"><X size={17} /></button>
        </form>
        <div className="p-2">
          {filtered.length ? filtered.map(command => {
            const Icon = command.icon;
            return <button key={command.id} onClick={command.action} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3.5 text-left hover:bg-white/[0.06]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05]"><Icon size={18} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{command.label}</span><span className="block text-xs text-muted-foreground">{command.hint}</span></span><ArrowRight size={16} className="text-muted-foreground" /></button>;
          }) : <button onClick={submitSearch} className="w-full rounded-2xl px-3 py-8 text-center text-sm text-muted-foreground hover:bg-white/[0.04]">Press to discover “{query}”</button>}
        </div>
        <div className="border-t border-white/[0.06] px-4 py-2.5 text-[10px] text-muted-foreground">Ctrl/⌘ K to open · Enter to discover · Esc to close</div>
      </div>
    </div>
  );
}
