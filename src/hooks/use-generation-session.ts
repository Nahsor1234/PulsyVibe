import { useState, useRef, useCallback, useEffect } from "react";
import { containsKpop } from "@/lib/kpop-filter";
import { UserProfile } from "@/lib/user-profile";
import { getIdentityKey } from "@/lib/utils";
import { extractJSON } from "@/lib/extract-json";
import { Song } from "@/components/SongList";

interface GenerationSessionProps {
  googleAiKey: string | null;
  globalSeenTitles: string[];
  onMissingKey?: () => void;
  feedback: (type: any) => void;
  setSongs: React.Dispatch<React.SetStateAction<Song[]>>;
  setAiDjResponse: React.Dispatch<React.SetStateAction<any>>;
  setVideoLinks: React.Dispatch<React.SetStateAction<any>>;
  setConsoleLogs: React.Dispatch<React.SetStateAction<string[]>>;
  setCurrentMood: React.Dispatch<React.SetStateAction<string>>;
  setRequestedCount: React.Dispatch<React.SetStateAction<number>>;
  setIsMajorBlocked: React.Dispatch<React.SetStateAction<boolean>>;
  setIsContaminated: React.Dispatch<React.SetStateAction<boolean>>;
  setIsError: React.Dispatch<React.SetStateAction<boolean>>;
  setIsHistoryView: React.Dispatch<React.SetStateAction<boolean>>;
  setExportSuccess: React.Dispatch<React.SetStateAction<boolean>>;
  setExporting: React.Dispatch<React.SetStateAction<boolean>>;
  allSongsBufferRef: React.MutableRefObject<Song[]>;
  activeSessionIdRef: React.MutableRefObject<string | null>;
  resolvedTitlesRegistry: React.MutableRefObject<Set<string>>;
  inFlightResolutions: React.MutableRefObject<Set<string>>;
  resultsRef: React.RefObject<HTMLDivElement | null>;
}

