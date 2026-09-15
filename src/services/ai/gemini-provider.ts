import { z } from 'zod';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import type {
  MusicIntent,
  RecommendationRequest,
  RecommendationResult,
} from '@/types/ai';
import type { SongCandidate } from '@/types/discovery';
import type { AiProvider } from './provider';
import { sanitizeIntent } from './intent';
import { sanitizeRecommendations } from './recommendations';

// --- Zod Schemas for Structured Output ---

export const MusicIntentSchema = z.object({
  query: z.string().describe('The original or normalized user query'),
  mode: z.enum([
    'mood',
    'activity',
    'genre',
    'artist',
    'language',
    'era',
    'similar',
    'search',
    'mixed',
  ]).describe('The primary classification mode for the music request'),
  mood: z.string().optional().describe('Emotional vibe or feel (e.g. energetic, melancholic, chill)'),
  activity: z.string().optional().describe('Associated activity (e.g. workout, coding, sleep, party)'),
  genres: z.array(z.string()).optional().describe('List of musical genres requested or implied'),
  artists: z.array(z.string()).optional().describe('Specific artists named or implied in the request'),
  languages: z.array(z.string()).optional().describe('Languages or regional linguistic descriptors (e.g. Hindi, English, Spanish)'),
  eras: z.array(z.string()).optional().describe('Decades or eras (e.g. 80s, 90s, 2010s)'),
  seedSongs: z.array(
    z.object({
      title: z.string(),
      artist: z.string(),
    })
  ).optional().describe('Specific song references to base the vibe on'),
  count: z.number().int().min(1).max(50).default(20).describe('Number of songs requested (default: 20)'),
});

export const SongCandidateSchema = z.object({
  title: z.string().min(1).describe('The official track title of the real song'),
  artist: z.string().min(1).describe('The primary performing artist or band name'),
  album: z.string().optional().describe('Album or EP title if known'),
  year: z.number().int().optional().describe('Release year if known'),
  language: z.string().optional().describe('Primary language of the track (e.g. Hindi, English)'),
  genre: z.string().optional().describe('Specific genre or subgenre'),
  mood: z.string().optional().describe('Vibe/mood keyword'),
  energy: z.number().min(1).max(10).optional().describe('Energy score from 1 (very calm/ambient) to 10 (extreme workout/festival)'),
});

export const RecommendationResponseSchema = z.object({
  candidates: z.array(SongCandidateSchema).describe('List of recommended real, recognizable songs'),
});

export type MusicIntentOutput = z.infer<typeof MusicIntentSchema>;
export type SongCandidateOutput = z.infer<typeof SongCandidateSchema>;
export type RecommendationResponseOutput = z.infer<typeof RecommendationResponseSchema>;

// --- Transport Client Interface & Genkit Implementation ---

export interface GeminiAiClient {
  generateStructured<T>(params: {
    systemPrompt: string;
    prompt: string;
    schema: unknown;
    temperature?: number;
    timeoutMs?: number;
    abortSignal?: AbortSignal;
  }): Promise<T>;
}

export const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'googleai/gemini-3.6-flash';
export const DEFAULT_AI_TIMEOUT_MS = 20000;

export interface GenkitGeminiClientOptions {
  apiKey?: string;
  model?: string;
  defaultTimeoutMs?: number;
}

// Module-level cache to avoid creating multiple redundant Genkit instances for the same key
const genkitInstanceMap = new Map<string, ReturnType<typeof genkit>>();

function getOrCreateGenkitInstance(apiKey: string): ReturnType<typeof genkit> {
  let instance = genkitInstanceMap.get(apiKey);
  if (!instance) {
    instance = genkit({
      plugins: [googleAI({ apiKey })],
    });
    genkitInstanceMap.set(apiKey, instance);
  }
  return instance;
}

export class GenkitGeminiClient implements GeminiAiClient {
  private readonly aiInstance: ReturnType<typeof genkit>;
  private readonly model: string;
  private readonly defaultTimeoutMs: number;

  constructor(options: GenkitGeminiClientOptions = {}) {
    const effectiveKey =
      options.apiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY;

    if (!effectiveKey) {
      throw new Error(
        'Gemini API key is required. Set GEMINI_API_KEY or GOOGLE_AI_API_KEY in server environment variables.',
      );
    }

    this.model = options.model || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
    this.defaultTimeoutMs = options.defaultTimeoutMs || DEFAULT_AI_TIMEOUT_MS;

    // Reuse singleton Genkit runtime instance per API key
    this.aiInstance = getOrCreateGenkitInstance(effectiveKey);
  }

