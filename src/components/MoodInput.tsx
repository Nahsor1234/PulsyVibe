"use client";

import { useState, memo, useCallback, useEffect, useRef } from "react";
import { Dices, Languages, Music2, Search, BrainCircuit, Binary, Headphones, Sparkles, Moon, Flame, Radio, Coffee, Car, CloudRain, Loader2, ChevronRight, Guitar, Disc3, Mic2, Waves } from "lucide-react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useVibeFeedback } from "@/hooks/use-vibe-feedback";
import { cn } from "@/lib/utils";
import { RANDOM_VIBES } from "@/lib/random-vibes";

interface MoodInputProps {
  onGenerate: (mood: string, count: number, language: string) => void;
  onSearch: (query: string, count: number) => void;
  isLoading: boolean;
  currentTheme?: string;
  activeHue?: number | null;
}

const INTERNATIONAL_POOL = [
  { label: "Cinematic Night", icon: <Moon size={14} />, query: "Cinematic night soundtrack" },
  { label: "2000s Nostalgia", icon: <Disc3 size={14} />, query: "2000s nostalgia hits" },
  { label: "Deep Focus", icon: <Binary size={14} />, query: "Deep focus music" },
  { label: "R&B After Hours", icon: <Mic2 size={14} />, query: "R&B after hours" },
  { label: "Retro Synthwave", icon: <Radio size={14} />, query: "Retro synthwave" },
  { label: "Cozy Cafe", icon: <Coffee size={14} />, query: "Cozy cafe acoustic music" },
  { label: "Indie Escape", icon: <Guitar size={14} />, query: "Indie rock escape" },
  { label: "House Sunrise", icon: <Waves size={14} />, query: "House music sunrise" },
  { label: "Punjabi Drive", icon: <Car size={14} />, query: "Punjabi night drive" },
  { label: "Desi Chill", icon: <Sparkles size={14} />, query: "Desi chill session" },
  { label: "Victory Lap", icon: <Flame size={14} />, query: "Victory lap hype music" },
  { label: "Acoustic Campfire", icon: <Headphones size={14} />, query: "Acoustic campfire songs" },
];