export const useGenerationSession = ({
  googleAiKey,
  globalSeenTitles,
  onMissingKey,
  feedback,
  setSongs,
  setAiDjResponse,
  setVideoLinks,
  setConsoleLogs,
  setCurrentMood,
  setRequestedCount,
  setIsMajorBlocked,
  setIsContaminated,
  setIsError,
  setIsHistoryView,
  setExportSuccess,
  setExporting,
  allSongsBufferRef,
  activeSessionIdRef,
  resolvedTitlesRegistry,
  inFlightResolutions,
  resultsRef
}: GenerationSessionProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [sessionType, setSessionType] = useState<'ai' | 'crawler'>('ai');
  const [currentVibeId, setCurrentVibeId] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const removedKpopCountRef = useRef(0);
  const typingTimerRef = useRef<any>(null);
  const statusLogTimersRef = useRef<NodeJS.Timeout[]>([]);
  const sessionIdentityRegistry = useRef<Set<string>>(new Set());
  const isFetchingRef = useRef(isFetching);

  useEffect(() => {
    isFetchingRef.current = isFetching;
  }, [isFetching]);

  const addLog = useCallback((msg: string, delay: number = 0) => {
    if (delay > 0) {
      const timer = setTimeout(() => {
        setConsoleLogs((prev: string[]) => {
          if (prev[prev.length - 1] === msg) return prev;
          return [...prev, msg].slice(-80);
        });
      }, delay);
      statusLogTimersRef.current.push(timer);
    } else {
      setConsoleLogs((prev: string[]) => {
        if (prev[prev.length - 1] === msg) return prev;
        return [...prev, msg].slice(-80);
      });
    }
  }, [setConsoleLogs]);

  const clearStatusLogs = useCallback(() => {
    statusLogTimersRef.current.forEach(clearTimeout);
    statusLogTimersRef.current = [];
  }, []);

  const startProgressiveLogs = useCallback((messages: string[]) => {
    clearStatusLogs();
    const delays = [0, 400, 900, 1400, 1900, 2500, 3200];
    messages.forEach((msg, idx) => {
      const timer = setTimeout(() => {
        addLog(msg);
      }, delays[idx] || idx * 1000);
      statusLogTimersRef.current.push(timer);
    });
  }, [addLog, clearStatusLogs]);

  const resetSession = useCallback((newSessionId: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    activeSessionIdRef.current = newSessionId;
    
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    clearStatusLogs();
    setSongs([]);
    allSongsBufferRef.current = [];
    removedKpopCountRef.current = 0;
    setVideoLinks({});
    setConsoleLogs([]);
    setIsMajorBlocked(false);
    setIsContaminated(false);
    setIsError(false);
    setExportSuccess(false);
    setIsHistoryView(false);
    setExporting(false);
    setAiDjResponse(null);
    sessionIdentityRegistry.current = new Set();
    resolvedTitlesRegistry.current = new Set();
    inFlightResolutions.current.clear();
  }, [clearStatusLogs, setSongs, setVideoLinks, setConsoleLogs, setIsMajorBlocked, setIsContaminated, setIsError, setExportSuccess, setIsHistoryView, setExporting, setAiDjResponse, resolvedTitlesRegistry, inFlightResolutions, activeSessionIdRef, allSongsBufferRef]);

  const handleGenerate = useCallback(async (mood: string, count: number, lang: string) => {
    const generateSafeId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

    if (containsKpop(mood)) {
      setIsMajorBlocked(true);
      setCurrentMood(mood);
      feedback('error');
      return;
    }

    const newVibeId = generateSafeId();
    resetSession(newVibeId);
    
    setCurrentVibeId(newVibeId);
    setCurrentMood(mood);
    setRequestedCount(count);
    setSessionType('ai');
    setIsGenerating(true);
    setIsFetching(true);
    feedback('click');

    UserProfile.trackEvent('SEARCH', mood);
    
    startProgressiveLogs([
      "Analyzing your request...",
      "Understanding your vibe...",
      "Mapping mood patterns...",
      "Curating the perfect playlist...",
      "Searching best matches..."
    ]);
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mood, 
          count, 
          language: lang, 
          apiKey: googleAiKey, 
          blacklist: globalSeenTitles.slice(0, 28), 
          userProfile: UserProfile.getProfileSummary()
        }),
        signal: abortControllerRef.current?.signal
      });

      if (!response.ok) {
        if (response.status === 401) {
          setIsGenerating(false);
          setIsFetching(false);
          onMissingKey?.();
          return;
        }
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Stream lost.");

      let cleanBuffer = "";
      let logBuffer = "";
      let hasReceivedFirstData = false;
      let sseBuffer = "";
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

      try {
        while (true) {
          if (activeSessionIdRef.current !== newVibeId) break;
          const { done, value } = await reader.read();
          if (done) {
            if (count >= 6 && removedKpopCountRef.current > Math.floor(count / 2)) {
              setIsContaminated(true);
              setIsGenerating(false);
              addLog("[FAULT] Major K-pop contamination detected. Session purged.");
            }
            break;
          }

          if (!hasReceivedFirstData) {
            hasReceivedFirstData = true;
            clearStatusLogs();
            addLog("[AI SYSTEM] Generating structured playlist...");
          }

          const chunk = new TextDecoder().decode(value, { stream: true });
          sseBuffer += chunk;
          const lines = sseBuffer.split('\n\n');
          sseBuffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.substring(6);
              let data;
              try { data = JSON.parse(dataStr); } catch(e) { continue; }
              
              if (data.log) {
                if (data.log.includes('AI MODEL')) {
                   logBuffer = ""; 
                }
                addLog(data.log);
                continue;
              }

              if (data.error) {
                setIsError(true);
                addLog(`[FAULT] ${data.error}`);
                feedback('error');
                break;
              }

              if (data.done) break;
              
              const content = data.content || "";
              cleanBuffer += content;
              logBuffer += content;

              if (logBuffer.includes(',') || logBuffer.includes('{') || logBuffer.includes('}') || logBuffer.includes(']')) {
                const parts = logBuffer.split(/(?=[{},])|(?<=[{},])/);
                const completeSegments = parts.slice(0, -1);
                
                for (const segment of completeSegments) {
                   const cleanSegment = segment.trim().replace(/\s+/g, ' ');
                   if (cleanSegment.length > 1 || ['{', '}', '[', ']'].includes(cleanSegment)) {
                     addLog(cleanSegment);
                   }
                }
                logBuffer = parts[parts.length - 1];
              }

              const parsed = extractJSON<any>(cleanBuffer);
              if (parsed && typeof parsed === 'object') {
                if (parsed.title) setAiDjResponse((prev: any) => ({ ...prev, title: parsed.title }));
                if (parsed.djMessage) setAiDjResponse((prev: any) => ({ ...prev, djMessage: parsed.djMessage }));
                if (parsed.tone) setAiDjResponse((prev: any) => ({ ...prev, tone: parsed.tone }));

                const items = Array.isArray(parsed) ? parsed : (parsed.songs || []);
                items.forEach((s: any) => {
                   const hash = getIdentityKey(s.title, s.artist);
                   if (s.title && s.artist && !sessionIdentityRegistry.current.has(hash)) {
                      sessionIdentityRegistry.current.add(hash);
                      
                      if (containsKpop(s.title) || containsKpop(s.artist)) {
                        removedKpopCountRef.current++;
                        addLog(`[KPOP FILTERED]: ${s.title}`);
                        return;
                      }

                      allSongsBufferRef.current.push({ ...s, s_id: generateSafeId() });
                   }
                });
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setIsError(true);
        addLog(`[FAULT] ${e.message}`);
        feedback('error');
      }
    } finally {
      if (activeSessionIdRef.current === newVibeId) setIsFetching(false);
      clearStatusLogs();
    }
  }, [googleAiKey, resetSession, onMissingKey, feedback, addLog, globalSeenTitles, startProgressiveLogs, clearStatusLogs, setAiDjResponse, setRequestedCount, setCurrentMood, setIsMajorBlocked, setIsContaminated, setIsError, resultsRef, activeSessionIdRef, allSongsBufferRef]);

  const handleSearchSpecific = useCallback(async (query: string, count: number) => {
    const generateSafeId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);
    const refinedQuery = `${query} song`;
    const searchStartTime = performance.now();
    
    if (containsKpop(query)) {
      setIsMajorBlocked(true);
      setCurrentMood(query);
      feedback('error');
      return;
    }

    const newVibeId = generateSafeId();
    resetSession(newVibeId);
    
    setCurrentVibeId(newVibeId);
    setCurrentMood(query);
    setRequestedCount(count);
    setSessionType('crawler');
    setIsGenerating(true);
    setIsFetching(true);
    feedback('click');

    UserProfile.trackEvent('SEARCH', query);

    startProgressiveLogs([
      "Launching discovery crawler...",
      "Scouring the sonic web...",
      "Filtering duplicates...",
      "Calibrating regional artifacts...",
      "Finalizing sonic flow..."
    ]);

    try {
      const blacklistHashes = globalSeenTitles.slice(0, 28).map(t => getIdentityKey(t, ""));

      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: refinedQuery, 
          count, 
          blacklistHashes
        }),
        signal: abortControllerRef.current?.signal
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Discovery link failed.");

      try {
        let crawlerBuffer = "";
        let hasReceivedFirstData = false;
        while (true) {
          const { done, value } = await reader.read();
          if (activeSessionIdRef.current !== newVibeId) break;
          if (done) {
            const searchEndTime = performance.now();
            const duration = ((searchEndTime - searchStartTime) / 1000).toFixed(1);
            addLog(`[SYSTEM] Target Acquired in ${duration}s`);
            
            if (count >= 6 && removedKpopCountRef.current > Math.floor(count / 2)) {
              setIsContaminated(true);
              setIsGenerating(false);
              addLog("[FAULT] Major K-pop contamination detected. Session purged.");
            }
            break;
          }

          if (!hasReceivedFirstData) {
            hasReceivedFirstData = true;
            clearStatusLogs();
            addLog("[SYSTEM] Receiving crawler results...");
          }

          const chunk = new TextDecoder().decode(value, { stream: true });
          crawlerBuffer += chunk;

          const lines = crawlerBuffer.split('\n\n');
          crawlerBuffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.substring(6));
              if (event.type === 'log') addLog(event.message);
              if (event.type === 'song') {
                const song = event.data;
                const identityHash = song.identityHash || getIdentityKey(song.title, song.artist);
                
                if (!sessionIdentityRegistry.current.has(identityHash)) {
                  sessionIdentityRegistry.current.add(identityHash);
                  
                  if (containsKpop(song.title) || containsKpop(song.artist)) {
                    removedKpopCountRef.current++;
                    addLog(`[KPOP FILTERED]: ${song.title}`);
                    continue;
                  }

                  allSongsBufferRef.current.push({ ...song, vibe: '🔍 Start Vibe', s_id: generateSafeId(), color: song.hue });
                  setVideoLinks((prev: any) => ({ ...prev, [song.title]: song }));
                }
              }
              if (event.type === 'error') {
                addLog(`[FAULT] ${event.message}`);
                setIsError(true);
              }
            } catch (e) {}
          }
        }
      } finally {
        if (activeSessionIdRef.current === newVibeId) {
          setIsFetching(false);
          reader.releaseLock();
          clearStatusLogs();
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setIsGenerating(false);
        setIsFetching(false);
        setIsError(true);
        addLog(`[FAULT] ${e.message}`);
        clearStatusLogs();
      }
    }
  }, [addLog, resetSession, feedback, globalSeenTitles, startProgressiveLogs, clearStatusLogs, setVideoLinks, setCurrentMood, setRequestedCount, setIsMajorBlocked, setIsContaminated, setIsError, activeSessionIdRef, allSongsBufferRef]);

  return {
    isGenerating,
    setIsGenerating,
    isFetching,
    sessionType,
    currentVibeId,
    setCurrentVibeId,
    typingTimerRef,
    isFetchingRef,
    resetSession,
    handleGenerate,
    handleSearchSpecific,
    addLog,
    startProgressiveLogs,
    clearStatusLogs
  };
};