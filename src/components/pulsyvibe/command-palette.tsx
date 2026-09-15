'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Home, ListMusic, Search, Settings, Sparkles, X } from 'lucide-react';

type Command = { id: string; label: string; hint: string; icon: typeof Home; action: () => void };

export function CommandPalette({ onNavigate, onSearch, onOpenPlayer, playerAvailable }: {
  onNavigate: (view: 'home' | 'search' | 'library' | 'settings') => void;
  onSearch: (query: string) => void;
  onOpenPlayer: () => void;
  playerAvailable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
        return;
      }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const commands = useMemo<Command[]>(() => [
    { id: 'discover', label: 'Search music', hint: 'Start an AI discovery', icon: Search, action: () => { onNavigate('search'); setOpen(false); } },
    { id: 'home', label: 'Go home', hint: 'Open your music space', icon: Home, action: () => { onNavigate('home'); setOpen(false); } },
    { id: 'library', label: 'Open library', hint: 'View favorites', icon: ListMusic, action: () => { onNavigate('library'); setOpen(false); } },
    { id: 'settings', label: 'Open settings', hint: 'Playback preferences', icon: Settings, action: () => { onNavigate('settings'); setOpen(false); } },
    ...(playerAvailable ? [{ id: 'player', label: 'Open player', hint: 'Focus on what is playing', icon: Sparkles, action: () => { onOpenPlayer(); setOpen(false); } }] : []),
  ], [onNavigate, onOpenPlayer, playerAvailable]);

  const filtered = commands.filter(command => `${command.label} ${command.hint}`.toLowerCase().includes(query.toLowerCase()));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-md">
      <button aria-label="Close command palette" className="absolute inset-0" onClick={() => setOpen(false)} />
      <div role="dialog" aria-modal="true" aria-label="Command palette" className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-[#141414] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-4">
          <Search size={19} className="text-muted-foreground" />
          <input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="What do you want to do?" className="min-w-0 flex-1 bg-transparent py-4 text-sm outline-none placeholder:text-muted-foreground/60" />
          <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-full bg-white/[0.06] p-2"><X size={17} /></button>
        </div>
        <div className="p-2">
          {filtered.length ? filtered.map(command => {
            const Icon = command.icon;
            return <button key={command.id} onClick={command.action} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3.5 text-left hover:bg-white/[0.06]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05]"><Icon size={18} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{command.label}</span><span className="block text-xs text-muted-foreground">{command.hint}</span></span><ArrowRight size={16} className="text-muted-foreground" /></button>;
          }) : <p className="px-3 py-8 text-center text-sm text-muted-foreground">No matching command.</p>}
        </div>
        <div className="border-t border-white/[0.06] px-4 py-2.5 text-[10px] text-muted-foreground">Ctrl/⌘ K to open · Esc to close</div>
      </div>
    </div>
  );
}
