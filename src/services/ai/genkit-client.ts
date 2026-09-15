import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import type { GeminiAiClient } from './gemini-client';

export const DEFAULT_GEMINI_MODEL = 'googleai/gemini-2.5-flash';
export const DEFAULT_AI_TIMEOUT_MS = 20000;

export interface GenkitGeminiClientOptions {
  apiKey?: string;
  model?: string;
  defaultTimeoutMs?: number;
}

/**
 * Server-side Gemini client powered by Genkit and Google GenAI plugin.
 * Strictly encapsulates Genkit SDK interaction and secret key management.
 */
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

    this.model = options.model || DEFAULT_GEMINI_MODEL;
    this.defaultTimeoutMs = options.defaultTimeoutMs || DEFAULT_AI_TIMEOUT_MS;

    this.aiInstance = genkit({
      plugins: [googleAI({ apiKey: effectiveKey })],
    });
  }

  async generateStructured<T>(params: {
    systemPrompt: string;
    prompt: string;
    schema: any;
    temperature?: number;
    timeoutMs?: number;
  }): Promise<T> {
    const timeoutMs = params.timeoutMs ?? this.defaultTimeoutMs;

    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Gemini request timed out after ${timeoutMs}ms.`));
      }, timeoutMs);
      if (typeof timer.unref === 'function') {
        timer.unref();
      }
    });

    const executionPromise = (async () => {
      try {
        const response = await this.aiInstance.generate({
          model: this.model,
          system: params.systemPrompt,
          prompt: params.prompt,
          output: { schema: params.schema },
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
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Gemini generation failed: ${message}`);
      }
    })();

    return Promise.race([executionPromise, timeoutPromise]);
  }
}
