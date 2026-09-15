'use server';

/**
 * @fileOverview High-Resilience Gemini Synthesis Engine (AI DJ Optimized).
 * Implements structured narrative deconstruction and personality-driven curation.
 */

import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { MOOD_EXPERT_MAP } from '@/lib/mood-expert-map';

const SongSchema = z.object({
  title: z.string(),
  artist: z.string(),
  energy: z.enum(['low', 'build', 'peak']).describe('The energy level of the track.'),
  vibe: z.string().describe('Mood category matching the emotional texture.'),
  color: z.number().describe('Hue value (0-360).'),
});

const DJResponseSchema = z.object({
  title: z.string().describe('A "POV:" style title for the journey (6-10 words).'),
  djMessage: z.string().describe('A short, 1-3 line expressive message in character.'),
  tone: z.enum(['emotional', 'calm', 'savage', 'motivational']).describe('The personality tone for this session.'),
  songs: z.array(SongSchema),
});

export type SongResult = z.infer<typeof SongSchema>;
export type DJResponse = z.infer<typeof DJResponseSchema>;

const SYSTEM_INSTRUCTIONS = (mood: string, count: number, language: string, exclude: string, blacklistBlock: string) => `
You are a professional music curator for a streaming app.
Generate a playlist of REAL, popular, and easily searchable songs for: "${mood}".

STRICT REGION/LANGUAGE ENFORCEMENT: 
If a specific region or language is requested (Current request: "${language || 'Global'}"), you MUST generate songs ONLY from that specific region or language. DO NOT mix with other languages or generic international hits unless specifically asked for a mix.

RULES:
- Use only well-known songs and artists.
- Prefer official releases and widely available tracks.
- Ensure songs are easily found on YouTube.
- Avoid obscure versions, fan edits, and rare remixes.
- Follow the quantity of tracks given: ${count}.
- Strictly EXCLUDE: ${exclude}, K-Pop, BTS, BLACKPINK, SB19.

QUALITY:
- Clear title and artist.
- High probability of official video/audio availability.

CONSISTENCY:
- Match the requested vibe.
- Maintain energy flow (build → peak → cooldown).

ANTI-REPETITION:
${blacklistBlock}

OUTPUT: JSON only. No preamble.`;

export async function generateSongList(input: { 
  mood: string, 
  count: number, 
  language?: string, 
  apiKey?: string,
  blacklist?: string[] 
}): Promise<DJResponse> {
  const effectiveKey = input.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  // Initialize fresh genkit instance with the provided key
  const ai = genkit({
    plugins: [googleAI({ apiKey: effectiveKey })]
  });

  const lowerMood = input.mood.toLowerCase();
  let lookupKey = Object.keys(MOOD_EXPERT_MAP).find(key => lowerMood.includes(key));
  let exclude = "None specified.";
  if (lookupKey && MOOD_EXPERT_MAP[lookupKey]) {
    exclude = MOOD_EXPERT_MAP[lookupKey].exclude;
  }

  const blacklistBlock = input.blacklist && input.blacklist.length > 0 
    ? `Avoid these songs:\n${input.blacklist.slice(0, 25).join('\n')}`
    : 'None specified.';

  // Use stable 3.5 Flash as the primary for flows
  const modelToUse = process.env.GEMINI_MODEL || 'googleai/gemini-3.5-flash';
  const { output } = await ai.generate({
    model: modelToUse,
    system: SYSTEM_INSTRUCTIONS(input.mood, input.count, input.language || 'Global', exclude, blacklistBlock),
    prompt: `Sync Deep Intent Journey: "${input.mood}"`,
    output: { schema: DJResponseSchema },
    config: { 
      temperature: 0.85,
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
      ]
    }
  });

  if (!output) throw new Error("Synthesis failed.");
  return output;
}
