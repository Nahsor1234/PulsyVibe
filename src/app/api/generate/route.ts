import { NextResponse } from 'next/server';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { MOOD_EXPERT_MAP } from '@/lib/mood-expert-map';
import { GLOBAL_KPOP_KEYWORDS } from '@/lib/kpop-filter';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * VERCEL OPTIMIZED MODEL PRIORITY
 * Prioritizing Lite models for maximum speed and serverless safety.
 */
const GEMINI_MODEL_POOL = [
  'googleai/gemini-2.5-flash-lite',
  'googleai/gemini-3.1-flash-lite',
  'googleai/gemini-2.5-flash',
  'googleai/gemini-2.5-pro',
];

const getFallbackPayload = (mood: string) => ({
  title: `Deep Vibe: ${mood}`,
  djMessage: "The high-end neural link is slow, but I've secured your frequency. 😮‍谷🔥",
  tone: "savage",
  songs: [
    { title: "Blinding Lights", artist: "The Weeknd", energy: "peak", vibe: "Synthwave", color: 280 },
    { title: "Starboy", artist: "The Weeknd", energy: "build", vibe: "Dark Pop", color: 320 },
    { title: "One Dance", artist: "Drake", energy: "low", vibe: "Dance", color: 45 },
  ]
});

let cachedAi: any = null;
let cachedKey: string | null = null;

// Eagerly warm Genkit at module load
const initialServerKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
if (initialServerKey) {
  try {
    cachedAi = genkit({ plugins: [googleAI({ apiKey: initialServerKey }) ]});
    cachedKey = initialServerKey;
  } catch (e) {}
}

function getAiInstance(apiKey: string) {
  if (cachedAi && cachedKey === apiKey) return cachedAi;
  cachedAi = genkit({ plugins: [googleAI({ apiKey })] });
  cachedKey = apiKey;
  return cachedAi;
}

function detectLanguageRule(input: string, region?: string): { songRule: string, outputLang: string } {
  const combined = (input + ' ' + (region || '')).toLowerCase();
  
  if (combined.includes('bhojpuri')) {
    return {
      songRule: "STRICT RULE: ONLY Bhojpuri songs. DO NOT include Hindi tracks. Every track must be natively Bhojpuri.",
      outputLang: "Bhojpuri"
    };
  }
  
  const indianKeywords = ['hindi', 'punjabi', 'tamil', 'telugu', 'india', 'desi', 'bollywood', 'kannada', 'malayalam', 'marathi', 'bengali'];
  if (indianKeywords.some(k => combined.includes(k))) {
    const lang = combined.includes('punjabi') ? 'Punjabi' : combined.includes('tamil') ? 'Tamil' : combined.includes('telugu') ? 'Telugu' : 'Hindi';
    return {
      songRule: `STRICT RULE: ONLY Indian/Desi music. Language: ${lang}. DO NOT mix with English hits.`,
      outputLang: "Hindi"
    };
  }
  
  return {
    songRule: "STRICT RULE: GLOBAL hits only. Language: English.",
    outputLang: "English"
  };
}

export async function POST(req: Request) {
  try {
    const { mood, count, language, apiKey, blacklist, userProfile } = await req.json();
    const effectiveApiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

    if (!effectiveApiKey) {
      return NextResponse.json({ error: 'API Key required.' }, { status: 401 });
    }

    const ai = getAiInstance(effectiveApiKey);
    const langRules = detectLanguageRule(mood, language);
    const lowerMood = mood.toLowerCase();
    const lookupKey = Object.keys(MOOD_EXPERT_MAP).find(key => lowerMood.includes(key));
    const expertExclude = lookupKey ? MOOD_EXPERT_MAP[lookupKey].exclude : "None.";
    const totalExclusions = [...new Set([...expertExclude.split(', '), ...GLOBAL_KPOP_KEYWORDS, "BTS", "BLACKPINK", "SB19"])].join(', ');
    
    const blacklistBlock = Array.isArray(blacklist) && blacklist.length > 0 
      ? `STRICT RULE (TOP PRIORITY):
Avoid ALL of these songs:
${blacklist.slice(0, 28).join(', ')}

- Case-insensitive match
- Ignore extra text (artist, remix, etc.)
- Treat variations as same
- Replace with similar vibe
- Never reuse` 
      : '';

    /**
     * OPTIMIZED SYSTEM PROMPT
     */
    const systemPrompt = `${blacklistBlock}

DJ RULES:
- Output ONLY valid JSON. No markdown, no explanation, no extra text.
- Generate exactly ${count || 12} REAL, YouTube-searchable songs for: "${mood}"
- MUST be official songs/tracks only. Strictly NO movies, NO trailers, NO clips, NO documentaries.
- Max 2 songs per artist. No filler, no obscure tracks — real recognizable songs only.
- Songs MUST follow this language rule: ${langRules.songRule}
- Tone is determined by the mood — do NOT default to savage every time:
    emotional → heartfelt, reflective
    calm      → mellow, smooth
    hype/gym  → savage, aggressive
    party     → energetic, fun
    default   → confident, curated
${userProfile ? `- User taste signals (use as style reference, not strict filter): ${userProfile}` : ''}

SONG SEQUENCING — order songs intentionally:
  First 2-3: low energy (ease in)
  Middle:    build energy (rising)
  Last 2-3:  peak energy (climax) — or reverse for wind-down moods

COLOR GUIDE — set "color" as HSL hue matching the song's feel:
  energetic/hype    → 0–40   (red/orange)
  warm/happy        → 41–70  (yellow/gold)
  fresh/upbeat      → 71–150 (green)
  calm/melancholic  → 151–220 (teal/blue)
  dark/mysterious   → 221–280 (indigo/purple)
  romantic/dreamy   → 281–360 (pink/magenta)

OUTPUT FORMAT (title and djMessage in ${langRules.outputLang}):
{
  "title": "6-8 word POV title capturing the exact mood",
  "djMessage": "1 punchy sentence + 1-2 emojis, matches the tone above",
  "tone": "emotional|calm|savage|motivational",
  "songs": [
    {"title": "Song Name", "artist": "Artist Name", "energy": "low|build|peak", "vibe": "2-word genre label", "color": 0-360}
  ]
}

EXCLUDE ALWAYS: ${totalExclusions}`;

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        const send = (data: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        let success = false;

        for (const modelId of GEMINI_MODEL_POOL) {
          try {
            send({ log: `[AI MODEL]: ${modelId.split('/').pop()}` });
            
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error("AI_TIMEOUT")), 8000)
            );

            const streamPromise = ai.generateStream({
              model: modelId,
              system: systemPrompt,
              prompt: `Sync Journey: "${mood}"`,
              config: { temperature: 0.8 }
            });

            const result = await Promise.race([streamPromise, timeoutPromise]) as any;
            const { stream } = result;

            send({ log: `[AI STREAM START]` });
            let chunkCount = 0;
            for await (const chunk of stream) {
              if (chunk.text) {
                chunkCount++;
                send({ content: chunk.text });
              }
            }
            
            if (chunkCount > 0) {
              success = true;
              break; 
            }
          } catch (e: any) {
            send({ log: `[AI ERROR]: Model failed or timed out.` });
          }
        }

        if (!success) {
          send({ log: `[AI SYSTEM]: Using high-fidelity fallback.` });
          send({ content: JSON.stringify(getFallbackPayload(mood)) });
        }
        
        send({ done: true });
        controller.close();
      }
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
