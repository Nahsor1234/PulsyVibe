'use client';

import type { FormEvent } from 'react';
import { useMemo, useOptimistic, useState, useTransition } from 'react';
import { Clock3, Heart, Repeat, Shuffle, SkipForward, Sparkles, Volume2 } from 'lucide-react';
import type { MusicIntent } from '@/types/ai';
import type { Track } from '@/types/track';
import { useYouTubePlayer } from '@/hooks/use-youtube-player';
import { usePersistentState } from '@/hooks/use-persistent-state';
import { AppShell } from '@/components/pulsyvibe/app-shell';
import { DiscoveryForm, LoadingResults, SectionTitle, StateCard } from '@/components/pulsyvibe/discovery-ui';
import { PlayerShell } from '@/components/pulsyvibe/player-shell';
import { SettingRow } from '@/components/pulsyvibe/setting-row';
import { TrackRow } from '@/components/pulsyvibe/track-row';

type DiscoveryResponse = {
  query: string;
  intent: MusicIntent;
  results: Array<{ candidate: { title: string; artist: string }; track: Track }>;
};

type View = 'home' | 'search' | 'library' | 'settings';
type TransitionDirection = 'forward' | 'back';

const VIEW_ORDER: View[] = ['home', 'search', 'library', 'settings'];
const QUICK_VIBES = ['Late night drive', 'Focus without lyrics', '2000s Hindi nostalgia', 'High energy workout', 'Calm rainy evening', 'Underrated indie gems'];

function runViewTransition(update: () => void) {
  if (typeof document === 'undefined') return update();
  const documentWithTransition = document as Document & { startViewTransition?: (callback: () => void) => unknown };
  if (typeof documentWithTransition.startViewTransition === 'function') documentWithTransition.startViewTransition(update);
  else update();
}

