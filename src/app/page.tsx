'use client';

import type { FormEvent } from 'react';
import { useMemo, useOptimistic, usePersistentState, useState, useTransition } from 'react';
import { ArrowLeft, Clock3, History, Heart, Repeat, Search, Shuffle, Sparkles } from 'lucide-react';
import type { MusicIntent } from '@/types/ai';
import type { Track } from '@/types/track';
import { useYouTubePlayer } from '@/hooks/use-youtube-player';
import { usePersistentState } from '@/hooks/use-persistent-state';
import { AppShell } from '@/components/pulsyvibe/app-shell';
import { DiscoveryForm, LoadingResults, SectionTitle, StateCard } from '@/components/pulsyvibe/discovery-ui';
import { SettingRow } from '@/components/pulsyvibe/setting-row';
import { TrackRow } from '@/components/pulsyvibe/track-row';

type DiscoveryResponse = {
  query: string;
  intent: MusicIntent;
  results: Array<{ candidate: { title: string; artist: string }; track: Track }>;
};

type View = 'home' | 'search' | 'history' | 'settings';
type TransitionDirection = 'forward' | 'back';

type HistoryItem = {
  id: string;
  prompt: string;
  intent: MusicIntent;
  tracks: Track[];
  createdAt: number;
};

const VIEW_ORDER: View[] = ['home', 'search', 'history', 'settings'];
const QUICK_VIBES = ['🌙 Late night drive', '🎧 Focus without lyrics', '💿 2000s Hindi nostalgia', '⚡ High energy workout', '🌧️ Calm rainy evening', '💎 Underrated indie gems'];

