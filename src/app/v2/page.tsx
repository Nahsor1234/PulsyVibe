'use client';

import { FormEvent, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Heart,
  Home,
  ListMusic,
  Loader2,
  Menu,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Search,
  Settings,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume2,
  X,
  Repeat,
} from 'lucide-react';
import type { MusicIntent } from '@/types/ai';
import type { Track } from '@/types/track';
import { useYouTubePlayer } from '@/hooks/use-youtube-player';

const QUICK_VIBES = [
  'Late night drive',
  'Focus without lyrics',
  '2000s Hindi nostalgia',
  'High energy workout',
  'Calm rainy evening',
  'Underrated indie gems',
];

type DiscoveryResponse = {
  query: string;
  intent: MusicIntent;
  recommendations: Array<{ title: string; artist: string; album?: string; year?: number; language?: string; genre?: string; mood?: string; energy?: number }>;
  results: Array<{ candidate: { title: string; artist: string }; track: Track }>;
};

type View = 'home' | 'search' | 'library' | 'settings';

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function TrackArt({ track, size = 'md' }: { track: Track; size?: 'sm' | 'md' | 'lg' }) {
  const dimensions = size === 'lg' ? 'h-28 w-28 sm:h-36 sm:w-36' : size === 'sm' ? 'h-11 w-11' : 'h-14 w-14';
  return track.thumbnail ? (
    <img src={track.thumbnail} alt="" className={`${dimensions} shrink-0 rounded-xl object-cover shadow-lg`} />
  ) : (
    <div className={`${dimensions} shrink-0 rounded-xl bg-primary/15 flex items-center justify-center`}>
      <Sparkles className="text-primary" size={size === 'lg' ? 30 : 20} />
    </div>
  );
}