  async generateStructured<T>(params: {
    systemPrompt: string;
    prompt: string;
    schema: unknown;
    temperature?: number;
    timeoutMs?: number;
    abortSignal?: AbortSignal;
  }): Promise<T> {
    const timeoutMs = params.timeoutMs ?? this.defaultTimeoutMs;

    // Active AbortController tied to timeout and optional caller abortSignal.
    // Genkit passes `abortSignal` through @genkit-ai/google-genai clientOptions
    // to the underlying fetch call (`signal: abortSignal`), achieving real cancellation.
    const controller = new AbortController();
    let isTimedOut = false;

    if (params.abortSignal) {
      if (params.abortSignal.aborted) {
        controller.abort();
      } else {
        params.abortSignal.addEventListener('abort', () => controller.abort(), { once: true });
      }
    }

    const timer = setTimeout(() => {
      isTimedOut = true;
      controller.abort();
    }, timeoutMs);

    if (typeof timer.unref === 'function') {
      timer.unref();
    }

    const maxRetries = 2;
    try {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const response = await this.aiInstance.generate({
            model: this.model,
            system: params.systemPrompt,
            prompt: params.prompt,
            output: { schema: params.schema as any },
            abortSignal: controller.signal,
            config: {
              temperature: params.temperature ?? 0.3,
              safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
              ],
            },
          });

          if (!response.output) {
            throw new Error('Gemini returned an empty structured output response.');
          }

          return response.output as T;
        } catch (err: unknown) {
          if (isTimedOut) {
            throw new Error(`Gemini request timed out after ${timeoutMs}ms.`);
          }
          if (params.abortSignal?.aborted) {
            throw new Error('Gemini request was cancelled by caller.');
          }
          const message = err instanceof Error ? err.message : String(err);
          const isTransient =
            message.includes('500') ||
            message.includes('503') ||
            message.includes('Internal error') ||
            message.includes('UNAVAILABLE');

          if (attempt < maxRetries && isTransient) {
            await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
            continue;
          }

          // If a non-3.6 model experienced high demand (503) or deprecation (404), attempt resilient fallback to 3.6-flash
          if (
            this.model !== 'googleai/gemini-3.6-flash' &&
            (message.includes('not available') ||
              message.includes('UNAVAILABLE') ||
              message.includes('503') ||
              message.includes('404'))
          ) {
            try {
              const fallbackResponse = await this.aiInstance.generate({
                model: 'googleai/gemini-3.6-flash',
                system: params.systemPrompt,
                prompt: params.prompt,
                output: { schema: params.schema as any },
                abortSignal: controller.signal,
                config: {
                  temperature: params.temperature ?? 0.3,
                },
              });
              if (fallbackResponse.output) {
                return fallbackResponse.output as T;
              }
            } catch {
              // preserve original error below
            }
          }

          throw new Error(`Gemini generation failed: ${message}`);
        }
      }
      throw new Error('Gemini generation failed unexpectedly.');
    } finally {
      clearTimeout(timer);
    }
  }
}

// Singleton instances for zero-configuration usage
let defaultClientInstance: GenkitGeminiClient | null = null;

export function getGenkitGeminiClient(options?: GenkitGeminiClientOptions): GenkitGeminiClient {
  const hasCustom = Boolean(options?.apiKey || options?.model || options?.defaultTimeoutMs);
  if (hasCustom) {
    return new GenkitGeminiClient(options);
  }
  if (!defaultClientInstance) {
    defaultClientInstance = new GenkitGeminiClient();
  }
  return defaultClientInstance;
}

// --- Prompt Generators ---

export function buildIntentSystemPrompt(): string {
  return `You are the core Music Intent Engine for PulsyVibe V2.
Your task is to analyze natural language user music queries and extract structured intent.

STRICT CLASSIFICATION RULES:
1. "mode" MUST be one of:
   - "mood": The query primarily describes an emotional state (e.g. "sad songs", "euphoric vibes", "chill evening").
   - "activity": The query describes an action/setting (e.g. "workout gym", "coding focus", "road trip", "party", "sleep").
   - "genre": The query specifies musical genres (e.g. "90s boom bap hip hop", "synthwave", "indie folk").
   - "artist": The query centers on a specific artist or band (e.g. "songs like The Weeknd", "best of Arijit Singh").
   - "language": The query specifies a language or regional identity (e.g. "punjabi hits", "french pop", "bhojpuri dance").
   - "era": The query specifies a time period (e.g. "80s synth", "2000s rock").
   - "similar": The query asks for music like a specific track or artist.
   - "search": A direct song or specific track search.
   - "mixed": A combination of multiple distinct dimensions (e.g. "15 energetic Hindi songs for a workout" has mood=energetic, language=Hindi, activity=workout).

2. "languages":
   - Explicitly capture languages (e.g. "Hindi", "Punjabi", "Spanish", "Korean", "English", "Bhojpuri", "Tamil", "Japanese").
   - If no language is specified or implied, leave empty or undefined.

3. "count":
   - Extract the exact requested number of songs if stated (e.g. "15 energetic Hindi songs" -> count: 15).
   - If not stated, default to 20 (clamped between 1 and 50).

4. DO NOT generate song tracks or video IDs in this step. Only extract the intent classification.`;
}