export default function HomePage() {
  const [view, setView] = usePersistentState<View>('pulsyvibe:view', 'home');
  const [query, setQuery] = usePersistentState<string>('pulsyvibe:query', '');
  const [lastQuery, setLastQuery] = usePersistentState<string>('pulsyvibe:last-query', '');
  const [intent, setIntent] = usePersistentState<MusicIntent | null>('pulsyvibe:intent', null);
  const [tracks, setTracks] = usePersistentState<Track[]>('pulsyvibe:tracks', []);
  const [recentQueries, setRecentQueries] = usePersistentState<string[]>('pulsyvibe:recent-queries', []);
  const [favorites, setFavorites] = usePersistentState<Track[]>('pulsyvibe:favorites', []);
  const [optimisticFavorites, setOptimisticFavorite] = useOptimistic(favorites, (current: Track[], track: Track) => current.some(item => item.id === track.id) ? current.filter(item => item.id !== track.id) : [...current, track]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<TransitionDirection>('forward');

  const player = useYouTubePlayer();
  const current = player.state.player.currentTrack;
  const progress = player.state.player.duration > 0 ? Math.min(100, (player.state.player.currentTime / player.state.player.duration) * 100) : 0;
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
      startTransition(() => runViewTransition(() => {
        setIntent(result.intent);
        setTracks(result.results.map(item => item.track));
        setRecentQueries(previous => [value, ...previous.filter(item => item !== value)].slice(0, 8));
      }));
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
    if (index >= 0) return void player.playAt(index);
    const nextIndex = player.state.queue.items.length;
    player.enqueue([track]);
    void player.playAt(nextIndex);
  }

  function playAll() {
    if (!verifiedTracks.length) return;
    const startIndex = player.state.queue.items.length;
    player.enqueue(verifiedTracks);
    void player.playAt(startIndex);
  }

  function toggleFavorite(track: Track) {
    startTransition(() => {
      setOptimisticFavorite(track);
      setFavorites(previous => previous.some(item => item.id === track.id) ? previous.filter(item => item.id !== track.id) : [...previous, track]);
    });
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <AppShell view={view} onNavigate={navigate} onSearch={discover} onOpenPlayer={() => setPlayerOpen(true)} playerAvailable={Boolean(current)} transitionDirection={transitionDirection}>
        {view === 'home' && <div className="mx-auto max-w-5xl">
          <section className="mb-10 pt-4 sm:pt-10"><p className="mb-3 flex items-center gap-2 text-sm font-medium text-primary"><Sparkles size={16} /> AI music discovery</p><h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">Tell PulsyVibe what you want to hear.</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">Describe a mood, activity, era, artist, genre, language, or just a feeling. PulsyVibe turns it into verified playable tracks.</p></section>
          <DiscoveryForm query={query} setQuery={setQuery} isSearching={isSearching} onSubmit={submit} />
          <div className="mb-12 flex gap-2 overflow-x-auto pb-1">{QUICK_VIBES.map(vibe => <button key={vibe} onClick={() => void discover(vibe)} className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.025] px-4 py-2 text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground">{vibe}</button>)}</div>
          {recentQueries.length > 0 && <section><SectionTitle icon={<Clock3 size={17} />} title="Recent discoveries" /><div className="grid gap-2 sm:grid-cols-2">{recentQueries.slice(0, 6).map(item => <button key={item} onClick={() => void discover(item)} className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left text-sm"><Clock3 size={15} className="text-muted-foreground" /><span className="truncate">{item}</span></button>)}</div></section>}
        </div>}

        {view === 'search' && <div className="mx-auto max-w-5xl">
          <DiscoveryForm query={query} setQuery={setQuery} isSearching={isSearching} onSubmit={submit} compact />
          {isSearching && <LoadingResults query={lastQuery || query} />}
          {error && !isSearching && <StateCard title="Discovery failed" message={error} action="Try again" onAction={() => void discover(lastQuery)} />}
          {!isSearching && !error && tracks.length === 0 && <StateCard title="Nothing here yet" message="Describe what you want to hear and the V2 discovery engine will build a result set." action="Go home" onAction={() => navigate('home')} />}
          {!isSearching && !error && tracks.length > 0 && <>
            <div className="mb-6 rounded-3xl border border-white/[0.06] bg-white/[0.025] p-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">AI intent</p><h2 className="mt-1 text-lg font-bold">{intent?.query || lastQuery}</h2><div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">{intent?.mode && <span className="rounded-full bg-white/[0.06] px-2.5 py-1">{intent.mode}</span>}{intent?.languages?.map(item => <span key={item} className="rounded-full bg-white/[0.06] px-2.5 py-1">{item}</span>)}{intent?.genres?.map(item => <span key={item} className="rounded-full bg-white/[0.06] px-2.5 py-1">{item}</span>)}</div></div>
            <div className="mb-4 flex items-end justify-between"><div><h2 className="text-xl font-bold">Results</h2><p className="mt-1 text-xs text-muted-foreground">{verifiedTracks.length} playable{unavailableCount ? ` · ${unavailableCount} unavailable` : ''}</p></div><button onClick={playAll} disabled={!verifiedTracks.length} className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40"><SkipForward size={15} /> Play all</button></div>
            <div className="space-y-1">{tracks.map(track => track.status === 'verified' ? <TrackRow key={track.id} track={track} active={current?.id === track.id} onPlay={() => playTrack(track)} onQueue={() => player.enqueue([track])} onFavorite={() => toggleFavorite(track)} favorite={optimisticFavorites.some(item => item.id === track.id)} onSeed={() => { setQuery(track.title); void discover(track.title); }} /> : <div key={track.id} className="flex items-center gap-3 rounded-2xl p-3 opacity-50"><div className="h-14 w-14 rounded-xl border border-dashed border-white/10" /><div><p className="text-sm font-medium">{track.title}</p><p className="text-xs text-muted-foreground">{track.artist} · unavailable</p></div></div>)}</div>
          </>}
        </div>}

        {view === 'library' && <div className="mx-auto max-w-5xl"><h1 className="mb-2 text-3xl font-black">Library</h1><p className="mb-8 text-sm text-muted-foreground">Favorites and the active playback queue.</p><SectionTitle icon={<Heart size={17} />} title="Favorites" />{optimisticFavorites.length ? <div className="space-y-1">{optimisticFavorites.map(track => <TrackRow key={track.id} track={track} active={current?.id === track.id} onPlay={() => playTrack(track)} onQueue={() => player.enqueue([track])} onFavorite={() => toggleFavorite(track)} favorite onSeed={() => { setQuery(track.title); void discover(track.title); }} />)}</div> : <StateCard title="No favorites yet" message="Tap the heart on a discovered track to keep it here." />}</div>}

        {view === 'settings' && <div className="mx-auto max-w-3xl"><h1 className="mb-2 text-3xl font-black">Settings</h1><p className="mb-8 text-sm text-muted-foreground">V2 playback controls and visual preferences.</p><SettingRow icon={<Shuffle size={18} />} title="Shuffle" description="Randomize the next queue item." value={player.state.queue.shuffle ? 'On' : 'Off'} onClick={() => player.setShuffle(!player.state.queue.shuffle)} /><SettingRow icon={<Repeat size={18} />} title="Repeat" description="Repeat the current track or the whole queue." value={player.state.queue.repeat} onClick={() => player.setRepeat(player.state.queue.repeat === 'off' ? 'all' : player.state.queue.repeat === 'all' ? 'one' : 'off')} /><SettingRow icon={<Volume2 size={18} />} title="Playback source" description="Official YouTube IFrame Player API; no extracted media URLs." value="YouTube" /></div>}
      </AppShell>

      <PlayerShell current={current} progress={progress} player={player} playerOpen={playerOpen} setPlayerOpen={setPlayerOpen} containerRef={player.containerRef} />
    </main>
  );
}
