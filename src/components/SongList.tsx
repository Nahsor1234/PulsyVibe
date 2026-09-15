"use client";

import { memo, useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Youtube, Loader2, PlayCircle, Music2, Terminal, Activity, Copy, Check, AlertTriangle, Sparkles, MessageSquareQuote, Download } from "lucide-react";
import { useVibeFeedback } from "@/hooks/use-vibe-feedback";
import { type TrackInfo, type CrawlerSong } from "@/app/actions/youtube";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";

export interface Song {
  s_id?: string;
  title: string;
  artist: string;
  vibe?: string;
  color?: number; 
  restricted?: boolean;
}

interface AIDJResponse {
  title?: string;
  djMessage?: string;
  tone?: string;
}

interface SongListProps {
  songs: Song[];
  activeTrack: TrackInfo | null;
  loadingTrack: string | null;
  onPlay: (song: Song) => void;
  videoLinks?: Record<string, CrawlerSong>;
  downloadMethod?: 'organic' | 'syncx' | 'faces100';
  isGenerating?: boolean;
  dynamicColors?: boolean;
  rawStreamText?: string;
  consoleLogs?: string[];
  targetCount?: number;
  sessionType?: 'ai' | 'crawler';
  isHistoryView?: boolean;
  aiDjResponse?: AIDJResponse | null;
}

const SpotifyIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#1DB954]" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.508 17.302c-.223.367-.704.484-1.071.261-2.813-1.72-6.353-2.103-10.518-1.151-.421.096-.84-.167-.937-.588-.097-.421.167-.84.588-.937 4.562-1.043 8.468-.604 11.61 1.317.368.225.485.706.262 1.073v.026zm1.487-3.26c-.28.455-.877.6-1.332.32-3.21-1.972-8.117-2.545-11.912-1.393-.518.157-1.06-.143-1.217-.662-.157-.518.143-1.06.662-1.217 4.34-1.317 9.742-.663 13.481 1.632.455.28.6 0 .878.32.453l-.002.003zm.143-3.385C15.302 8.243 8.865 8.03 5.122 9.166a1.121 1.121 0 0 1-.652-2.146c4.275-1.297 11.393-1.053 15.827 1.578.53.315.705.998.39 1.528-.314.53-.997.705-1.527.391l-.001-.001z"/>
  </svg>
);