function formatHistoryDate(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function createHistoryId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function HomePage() {
  const [view, setView] = usePersistentState<View>('pulsyvibe:view', 'home');
  const [query, setQuery] = usePersistentState<string>('pulsyvibe:query', '');
  const [lastQuery, setLastQuery] = usePersistentState<string>('pulsyvibe:last-query', '');
  const [intent, setIntent] = usePersistentState<MusicIntent | null>('pulsyvibe:intent', null);
  const [tracks, setTracks] = usePersistentState<Track[]>('pulsyvibe:tracks', []);
  const [history, setHistory] = usePersistentState<HistoryItem[]>('pulsyvibe:discovery-history', []);
  const [favorites, setFavorites] = usePersistentState<Track[]>('pulsyvibe:favorites', []);
  const [optimisticFavorites, setOptimisticFavorite] = useOptimistic(favorites, (current: Track[], track: Track) => current.some(item => item.id === track.id) ? current.filter(item => item.id !== track.id) : [...current, track]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [transitionDirection, setTransitionDirection] = useState<TransitionDirection>('forward');

  const player = useYouTubePlayer();
  const current = player.state.player.currentTrack;
  const selectedHistory = history.find(item => item.id === selectedHistoryId) ?? null;
  const verifiedTracks = useMemo(() => tracks.filter(track => track.status === 'verified'), [tracks]);
  const unavailableCount = tracks.length - verifiedTracks.length;

  function navigate(nextView: View) {
    if (nextView === view) return;
    const currentIndex = VIEW_ORDER.indexOf(view);
    const nextIndex = VIEW_ORDER.indexOf(nextView);
    setTransitionDirection(nextIndex >= currentIndex ? 'forward' : 'back');
    startTransition(() => setView(nextView));
  }

  async function discover(text: string) {
    const value = text.trim();
    if (!value || isSearching) return;
    setQuery(value);
    setLastQuery(value);
    setError(null);
    setIsSearching(true);
    navigate('search');
    try {
      const response = await fetch('/api/discovery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: value, count: 20, mode: 'batch' }) });
      const data: unknown = await response.json();
      if (!response.ok) {
        const message = typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string' ? data.error : 'Discovery failed.';
        throw new Error(message);
      }
      const result = data as DiscoveryResponse;
      const fetchedTracks = result.results.map(item => item.track);
      startTransition(() => {
        setIntent(result.intent);
        setTracks(fetchedTracks);
        setHistory(previous => [{ id: createHistoryId(), prompt: value, intent: result.intent, tracks: fetchedTracks, createdAt: Date.now() }, ...previous].slice(0, 30));
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Discovery failed.');
      setTracks([]);
    } finally {
      setIsSearching(false);
    }
  }

  function submit(event: FormEvent) { event.preventDefault(); void discover(query); }

  function playTrack(track: Track) {
    if (track.status !== 'verified') return;
    const index = player.state.queue.items.findIndex(item => item.id === track.id);
    if (index >= 0) {
      void player.playAt(index);
      return;
    }
    const nextIndex = player.state.queue.items.length;
    player.enqueue([track]);
    void player.playAt(nextIndex);
  }

  function toggleFavorite(track: Track) {
    startTransition(() => {
      setOptimisticFavorite(track);
      setFavorites(previous => previous.some(item => item.id === track.id) ? previous.filter(item => item.id !== track.id) : [...previous, track]);
    });
  }

  function openHistoryItem(id: string) {
    setSelectedHistoryId(id);
    navigate('history');
  }

  function goBackToHistoryList() {
    setSelectedHistoryId(null);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <AppShell view={view} onNavigate={navigate} onSearch={discover} transitionDirection={transitionDirection}>
        {view === 'home' && <div className="mx-auto max-w-5xl">
          <section className="mb-10 pt-3 sm:pt-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-primary"><Sparkles size={14} /> AI music discovery</div>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.02] tracking-[-0.04em] sm:text-6xl">Tell PulsyVibe what you feel.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">Describe a mood, activity, era, artist, genre, language, or feeling. PulsyVibe finds playable tracks and saves the whole discovery in History. ✨</p>
          </section>

          <DiscoveryForm query={query} setQuery={setQuery} isSearching={isSearching} onSubmit={submit} />

          <div className="my-8 overflow-x-auto pb-2"><div className="flex w-max gap-2">{QUICK_VIBES.map(vibe => <button key={vibe} onClick={() => void discover(vibe.replace(/^\S+\s/, ''))} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs text-white/65 transition hover:border-primary/30 hover:bg-white/[0.06] hover:text-white">{vibe}</button>)}</div></div>

          <section className="rounded-[1.75rem] border border-white/[0.06] bg-[#0e0e10] p-5 sm:p-6">
            <div className="flex items-end justify-between gap-4"><div><SectionTitle icon={<History size={17} />} title="Recent history" /><p className="mt-2 text-xs text-muted-foreground">Tap a prompt to reopen the exact songs it fetched.</p></div><button onClick={() => navigate('history')} className="text-xs font-semibold text-primary">See all →</button></div>
            {history.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{history.slice(0, 4).map(item => <button key={item.id} onClick={() => openHistoryItem(item.id)} className="group flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left transition hover:-translate-y-0.5 hover:bg-white/[0.045]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-primary"><History size={16} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.prompt}</span><span className="mt-0.5 block text-[11px] text-white/40">{item.tracks.length} songs · {formatHistoryDate(item.createdAt)}</span></span><span className="text-white/25 transition group-hover:translate-x-0.5">→</span></button>)}</div> : <div className="mt-4 rounded-2xl border border-dashed border-white/[0.08] px-5 py-8 text-center"><div className="text-2xl">🪄</div><p className="mt-2 text-sm font-medium">Your discoveries will appear here.</p><p className="mt-1 text-xs text-muted-foreground">Send your first music prompt above.</p></div>}
          </section>
        </div>}

        {view === 'search' && <div className="mx-auto max-w-5xl">
          <DiscoveryForm query={query} setQuery={setQuery} isSearching={isSearching} onSubmit={submit} compact />
          {isSearching && <LoadingResults query={lastQuery || query} />}
          {error && !isSearching && <StateCard title="Discovery failed" message={error} action="Try again" onAction={() => void discover(lastQuery)} />}
          {!isSearching && !error && tracks.length === 0 && <StateCard title="Nothing here yet" message="Describe what you want to hear and PulsyVibe will build a playable result set." action="Go home" onAction={() => navigate('home')} />}
          {!isSearching && !error && tracks.length > 0 && <>
            <div className="my-5 rounded-[1.75rem] border border-white/[0.06] bg-[#0e0e10] p-5"><div className="flex items-start gap-3"><span className="mt-0.5 rounded-xl bg-primary/10 p-2 text-primary"><Sparkles size={17} /></span><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Your prompt</p><h2 className="mt-1 text-lg font-bold">{intent?.query || lastQuery}</h2><div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">{intent?.mode && <span className="rounded-full bg-white/[0.05] px-2.5 py-1">{intent.mode}</span>}{intent?.languages?.map(item => <span key={item} className="rounded-full bg-white/[0.05] px-2.5 py-1">{item}</span>)}{intent?.genres?.map(item => <span key={item} className="rounded-full bg-white/[0.05] px-2.5 py-1">{item}</span>)}</div></div></div></div>
            <div className="mb-4 flex items-end justify-between"><div><h2 className="text-xl font-bold">{verifiedTracks.length} songs found</h2><p className="mt-1 text-xs text-muted-foreground">Tap any song to play it instantly. ▶️{unavailableCount ? ` · ${unavailableCount} unavailable` : ''}</p></div></div>
            <div className="space-y-1">{tracks.map(track => track.status === 'verified' ? <TrackRow key={track.id} track={track} active={current?.id === track.id} onPlay={() => playTrack(track)} onQueue={() => player.enqueue([track])} onFavorite={() => toggleFavorite(track)} favorite={optimisticFavorites.some(item => item.id === track.id)} onSeed={() => { setQuery(track.title); void discover(track.title); }} /> : <div key={track.id} className="flex items-center gap-3 rounded-2xl p-3 opacity-45"><div className="h-14 w-14 rounded-xl border border-dashed border-white/10" /><div><p className="text-sm font-medium">{track.title}</p><p className="text-xs text-muted-foreground">{track.artist} · unavailable</p></div></div>)}</div>
          </>}
        </div>}

        {view === 'history' && <div className="mx-auto max-w-5xl">
          {!selectedHistory ? <>
            <section className="mb-7"><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-primary"><History size={14} /> Discovery history</div><h1 className="text-3xl font-black tracking-[-0.03em] sm:text-5xl">Your prompts, saved. 🗂️</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Every prompt keeps the original set of songs fetched for it. Open a prompt later and play any song from that exact result set.</p></section>
            {history.length ? <div className="grid gap-3">{history.map(item => <button key={item.id} onClick={() => openHistoryItem(item.id)} className="group flex items-center gap-4 rounded-[1.35rem] border border-white/[0.06] bg-[#0e0e10] p-4 text-left transition hover:-translate-y-0.5 hover:border-white/[0.11] hover:bg-white/[0.04]"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><History size={19} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold sm:text-base">{item.prompt}</span><span className="mt-1 block text-xs text-white/40">{item.tracks.length} songs · {formatHistoryDate(item.createdAt)}</span></span><span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1 text-xs text-white/45">Open →</span></button>)}</div> : <div className="rounded-[1.5rem] border border-dashed border-white/[0.08] bg-[#0e0e10] px-5 py-12 text-center"><div className="text-3xl">🗂️</div><h2 className="mt-3 text-lg font-bold">No history yet</h2><p className="mt-1 text-sm text-muted-foreground">Send a prompt from Discover and it will be saved here.</p><button onClick={() => navigate('home')} className="mt-5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">Start discovering</button></div>}
          </> : <>
            <button onClick={goBackToHistoryList} className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-white/55 hover:text-white"><ArrowLeft size={15} /> Back to history</button>
            <section className="mb-6 rounded-[1.75rem] border border-white/[0.06] bg-[#0e0e10] p-5 sm:p-6"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><History size={18} /></span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Saved prompt</p><h1 className="mt-1 text-2xl font-black tracking-[-0.02em] sm:text-3xl">{selectedHistory.prompt}</h1><p className="mt-2 text-xs text-white/40">Fetched {selectedHistory.tracks.length} songs · {formatHistoryDate(selectedHistory.createdAt)}</p></div></div></section>
            <SectionTitle icon={<Sparkles size={17} />} title="Songs from this discovery" />
            <div className="mt-3 space-y-1">{selectedHistory.tracks.map(track => track.status === 'verified' ? <TrackRow key={track.id} track={track} active={current?.id === track.id} onPlay={() => playTrack(track)} onQueue={() => player.enqueue([track])} onFavorite={() => toggleFavorite(track)} favorite={optimisticFavorites.some(item => item.id === track.id)} onSeed={() => { setQuery(track.title); void discover(track.title); }} /> : <div key={track.id} className="rounded-2xl p-3 opacity-45"><p className="text-sm">{track.title}</p><p className="text-xs text-muted-foreground">{track.artist} · unavailable</p></div>)}</div>
          </>}
        </div>}

        {view === 'settings' && <div className="mx-auto max-w-3xl"><div className="mb-8"><h1 className="text-3xl font-black tracking-[-0.03em]">Settings</h1><p className="mt-2 text-sm text-muted-foreground">PulsyVibe stays dark. Songs play when you tap them. 🎵</p></div><SettingRow icon={<Shuffle size={18} />} title="Shuffle" description="Randomize the order of upcoming playback." value={player.state.queue.shuffle ? 'On' : 'Off'} onClick={() => player.setShuffle(!player.state.queue.shuffle)} /><SettingRow icon={<Repeat size={18} />} title="Repeat" description="Repeat the current song or playback sequence." value={player.state.queue.repeat} onClick={() => player.setRepeat(player.state.queue.repeat === 'off' ? 'all' : player.state.queue.repeat === 'all' ? 'one' : 'off')} /><SettingRow icon={<Search size={18} />} title="Playback source" description="Official YouTube IFrame Player API. Tap a verified song to play." value="YouTube" /><SettingRow icon={<History size={18} />} title="Saved discoveries" description="Keep up to 30 prompts with their original fetched tracks." value={`${history.length}/30`} /></div>}
      </AppShell>

      <div ref={player.containerRef} className="fixed -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0 pointer-events-none" aria-hidden="true" />
    </main>
  );
}