function TrackRow({
  track,
  index,
  onPlay,
  onQueue,
  active,
}: {
  track: Track;
  index: number;
  onPlay: () => void;
  onQueue: () => void;
  active: boolean;
}) {
  return (
    <div className={`group flex items-center gap-3 rounded-2xl p-2.5 sm:p-3 transition ${active ? 'bg-primary/10' : 'hover:bg-white/[0.04]'}`}>
      <button aria-label={`Play ${track.title}`} onClick={onPlay} className="relative shrink-0">
        <TrackArt track={track} />
        <span className="absolute inset-0 hidden items-center justify-center rounded-xl bg-black/60 group-hover:flex">
          {active ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{track.title}</p>
        <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
      </div>
      <span className="hidden text-[11px] text-muted-foreground sm:block">{track.duration ? formatTime(track.duration) : ''}</span>
      <button aria-label={`Add ${track.title} to queue`} onClick={onQueue} className="rounded-full p-2 text-muted-foreground hover:bg-white/10 hover:text-foreground">
        <Plus size={18} />
      </button>
      <button aria-label={`More actions for ${track.title}`} className="hidden rounded-full p-2 text-muted-foreground hover:bg-white/10 sm:block">
        <MoreHorizontal size={18} />
      </button>
      {index < 0 && null}
    </div>
  );
}

export default function V2Page() {
  const [view, setView] = useState<View>('home');
  const [query, setQuery] = useState('');
  const [lastQuery, setLastQuery] = useState('');
  const [intent, setIntent] = useState<MusicIntent | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'appearance' | 'playback' | 'discovery'>('appearance');

  const player = useYouTubePlayer();
  const current = player.state.player.currentTrack;
  const progress = player.state.player.duration > 0 ? Math.min(100, (player.state.player.currentTime / player.state.player.duration) * 100) : 0;

  const verifiedTracks = useMemo(() => tracks.filter(t => t.status === 'verified'), [tracks]);
  const unavailableCount = tracks.length - verifiedTracks.length;

  async function discover(text: string) {
    const value = text.trim();
    if (!value || isSearching) return;
    setQuery(value);
    setLastQuery(value);
    setError(null);
    setIsSearching(true);
    setView('search');
    try {
      const response = await fetch('/api/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: value, count: 20, mode: 'batch' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Discovery failed.');
      const result = data as DiscoveryResponse;
      const resolved = result.results.map(item => item.track);
      setIntent(result.intent);
      setTracks(resolved);
      setRecentQueries(previous => [value, ...previous.filter(item => item !== value)].slice(0, 8));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Discovery failed.');
      setTracks([]);
    } finally {
      setIsSearching(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void discover(query);
  }

  function playTrack(track: Track) {
    if (track.status !== 'verified') return;
    const existingIndex = player.state.queue.items.findIndex(item => item.id === track.id);
    if (existingIndex >= 0) {
      player.playAt(existingIndex);
    } else {
      const previousLength = player.state.queue.items.length;
      player.enqueue([track]);
      player.playAt(previousLength);
    }
  }

  function toggleFavorite(track: Track) {
    setFavorites(previous => previous.some(item => item.id === track.id) ? previous.filter(item => item.id !== track.id) : [...previous, track]);
  }

  return (
    <main className="min-h-screen bg-background text-foreground pb-28 md:pb-8">
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px]">
        <aside className="hidden w-60 shrink-0 border-r border-white/[0.06] px-5 py-7 md:flex md:flex-col">
          <button onClick={() => setView('home')} className="mb-10 flex items-center gap-3 px-2 text-left">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary"><Sparkles size={22} /></span>
            <span><strong className="block text-lg tracking-tight">PulsyVibe</strong><small className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">V2 discovery</small></span>
          </button>
          <nav className="space-y-1">
            {([['home', Home, 'Home'], ['search', Search, 'Discover'], ['library', ListMusic, 'Library'], ['settings', Settings, 'Settings']] as const).map(([id, Icon, label]) => (
              <button key={id} onClick={() => setView(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${view === id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'}`}>
                <Icon size={19} />{label}
              </button>
            ))}
          </nav>
          <div className="mt-auto rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 text-xs text-muted-foreground">
            <p className="mb-1 font-semibold text-foreground">AI finds the song.</p>
            <p>YouTube resolution and playback stay separate from recommendations.</p>
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-4 py-5 sm:px-6 md:px-10 md:py-8">
          <header className="mb-8 flex items-center justify-between gap-3">
            <div className="md:hidden flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary"><Sparkles size={19} /></span><strong>PulsyVibe</strong></div>
            <div className="hidden md:block"><p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{view === 'home' ? 'Your music space' : view === 'search' ? 'Discovery' : view === 'library' ? 'Your library' : 'Preferences'}</p></div>
            <div className="relative ml-auto">
              <button onClick={() => setMenuOpen(value => !value)} aria-label="Open menu" className="rounded-full border border-white/[0.07] bg-white/[0.025] p-2.5 hover:bg-white/[0.06] md:hidden"><Menu size={20} /></button>
              {menuOpen && <div className="absolute right-0 top-12 z-30 w-44 rounded-2xl border border-white/10 bg-[#151515] p-2 shadow-2xl md:hidden">
                {([['home', 'Home'], ['search', 'Discover'], ['library', 'Library'], ['settings', 'Settings']] as const).map(([id, label]) => <button key={id} onClick={() => { setView(id); setMenuOpen(false); }} className="w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-white/10">{label}</button>)}
              </div>}
            </div>
          </header>

          {view === 'home' && (
            <div className="mx-auto max-w-5xl">
              <section className="mb-10 pt-4 sm:pt-10">
                <p className="mb-3 flex items-center gap-2 text-sm font-medium text-primary"><Sparkles size={16} /> AI music discovery</p>
                <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">Tell PulsyVibe what you want to hear.</h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">Describe a mood, activity, era, artist, genre, language, or just a feeling. PulsyVibe turns it into verified playable tracks.</p>
              </section>
              <form onSubmit={submit} className="relative mb-8 rounded-3xl border border-white/10 bg-white/[0.035] p-2 shadow-2xl shadow-black/20">
                <div className="flex items-center gap-2"><Search className="ml-3 text-muted-foreground" size={21} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="e.g. songs for a 2am drive through the city" className="min-w-0 flex-1 bg-transparent px-1 py-4 text-sm outline-none placeholder:text-muted-foreground/60 sm:text-base" /><button disabled={!query.trim() || isSearching} className="rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">{isSearching ? <Loader2 className="animate-spin" size={18} /> : 'Discover'}</button></div>
              </form>
              <div className="mb-12 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">{QUICK_VIBES.map(vibe => <button key={vibe} onClick={() => void discover(vibe)} className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.025] px-4 py-2 text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground">{vibe}</button>)}</div>
              {recentQueries.length > 0 && <section><SectionTitle icon={<Clock3 size={17} />} title="Recent discoveries" /><div className="grid gap-2 sm:grid-cols-2">{recentQueries.slice(0, 6).map(item => <button key={item} onClick={() => void discover(item)} className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left text-sm hover:bg-white/[0.05]"><Clock3 size={15} className="text-muted-foreground" /><span className="truncate">{item}</span></button>)}</div></section>}
            </div>
          )}

          {view === 'search' && (
            <div className="mx-auto max-w-5xl">
              <form onSubmit={submit} className="mb-7 flex rounded-2xl border border-white/10 bg-white/[0.035] p-2"><Search className="ml-3 self-center text-muted-foreground" size={19} /><input value={query} onChange={event => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none" /><button disabled={isSearching} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">{isSearching ? <Loader2 className="animate-spin" size={17} /> : 'Search'}</button></form>
              {isSearching && <LoadingResults />}
              {error && !isSearching && <StateCard title="Discovery failed" message={error} action="Try again" onAction={() => void discover(lastQuery)} />}
              {!isSearching && !error && tracks.length === 0 && <StateCard title="Nothing here yet" message="Describe what you want to hear and the V2 discovery engine will build a result set." action="Go home" onAction={() => setView('home')} />}
              {!isSearching && !error && tracks.length > 0 && <>
                <div className="mb-6 rounded-3xl border border-white/[0.06] bg-white/[0.025] p-5"><div className="flex items-start gap-3"><span className="rounded-xl bg-primary/10 p-2 text-primary"><Sparkles size={18} /></span><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">AI intent</p><h2 className="mt-1 text-lg font-bold">{intent?.query || lastQuery}</h2><div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">{intent?.mode && <span className="rounded-full bg-white/[0.06] px-2.5 py-1">{intent.mode}</span>}{intent?.languages?.map(item => <span key={item} className="rounded-full bg-white/[0.06] px-2.5 py-1">{item}</span>)}{intent?.genres?.map(item => <span key={item} className="rounded-full bg-white/[0.06] px-2.5 py-1">{item}</span>)}</div></div></div></div>
                <div className="mb-4 flex items-end justify-between"><div><h2 className="text-xl font-bold">Results</h2><p className="mt-1 text-xs text-muted-foreground">{verifiedTracks.length} playable{unavailableCount ? ` · ${unavailableCount} unavailable` : ''}</p></div><button onClick={() => { if (verifiedTracks.length) { player.enqueue(verifiedTracks); player.playAt(player.state.queue.items.length); } }} className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"><Play size={15} fill="currentColor" /> Play all</button></div>
                <div className="space-y-1">{tracks.map((track, index) => track.status === 'verified' ? <div key={track.id} className="flex items-center"><div className="min-w-0 flex-1"><TrackRow track={track} index={index} active={current?.id === track.id} onPlay={() => playTrack(track)} onQueue={() => player.enqueue([track])} /></div><button onClick={() => toggleFavorite(track)} aria-label="Favorite" className={`ml-1 hidden rounded-full p-2 sm:block ${favorites.some(item => item.id === track.id) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}><Heart size={17} fill={favorites.some(item => item.id === track.id) ? 'currentColor' : 'none'} /></button></div> : <div key={track.id} className="flex items-center gap-3 rounded-2xl p-3 opacity-50"><div className="h-14 w-14 rounded-xl border border-dashed border-white/10" /><div><p className="text-sm font-medium">{track.title}</p><p className="text-xs text-muted-foreground">{track.artist} · unavailable</p></div></div>)}</div>
              </>}
            </div>
          )}

          {view === 'library' && <div className="mx-auto max-w-5xl"><h1 className="mb-2 text-3xl font-black">Library</h1><p className="mb-8 text-sm text-muted-foreground">Your locally remembered favorites and the current queue.</p><SectionTitle icon={<Heart size={17} />} title="Favorites" />{favorites.length ? <div className="space-y-1">{favorites.map((track, index) => <TrackRow key={track.id} track={track} index={index} active={current?.id === track.id} onPlay={() => playTrack(track)} onQueue={() => player.enqueue([track])} />)}</div> : <StateCard title="No favorites yet" message="Tap the heart on a discovered track to keep it here." />}</div>}

          {view === 'settings' && <div className="mx-auto max-w-3xl"><h1 className="mb-2 text-3xl font-black">Settings</h1><p className="mb-8 text-sm text-muted-foreground">V2 playback and discovery preferences.</p><div className="grid gap-2 sm:grid-cols-3">{([['appearance', 'Appearance'], ['playback', 'Playback'], ['discovery', 'Discovery']] as const).map(([id, label]) => <button key={id} onClick={() => setSettingsTab(id)} className={`rounded-xl px-4 py-3 text-left text-sm ${settingsTab === id ? 'bg-primary/10 text-primary' : 'bg-white/[0.025] text-muted-foreground'}`}>{label}</button>)}</div><div className="mt-5 rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5 sm:p-7">{settingsTab === 'appearance' && <><SettingRow title="Theme" description="V2 currently follows the system dark visual language." value="Dark" /></>}{settingsTab === 'playback' && <><SettingRow title="Shuffle" description="Randomize the playback queue." value={player.state.queue.shuffle ? 'On' : 'Off'} onClick={() => player.setShuffle(!player.state.queue.shuffle)} /><SettingRow title="Repeat" description="Repeat the queue or the current track." value={player.state.queue.repeat} onClick={() => player.setRepeat(player.state.queue.repeat === 'off' ? 'all' : player.state.queue.repeat === 'all' ? 'one' : 'off')} /></>}{settingsTab === 'discovery' && <><SettingRow title="Recommendation count" description="The V2 API is bounded to keep discovery predictable." value="20" /><SettingRow title="Playback source" description="Official YouTube embedded player. No direct media extraction." value="YouTube" /></>}</div></div>}
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08] bg-[#101010]/95 backdrop-blur-2xl md:bottom-4 md:left-1/2 md:right-auto md:w-[min(760px,calc(100%-32px))] md:-translate-x-1/2 md:rounded-3xl md:border">
        {current && <div className="mx-auto max-w-3xl px-3 pt-2"><div className="mb-2 h-0.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} /></div><div className="flex items-center gap-3 pb-2"><button onClick={() => setPlayerOpen(true)} className="min-w-0 flex-1 text-left"><div className="flex items-center gap-3"><TrackArt track={current} size="sm" /><div className="min-w-0"><p className="truncate text-xs font-semibold">{current.title}</p><p className="truncate text-[11px] text-muted-foreground">{current.artist}</p></div></div></button><button onClick={() => player.previous()} aria-label="Previous"><SkipBack size={18} /></button><button onClick={() => player.state.player.status === 'playing' ? player.pause() : player.play()} aria-label="Play or pause" className="rounded-full bg-foreground p-2 text-background">{player.state.player.status === 'playing' ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button><button onClick={() => player.next()} aria-label="Next"><SkipForward size={18} /></button><button onClick={() => setPlayerOpen(true)} aria-label="Open player"><ChevronUpIcon /></button></div></div>}
        <nav className="grid grid-cols-4 border-t border-white/[0.06] px-2 py-2 md:hidden"><MobileNav active={view === 'home'} icon={<Home size={18} />} label="Home" onClick={() => setView('home')} /><MobileNav active={view === 'search'} icon={<Search size={18} />} label="Discover" onClick={() => setView('search')} /><MobileNav active={view === 'library'} icon={<Heart size={18} />} label="Library" onClick={() => setView('library')} /><MobileNav active={view === 'settings'} icon={<Settings size={18} />} label="Settings" onClick={() => setView('settings')} /></nav>
      </div>

      <div ref={player.containerRef} className={playerOpen ? 'fixed left-1/2 top-1/2 z-50 h-[min(50vw,420px)] w-[min(90vw,760px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl' : 'fixed -left-[9999px] top-0 h-1 w-1 overflow-hidden'} />
      {playerOpen && current && <div className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm" onClick={() => setPlayerOpen(false)}><div className="pointer-events-none absolute left-1/2 top-[calc(50%+220px)] flex -translate-x-1/2 items-center gap-3 text-center"><div><p className="text-sm font-bold">{current.title}</p><p className="text-xs text-white/60">{current.artist}</p></div><button className="pointer-events-auto rounded-full bg-white/10 p-2" onClick={() => setPlayerOpen(false)}><X size={17} /></button></div></div>}
    </main>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) { return <div className="mb-3 flex items-center gap-2 text-sm font-bold">{icon}<span>{title}</span></div>; }
function LoadingResults() { return <div className="space-y-2">{Array.from({ length: 7 }).map((_, index) => <div key={index} className="flex items-center gap-3 rounded-2xl p-3"><div className="h-14 w-14 animate-pulse rounded-xl bg-white/[0.06]" /><div className="flex-1 space-y-2"><div className="h-3 w-2/5 animate-pulse rounded bg-white/[0.06]" /><div className="h-2.5 w-1/4 animate-pulse rounded bg-white/[0.04]" /></div></div>)}</div>; }
function StateCard({ title, message, action, onAction }: { title: string; message: string; action?: string; onAction?: () => void }) { return <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-10 text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05] text-primary"><Sparkles size={21} /></div><h2 className="text-lg font-bold">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{message}</p>{action && onAction && <button onClick={onAction} className="mt-5 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground">{action}</button>}</div>; }
function MobileNav({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) { return <button onClick={onClick} className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] ${active ? 'text-primary' : 'text-muted-foreground'}`}>{icon}{label}</button>; }
function SettingRow({ title, description, value, onClick }: { title: string; description: string; value: string; onClick?: () => void }) { return <button disabled={!onClick} onClick={onClick} className="flex w-full items-center justify-between gap-5 border-b border-white/[0.06] py-4 text-left last:border-0 disabled:cursor-default"><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div><span className="shrink-0 rounded-full bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold capitalize text-muted-foreground">{value}</span></button>; }
function ChevronUpIcon() { return <ChevronDown size={18} className="rotate-180" />; }