export function buildRecommendationSystemPrompt(): string {
  return `You are the master Music Recommendation Engine for PulsyVibe V2.
Your role is to recommend REAL, verifiable, officially released songs based on a structured MusicIntent.

CRITICAL ARCHITECTURAL CONSTRAINTS:
1. WHAT SONG ONLY:
   - You MUST recommend real songs by real artists with accurate titles and artist names.
   - NEVER provide YouTube video IDs, URLs, audio stream links, or guessed IDs.
   - The downstream discovery resolver handles all YouTube searches and resolution.

2. STRICT LANGUAGE & REGIONAL INTEGRITY:
   - If the intent specifies languages (e.g. "Hindi", "Punjabi", "Spanish", "Bhojpuri"), EVERY recommended track MUST belong to that language/region.
   - Do NOT contaminate single-language requests with random international or English pop hits unless requested.

3. QUALITY & RECOGNITION:
   - Recommend officially released, well-known studio tracks or notable singles.
   - Avoid obscure unreleased leaks, bootlegs, fan edits, and unofficial mashups.
   - Limit to a maximum of 2 songs per artist to ensure diverse curation.

4. ENERGY SCORE:
   - Assign an integer energy score from 1 (ambient/sleep) to 10 (peak rave/sprint workout).

5. VARIETY & FLOW:
   - Return exactly the requested count of unique songs.`;
}

// --- Provider Implementation ---

export interface GeminiAiProviderOptions extends GenkitGeminiClientOptions {
  client?: GeminiAiClient;
}

/**
 * Server-side Gemini AI Provider for PulsyVibe V2.
 *
 * Implements AiProvider (IntentEngine + RecommendationEngine).
 * - Converts natural-language queries into structured MusicIntent.
 * - Converts MusicIntent into structured SongCandidate[].
 * - Decoupled from YouTube resolution and playback.
 */
export class GeminiAiProvider implements AiProvider {
  private readonly client: GeminiAiClient;

  constructor(options: GeminiAiProviderOptions = {}) {
    this.client = options.client ?? getGenkitGeminiClient(options);
  }

  async parse(query: string): Promise<MusicIntent> {
    const trimmed = query.trim();
    if (!trimmed) {
      throw new Error('Query string cannot be empty.');
    }

    const rawIntent = await this.client.generateStructured<MusicIntent>({
      systemPrompt: buildIntentSystemPrompt(),
      prompt: `Analyze the following music query and return the structured music intent:\n"${trimmed}"`,
      schema: MusicIntentSchema,
      temperature: 0.1,
    });

    if (!rawIntent) {
      throw new Error('Failed to generate music intent from Gemini.');
    }

    return sanitizeIntent(rawIntent, trimmed);
  }

  async recommend(request: RecommendationRequest): Promise<RecommendationResult> {
    const targetCount = Math.min(
      Math.max(1, Math.floor(request.count ?? request.intent.count ?? 20)),
      50,
    );

    const intentSummary = JSON.stringify(
      {
        query: request.intent.query,
        mode: request.intent.mode,
        mood: request.intent.mood,
        activity: request.intent.activity,
        genres: request.intent.genres,
        artists: request.intent.artists,
        languages: request.intent.languages,
        eras: request.intent.eras,
        seedSongs: request.intent.seedSongs,
        count: targetCount,
      },
      null,
      2,
    );

    const rawResponse = await this.client.generateStructured<RecommendationResponseOutput | SongCandidate[]>({
      systemPrompt: buildRecommendationSystemPrompt(),
      prompt: `Generate exactly ${targetCount} real, recognizable song recommendations for this music intent:\n${intentSummary}`,
      schema: RecommendationResponseSchema,
      temperature: 0.7,
    });

    let candidatesList: SongCandidate[] = [];
    if (rawResponse && 'candidates' in rawResponse && Array.isArray(rawResponse.candidates)) {
      candidatesList = rawResponse.candidates;
    } else if (Array.isArray(rawResponse)) {
      candidatesList = rawResponse;
    } else {
      throw new Error('Failed to receive song candidates from Gemini recommendation engine.');
    }

    const rawResult: RecommendationResult = {
      candidates: candidatesList,
    };

    // Sanitize output through defensive boundary: deduplicates, caps, strips invalid records,
    // and NEVER fabricates missing songs if Gemini returns fewer candidates.
    return sanitizeRecommendations(rawResult, targetCount);
  }
}

let defaultProviderInstance: GeminiAiProvider | null = null;

export function getGeminiAiProvider(options?: GeminiAiProviderOptions): GeminiAiProvider {
  const hasCustom = Boolean(
    options?.client || options?.apiKey || options?.model || options?.defaultTimeoutMs,
  );
  if (hasCustom) {
    return new GeminiAiProvider(options);
  }
  if (!defaultProviderInstance) {
    defaultProviderInstance = new GeminiAiProvider();
  }
  return defaultProviderInstance;
}