const ConsoleCard = memo(({ logs = [], isGenerating, sessionType }: { logs?: string[]; isGenerating: boolean; sessionType?: 'ai' | 'crawler' }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { feedback } = useVibeFeedback();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  const handleCopy = useCallback(async () => {
    if (typeof window === 'undefined' || !window.navigator.clipboard) return;
    feedback('click');
    const fullLog = [
      `SESSION_TYPE: ${sessionType}`,
      `STATUS: ${isGenerating ? 'ACTIVE' : 'IDLE'}`,
      `--- SYSTEM LOGS ---`,
      ...logs
    ].join('\n');
    
    try {
      await navigator.clipboard.writeText(fullLog);
      setCopied(true);
      feedback('success');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  }, [logs, isGenerating, sessionType, feedback]);

  // UI Filtered Logs for cleaner status display
  const displayLogs = useMemo(() => {
    return logs.filter(log => {
      const skipPrefixes = ["[AI MODEL]", "[AI STREAM", "[KPOP FILTERED]", "[FAULT]"];
      return !skipPrefixes.some(p => log.startsWith(p));
    });
  }, [logs]);

  const isErrorLog = (log: string) => log.includes('[FAULT]') || log.includes('[ERROR]') || log.includes('[CRITICAL]');

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      className="glass-morphism rounded-[2.5rem] p-6 flex flex-col gap-3 border-2 border-primary/10 h-[320px] w-full mb-8 transform-gpu overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-2.5">
          <Terminal size={14} className={cn("text-primary", isGenerating && "animate-pulse")} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">
            {isGenerating ? "Synthesis Console" : "Session Logs"}
          </span>
        </div>
        <button 
          onClick={handleCopy} 
          className="h-9 px-4 rounded-full hover:bg-white/5 transition-all text-white/40 flex items-center justify-center gap-2 border border-white/5 active:scale-95"
        >
          {copied ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
          <span className="text-[9px] font-black uppercase tracking-widest">{copied ? 'Copied' : 'Copy Logs'}</span>
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2.5 pt-2 scrollbar-hide font-mono text-[10px]">
        {displayLogs.map((log, i) => (
          <div key={`${i}-${log.length}`} className={cn(
            "flex items-start gap-2.5",
            isErrorLog(log) ? "text-red-400" : "text-white/50"
          )}>
            {isErrorLog(log) ? (
              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
            ) : (
              <Activity size={12} className="shrink-0 opacity-30 mt-0.5" />
            )}
            <span className="leading-relaxed break-all font-medium">{log}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
});
ConsoleCard.displayName = "ConsoleCard";

const AI_DJ_Box = memo(({ message }: { message: string }) => {
  const cleanMessage = useMemo(() => message.replace(/^["'"]+|["'"]+$/g, '').trim(), [message]);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full glass-morphism rounded-[2.5rem] p-10 mb-8 border-2 border-primary/10 bg-gradient-to-br from-primary/5 via-white/[0.02] to-white/[0.05] relative overflow-hidden group shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] transform-gpu"
    >
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
        <MessageSquareQuote size={90} className="text-primary" />
      </div>
      <div className="flex items-center gap-3.5 mb-5">
        <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_20px_hsl(var(--primary)/0.15)]">
          <Sparkles size={16} className="text-primary animate-pulse" />
        </div>
        <span className="text-[11px] font-black uppercase tracking-[0.5em] text-primary opacity-80">AI DJ Insight</span>
      </div>
      <p className="text-lg sm:text-2xl font-semibold text-white/90 leading-relaxed italic relative z-10 tracking-tight">
        {cleanMessage}
      </p>
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
    </motion.div>
  );
});
AI_DJ_Box.displayName = "AI_DJ_Box";

const SongCard = memo(({ s, meta, isActive, isLoading, onPlay, handleYT, handleGrab, dynamicColors }: any) => {
  const songHue = useMemo(() => meta?.hue ?? s?.color ?? 161, [s?.color, meta?.hue]);
  const videoId = meta?.videoId;
  const displayArtist = meta?.artist || s?.artist || "Resolving...";
  
  const [imgStatus, setImgStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [retryCount, setRetryCount] = useState(0);

  const thumbUrl = useMemo(() => {
    if (!videoId) return null;
    if (retryCount === 0) return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
    if (retryCount === 1) return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    return null;
  }, [videoId, retryCount]);

  useEffect(() => {
    if (videoId) {
      setImgStatus('loading');
      setRetryCount(0);
    }
  }, [videoId]);

  const adaptiveCardStyle = useMemo(() => {
    const baseStyle: any = {
      borderColor: (dynamicColors && s) ? `hsla(${songHue}, 60%, 50%, 0.15)` : 'rgba(255,255,255,0.06)',
      boxShadow: isActive 
        ? `0 25px 50px -12px hsla(${songHue}, 70%, 40%, 0.4)` 
        : '0 15px 35px -10px rgba(0,0,0,0.4)',
      willChange: 'transform',
      contain: 'paint'
    };

    if (dynamicColors && s) {
       baseStyle.backgroundColor = `hsla(${songHue}, 20%, 16%, 0.95)`;
       baseStyle.backdropFilter = 'blur(40px) saturate(1.6)';
    }

    return baseStyle;
  }, [dynamicColors, s, songHue, isActive]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ 
        scale: isActive ? 1 : 0.98,
        opacity: 1, 
        y: 0 
      }}
      whileTap={{ scale: 0.97 }}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 30,
        mass: 1 
      }}
      className="relative transform-gpu h-full w-full"
    >
      <div
        style={adaptiveCardStyle}
        className={cn(
          "glass-morphism rounded-[2.8rem] p-5 flex flex-col gap-4 border-2 h-full transition-all duration-300 ease-out",
          isActive && "ring-2 ring-primary/30 scale-[1.02] z-10"
        )}
      >
        <div className="relative aspect-[16/9] w-full rounded-[2rem] overflow-hidden bg-[#1a1a1a] border border-white/5 group/img shadow-2xl">
          {(imgStatus === 'loading' && videoId) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <Skeleton className="w-full h-full bg-white/[0.02] animate-pulse" />
            </div>
          )}

          {thumbUrl ? (
            <Image 
              src={thumbUrl} 
              alt="" 
              fill 
              loading="lazy"
              decoding="async"
              className={cn(
                "object-cover transition-opacity duration-700 ease-out group-hover/img:scale-110",
                imgStatus === 'loading' ? 'opacity-0' : 'opacity-100'
              )}
              unoptimized 
              onLoad={() => setImgStatus('success')}
              onError={() => retryCount < 2 ? setRetryCount(prev => prev + 1) : setImgStatus('error')}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Music2 size={28} className="text-white/5" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/10">Protected Source</span>
            </div>
          )}
          
          <div className={cn("absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all duration-300 backdrop-blur-[4px] z-20 touch-device:opacity-100 touch-device:bg-black/30", (isActive || isLoading) && "opacity-100 backdrop-blur-none bg-black/40")}>
            <motion.button 
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onPlay(s)} 
              disabled={!videoId}
              className="w-16 h-16 flex items-center justify-center"
            >
              {isLoading ? <Loader2 className="animate-spin text-white" size={32} /> : <PlayCircle size={64} className="text-white hover:text-primary transition-colors duration-300" fill="currentColor" />}
            </motion.button>
          </div>

          {/* Small persistent play indicator for mobile thumbnails */}
          {(!isActive && !isLoading && videoId) && (
            <div className="absolute bottom-3 right-3 z-20 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center sm:hidden">
              <PlayCircle size={18} className="text-white/60" fill="currentColor" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 flex-1 overflow-hidden px-1">
          <div className="min-h-[60px] space-y-2">
            {s.vibe && (
              <div className="mb-1">
                <span 
                  style={{ 
                    backgroundColor: `hsla(${songHue}, 100%, 75%, 0.08)`, 
                    color: `hsla(${songHue}, 100%, 85%, 0.9)`,
                    borderColor: `hsla(${songHue}, 100%, 75%, 0.15)`
                  }}
                  className="text-[9px] font-black uppercase tracking-[0.2em] px-3.5 py-1 rounded-full border whitespace-nowrap inline-block"
                >
                  {s.vibe}
                </span>
              </div>
            )}
            <h3 className="text-[16px] font-black text-white uppercase tracking-tight line-clamp-2 leading-[1.3] drop-shadow-md">
              {s.title}
            </h3>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] truncate text-[#cccccc]">
              {displayArtist}
            </p>
          </div>
          
          <div className="flex items-center gap-3 pt-5 border-t border-white/5 mt-auto">
            <motion.button 
              whileTap={{ scale: 0.8 }} 
              onClick={() => videoId && handleYT(videoId)} 
              className="w-10 h-10 rounded-full bg-white/[0.03] flex items-center justify-center text-white/20 hover:text-red-500 hover:bg-white/[0.08] border border-white/5 transition-all duration-300 shrink-0"
            >
              <Youtube size={16} />
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.8 }} 
              onClick={() => window.open(`https://open.spotify.com/search/${encodeURIComponent(s.title + ' ' + displayArtist)}`, '_blank')} 
              className="w-10 h-10 rounded-full bg-white/[0.03] flex items-center justify-center text-white/20 hover:bg-white/[0.08] border border-white/5 transition-all duration-300 shrink-0"
            >
              <SpotifyIcon />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }} 
              onClick={() => handleGrab(s)} 
              style={{ 
                backgroundColor: `hsla(${songHue}, 80%, 65%, 0.08)`,
                color: `hsla(${songHue}, 90%, 80%, 0.7)`,
                borderColor: `hsla(${songHue}, 80%, 65%, 0.15)`
              } as any}
              className="flex-1 h-10 rounded-full text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all duration-300 truncate px-4 border"
            >
              <Download size={12} />
              <span>Download</span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}, (prev, next) => {
  return (
    prev.s.s_id === next.s.s_id &&
    prev.isActive === next.isActive &&
    prev.isLoading === next.isLoading &&
    prev.meta?.videoId === next.meta?.videoId &&
    prev.dynamicColors === next.dynamicColors
  );
});
SongCard.displayName = "SongCard";

