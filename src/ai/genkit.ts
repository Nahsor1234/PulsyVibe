import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * GENKIT INITIALIZATION
 * Transitioned to Google AI Studio for superior speed and stability.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY,
    }),
  ],
});
