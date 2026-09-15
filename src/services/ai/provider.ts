import type {
  IntentEngine,
  MusicIntent,
  RecommendationEngine,
  RecommendationRequest,
  RecommendationResult,
} from '@/types/ai';

/**
 * Provider boundary for V2 AI.
 *
 * Google AI Studio/Genkit, or another model provider, plugs in here. The
 * discovery engine depends only on these contracts and remains provider-agnostic.
 */
export interface AiProvider extends IntentEngine, RecommendationEngine {}

export type IntentProvider = Pick<AiProvider, 'parse'>;
export type RecommendationProvider = Pick<AiProvider, 'recommend'>;

export class ProviderIntentEngine implements IntentEngine {
  constructor(private readonly provider: IntentProvider) {}

  parse(query: string): Promise<MusicIntent> {
    return this.provider.parse(query);
  }
}

export class ProviderRecommendationEngine implements RecommendationEngine {
  constructor(private readonly provider: RecommendationProvider) {}

  recommend(request: RecommendationRequest): Promise<RecommendationResult> {
    return this.provider.recommend(request);
  }
}

export {
  GeminiAiProvider,
  getGeminiAiProvider,
  GenkitGeminiClient,
  getGenkitGeminiClient,
} from './gemini-provider';