export const SongList = memo(({ 
  songs, activeTrack, loadingTrack, onPlay, videoLinks = {}, downloadMethod = 'organic',
  isGenerating = false, dynamicColors = false, consoleLogs = [], targetCount = 12, sessionType = 'ai',
  isHistoryView = false, aiDjResponse = null
}: SongListProps) => {
  const { feedback } = useVibeFeedback();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
  const handleYT = useCallback((videoId: string) => {
    feedback('click');
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
  }, [feedback]);

  const handleGrab = useCallback((song: Song) => {
    feedback('success');
    
    const videoId = videoLinks[song.title]?.videoId;
    const songQuery = `${song.title} ${song.artist}`;
    
    if (downloadMethod === 'syncx') {
      window.open(`https://www.orelec-orleans.fr/explore/${encodeURIComponent(song.title)}/`, '_blank');
    } else if (downloadMethod === 'faces100') {
      window.open(`https://www.prosoccer.co.za/search/${encodeURIComponent(song.title)}`, '_blank');
    } else {
      if (videoId) {
        const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
        window.open(`https://p.savenow.to/api/card2/?url=${encodeURIComponent(ytUrl)}`, '_blank');
      } else {
        window.open(`https://p.savenow.to/api/card2/?url=${encodeURIComponent('https://www.youtube.com/results?search_query=' + songQuery)}`, '_blank');
      }
    }
  }, [feedback, videoLinks, downloadMethod]);

  const slots = useMemo(() => {
    const count = Math.max(songs.length, isGenerating ? (targetCount || 12) : 0);
    return Array.from({ length: count });
  }, [isGenerating, targetCount, songs.length]);

  if (!isHydrated) return null;

  return (
    <div className="w-full relative pb-48 px-1 min-h-[600px] transform-gpu [contain:paint]">
      <div className="flex flex-col gap-8 w-full">
        <AnimatePresence mode="wait" initial={false}>
          {(!isHistoryView && (songs.length > 0 || isGenerating || consoleLogs.length > 0)) && (
            <ConsoleCard key="atomic-console" logs={consoleLogs || []} isGenerating={isGenerating} sessionType={sessionType} />
          )}

          {aiDjResponse?.djMessage && (
             <AI_DJ_Box key="ai-dj-narrative" message={aiDjResponse.djMessage} />
          )}

          <motion.div key="song-grid-container" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-8 md:gap-10 lg:gap-18">
            {slots.map((_, i) => {
              const s = songs[i];
              
              return s ? (
                <SongCard
                  key={s.s_id || `song-data-${i}`}
                  s={s}
                  meta={videoLinks[s.title]}
                  isActive={activeTrack?.title === s.title}
                  isLoading={loadingTrack === s.title}
                  onPlay={onPlay}
                  handleYT={handleYT}
                  handleGrab={handleGrab}
                  dynamicColors={dynamicColors}
                />
              ) : (
                <motion.div 
                  key={`skeleton-placeholder-${i}`} 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 0.3 }} 
                  exit={{ opacity: 0 }} 
                  className="glass-morphism rounded-[2.8rem] p-5 min-h-[380px] bg-white/[0.02] border border-white/5 transform-gpu"
                >
                  <Skeleton className="aspect-[16/9] w-full rounded-[2rem] bg-white/[0.02] animate-pulse" />
                  <div className="mt-5 space-y-3.5">
                    <Skeleton className="h-5 w-4/5 rounded-full bg-white/[0.02]" />
                    <Skeleton className="h-3 w-1/2 rounded-full bg-white/[0.02]" />
                    <div className="pt-6 flex gap-3">
                      <Skeleton className="h-10 w-10 rounded-full bg-white/[0.02]" />
                      <Skeleton className="h-10 w-10 rounded-full bg-white/[0.02]" />
                      <Skeleton className="h-10 flex-1 rounded-full bg-white/[0.02]" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
});

SongList.displayName = "SongList";
