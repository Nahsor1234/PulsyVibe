"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Loader2, PlayCircle, Music2, Sparkles } from "lucide-react";
import { MoodInput } from "@/components/pulsyvibe/MoodInput";
import { VibeBackground } from "@/components/pulsyvibe/VibeBackground";
import { useYouTubePlayer } from "@/hooks/use-youtube-player";
import type { Track } from "@/types/track";

type DiscoveryResult = { track: Track };

export default function Home() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const player = useYouTubePlayer();

  const discover = async (text: string, count: number) => {
    setLoading(true); setError(null); setQuery(text); setTracks([]);
    try {
      const response = await fetch("/api/discovery", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({query:text,count,mode:"progressive"}) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Discovery failed.");
      const next = (data.results ?? []).map((item: DiscoveryResult) => item.track).filter((track: Track) => track?.videoId);
      setTracks(next);
    } catch (e) { setError(e instanceof Error ? e.message : "Discovery failed."); }
    finally { setLoading(false); }
  };

  const play = (track: Track) => {
    const index = tracks.findIndex(item => item.id === track.id);
    if (index >= 0) player.playAt(index);
  };

  return <main className="min-h-screen relative flex flex-col items-center bg-background overflow-x-hidden transform-gpu">
    <VibeBackground isPlaying={player.state.player.status === "playing"} />
    <div ref={player.containerRef} className="fixed -left-[9999px] -top-[9999px] w-px h-px overflow-hidden" aria-hidden="true" />
    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="w-full relative flex flex-col items-center pb-28">
      <div className="w-full max-w-[640px] mx-auto pt-24 md:pt-36 px-4 flex flex-col items-center gap-20">
        <MoodInput onGenerate={(mood,count)=>discover(mood,count)} onSearch={(text,count)=>discover(text,count)} isLoading={loading} />
        <div className="w-full scroll-mt-32 min-h-[400px]">
          <AnimatePresence mode="popLayout" initial={false}>
            {error && <motion.div key="error" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="appy-state-card"><div className="appy-state-icon"><AlertCircle size={22}/></div><h3 className="text-white font-black uppercase tracking-[.25em] text-sm">AI Sync Fault</h3><p className="text-white/40 text-xs mt-3">{error}</p></motion.div>}
            {loading && <motion.div key="loading" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="appy-loading-card flex items-center gap-4"><div className="appy-loading-icon"><Loader2 className="animate-spin" size={20}/></div><div><div className="text-[10px] font-black uppercase tracking-[.3em] text-primary">Synthesis Console</div><div className="text-[9px] uppercase tracking-widest text-white/30 mt-1">Curating {query || "your vibe"}</div></div></motion.div>}
            {!loading && tracks.length > 0 && <motion.div key="results" initial={{opacity:0,y:40}} animate={{opacity:1,y:0}} className="flex flex-col gap-6 w-full">
              <div className="glass-morphism rounded-[2.5rem] p-7 border border-white/10"><div className="flex items-center gap-3"><Sparkles size={14} className="text-primary"/><span className="text-[10px] font-black uppercase tracking-[.5em] text-primary/70">Cognitive Journey</span></div><h2 className="mt-3 text-2xl font-black text-white uppercase tracking-tight">{query}</h2></div>
              {tracks.map((track,index)=><motion.button key={track.id} onClick={()=>play(track)} whileTap={{scale:.98}} className="glass-morphism rounded-[2.5rem] p-4 text-left flex items-center gap-4 border-2 border-white/10 hover:border-primary/30 transition-all"><div className="relative w-24 h-20 shrink-0 rounded-[1.5rem] overflow-hidden bg-[#1a1a1a]">{track.thumbnail ? <img src={track.thumbnail} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><Music2 size={24} className="text-white/10"/></div>}<div className="absolute inset-0 flex items-center justify-center bg-black/30"><PlayCircle size={34} className="text-white"/></div></div><div className="min-w-0 flex-1"><div className="text-[9px] font-black uppercase tracking-[.2em] text-primary/60">Track {index+1}</div><h3 className="text-[15px] font-black text-white uppercase tracking-tight line-clamp-2 mt-1">{track.title}</h3><p className="text-[10px] font-bold uppercase tracking-[.25em] text-white/45 truncate mt-1">{track.artist}</p></div></motion.button>)}
            </motion.div>}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  </main>;
}