export const MoodInput = memo(({ onGenerate, onSearch, isLoading, currentTheme, activeHue }: MoodInputProps) => {
  const [mood, setMood] = useState("");
  const [count, setCount] = useState(12);
  const [language, setLanguage] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [randomizedSuggestions, setRandomizedSuggestions] = useState<typeof INTERNATIONAL_POOL>([]);
  const { feedback } = useVibeFeedback();
  const inputControls = useAnimation();
  const prevCount = useRef(count);

  useEffect(() => {
    setRandomizedSuggestions([...INTERNATIONAL_POOL].sort(() => 0.5 - Math.random()).slice(0, 4));
  }, []);

  const handleSuggestion = useCallback((query: string) => {
    setMood(query);
    feedback('tick');
    inputControls.start({
      scale: [1, 1.02, 1],
      transition: { duration: 0.2 }
    });
  }, [feedback, inputControls]);

  const handleAction = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (!mood.trim() || isLoading) return;

    feedback('click');
    if (isSearchMode) {
      onSearch(mood, count);
    } else {
      onGenerate(mood, count, language);
    }
  }, [mood, isLoading, isSearchMode, onSearch, onGenerate, count, language, feedback]);

  const handleRandomize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const randomVibe = RANDOM_VIBES[Math.floor(Math.random() * RANDOM_VIBES.length)];
    setMood(randomVibe);
    feedback('tick');
    inputControls.start({
      scale: [1, 0.98, 1.02, 1],
      transition: { duration: 0.3 }
    });
  }, [feedback, inputControls]);

  const handleSliderChange = useCallback((v: number[]) => {
    const nextVal = v[0];
    if (nextVal !== prevCount.current) {
      setCount(nextVal);
      prevCount.current = nextVal;
      feedback('tick');
    }
  }, [feedback]);

  const toggleMode = useCallback((val: boolean) => {
    setIsSearchMode(val);
    feedback('toggle');
  }, [feedback]);

  const isImmersive = currentTheme === 'immersive';

  return (
    <div className="w-full max-w-[600px] mx-auto flex flex-col items-center gap-6 px-1 transform-gpu">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center flex flex-col items-center gap-4"
      >
        <h1 className="fluid-h1 font-black tracking-tighter text-gradient leading-[1.1]">
          PulsyVibe.
        </h1>
        <p className="text-muted-foreground/50 text-[clamp(10px,2vw,12px)] font-black uppercase tracking-[0.4em] px-4">
          Organic Sonic Curation
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "w-full glass-morphism rounded-[2.5rem] p-[clamp(16px,4vw,32px)] flex flex-col gap-6 shadow-2xl relative overflow-hidden border border-white/10 bg-[#1a1a1a]/85 backdrop-blur-3xl transform-gpu",
          isImmersive && "border-primary/30 shadow-[0_0_40px_-20px_hsl(var(--primary)/0.3)]"
        )}
      >
        <div className={cn(
          "flex items-center justify-between bg-black/40 border border-white/10 p-2 rounded-full",
          isImmersive && "border-primary/20"
        )}>
          <div className="flex items-center gap-4 pl-2">
            <div className={cn(
                "p-2.5 rounded-2xl transition-all duration-300",
                isSearchMode ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
              )}
            >
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={isSearchMode ? "search-icon" : "ai-icon"}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.15 }}
                >
                  {isSearchMode ? <Search size={18} strokeWidth={3} className="text-black" /> : <BrainCircuit size={18} strokeWidth={3} />}
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="flex flex-col">
              <span className="text-[clamp(10px,2vw,11px)] font-black uppercase tracking-widest text-white leading-none">
                {isSearchMode ? "Start Vibe" : "AI Sync"}
              </span>
              <span className="text-[clamp(7px,1.5vw,8px)] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                {isSearchMode ? "Crawler" : "Cognitive"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 pr-2">
            <Switch 
              checked={isSearchMode} 
              onCheckedChange={toggleMode}
              className="data-[state=checked]:bg-accent data-[state=unchecked]:bg-primary h-6 w-11"
            />
          </div>
        </div>

        <motion.div 
          animate={inputControls}
          className="relative w-full h-[clamp(60px,12vw,80px)]"
        >
          <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none z-10 opacity-60">
            {isSearchMode ? <Search size={22} className="text-white" /> : <Music2 size={22} className="text-white" />}
          </div>
          <input
            type="text"
            disabled={isLoading}
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAction()}
            placeholder={isSearchMode ? "Search music..." : "Describe your vibe..."}
            className={cn(
              "w-full h-full bg-black/20 border-2 border-white/10 rounded-[1.5rem] pl-16 text-[clamp(14px,3vw,16px)] font-black text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 focus:bg-black/30 transition-all disabled:opacity-50 pr-20 shadow-inner",
              isImmersive && "border-primary/40 bg-black/40 focus:border-primary"
            )}
          />
          {!isSearchMode && (
            <div className="absolute right-4 inset-y-0 flex items-center z-20">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleRandomize}
                disabled={isLoading}
                className="h-12 w-12 rounded-xl flex items-center justify-center text-primary bg-black/40 border border-white/20 backdrop-blur-md shadow-xl"
              >
                <Dices className="w-6 h-6" />
              </motion.button>
            </div>
          )}
        </motion.div>

        <div className="flex flex-wrap justify-center gap-2">
          {randomizedSuggestions.map((s) => (
            <motion.button
              key={s.label}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={isLoading}
              onClick={() => handleSuggestion(s.query)}
              className={cn(
                "px-4 py-2 rounded-full border-2 text-[clamp(9px,2vw,10px)] font-black uppercase tracking-widest flex items-center gap-2 transition-all transform-gpu",
                mood === s.query 
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                  : "bg-black/30 text-white/80 border-white/10 hover:border-white/30"
              )}
            >
              <span className="opacity-80 shrink-0">{s.icon}</span>
              <span className="truncate">{s.label}</span>
            </motion.button>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <div className="h-16 bg-black/40 rounded-[1.2rem] border border-white/10 px-6 flex items-center gap-4">
            <div className="flex flex-col min-w-[80px]">
              <span className="text-[clamp(8px,1.5vw,9px)] font-black uppercase tracking-widest text-muted-foreground">Quantity</span>
              <span className="text-base font-black text-primary leading-none">{count}</span>
            </div>
            <Slider
              disabled={isLoading}
              value={[count]}
              onValueChange={handleSliderChange}
              min={5} max={21} step={1}
              className="flex-1"
            />
          </div>

          <div className="h-16 bg-black/40 rounded-[1.2rem] border border-white/10 px-6 flex items-center gap-3">
            <div className="flex flex-col flex-1">
              <span className="text-[clamp(8px,1.5vw,9px)] font-black uppercase tracking-widest text-muted-foreground">Region</span>
              <div className="flex items-center gap-2 border-b-2 border-white/10 focus-within:border-primary/40 transition-all pb-1">
                <Languages size={12} className="text-primary shrink-0" />
                <input
                  disabled={isLoading || isSearchMode}
                  type="text"
                  placeholder="GLOBAL"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-transparent outline-none text-[clamp(10px,2vw,12px)] font-black uppercase tracking-widest text-white placeholder:text-white/10"
                />
              </div>
            </div>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => handleAction()}
          disabled={isLoading || !mood.trim()}
          className={cn(
            "w-full h-16 rounded-[1.5rem] font-black text-[clamp(16px,4vw,18px)] uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center gap-4 relative overflow-hidden group",
            isSearchMode 
              ? "bg-accent text-black" 
              : "bg-primary text-primary-foreground",
            isImmersive && "btn-glow-primary"
          )}
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <div className="flex items-center gap-3 relative z-10">
              {isSearchMode ? "Start Vibe" : "Sync My Vibe"} 
              <ChevronRight size={18} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
            </div>
          )}
        </motion.button>
      </motion.div>
    </div>
  );
});

MoodInput.displayName = "MoodInput";
