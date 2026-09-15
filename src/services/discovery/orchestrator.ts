import type { IntentEngine, RecommendationEngine } from '@/types/ai';
import type { SongCandidate, OrchestratedDiscoveryResult } from '@/types/discovery';
import type { TrackResolution } from '@/types/track';
import { parseMusicIntent } from '@/services/ai/intent';
import { getRecommendations } from '@/services/ai/recommendations';
import { getGeminiAiProvider } from '@/services/ai/provider';
import {
  SongDiscoveryService,
  createSongDiscoveryService,
  type SongDiscoveryOptions,
} from '@/services/resolution/song-discovery';
import { youtubeSearchClient } from '@/services/youtube/search';

export interface DiscoveryOrchestratorOptions {
  intentEngine?: IntentEngine;
  recommendationEngine?: RecommendationEngine;
  songDiscoveryService?: SongDiscoveryService;
}

export interface DiscoverOptions extends SongDiscoveryOptions {
  /**
   * Override the song count extracted from user intent.
   */
  count?: number;
}

/**
 * V2 Discovery Orchestrator
 *
 * Coordinates the full discovery pipeline:
 * 1. User Query
 * 2. IntentEngine -> MusicIntent
 * 3. RecommendationEngine -> SongCandidate[]
 * 4. SongDiscoveryService -> TrackResolution[]
 *
 * Provider-agnostic: relies on injected or default interfaces.
 */
export class DiscoveryOrchestrator {
  private readonly intentEngine: IntentEngine;
  private readonly recommendationEngine: RecommendationEngine;
  private readonly songDiscoveryService: SongDiscoveryService;

  constructor(options: DiscoveryOrchestratorOptions = {}) {
    const defaultAi = !options.intentEngine || !options.recommendationEngine
      ? getGeminiAiProvider()
      : null;

    this.intentEngine = options.intentEngine ?? defaultAi!;
    this.recommendationEngine = options.recommendationEngine ?? defaultAi!;
    this.songDiscoveryService = options.songDiscoveryService ?? createSongDiscoveryService(youtubeSearchClient);
  }

  /**
   * Discovers and resolves verified tracks for a natural-language query.
   */
  async discover(
    query: string,
    options: DiscoverOptions = {},
  ): Promise<OrchestratedDiscoveryResult> {
    const trimmedQuery = query?.trim();
    if (!trimmedQuery) {
      throw new Error('Discovery query cannot be empty.');
    }

    // Step 1: Parse intent from natural language query
    const intent = await parseMusicIntent(this.intentEngine, trimmedQuery);

    // Step 2: Generate canonical song candidates using recommendation engine
    const requestedCount = options.count ?? intent.count;
    const recommendationResult = await getRecommendations(this.recommendationEngine, {
      intent,
      count: requestedCount,
    });

    const recommendations: SongCandidate[] = recommendationResult.candidates;

    // Step 3: If no candidates were recommended, return early with empty results
    if (recommendations.length === 0) {
      return {
        query: trimmedQuery,
        intent,
        recommendations: [],
        results: [],
      };
    }

    // Step 4: Resolve candidates to verified tracks via SongDiscoveryService
    // Preserve partial resolutions and status (verified vs unavailable) honestly
    const results: TrackResolution[] = await this.songDiscoveryService.resolve(
      recommendations,
      options,
    );

    return {
      query: trimmedQuery,
      intent,
      recommendations,
      results,
    };
  }
}

/**
 * Factory helper for creating DiscoveryOrchestrator instances.
 */
export function createDiscoveryOrchestrator(
  options?: DiscoveryOrchestratorOptions,
): DiscoveryOrchestrator {
  return new DiscoveryOrchestrator(options);
}
