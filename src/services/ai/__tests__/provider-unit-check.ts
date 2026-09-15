import type { MusicIntent, RecommendationRequest, RecommendationResult } from '@/types/ai';
import type { AiProvider } from '@/services/ai/provider';
import { GeminiAiProvider } from '@/services/ai/gemini-provider';
import type { GeminiAiClient } from '@/services/ai/gemini-client';

// 1. Mock Client for Unit/Deterministic Testing
class MockGeminiClient implements GeminiAiClient {
  async generateStructured<T>(params: {
    systemPrompt: string;
    prompt: string;
    schema: any;
  }): Promise<T> {
    if (params.systemPrompt.includes('Intent Engine') || params.prompt.includes('music intent')) {
      return {
        query: '15 energetic Hindi songs for a workout',
        mode: 'mixed',
        mood: 'energetic',
        activity: 'workout',
        languages: ['Hindi'],
        count: 15,
      } as T;
    }

    if (params.systemPrompt.includes('Recommendation Engine') || params.prompt.includes('song recommendations')) {
      return {
        candidates: [
          {
            title: 'Zinda',
            artist: 'Siddharth Mahadevan',
            language: 'Hindi',
            genre: 'Rock',
            mood: 'energetic',
            energy: 9,
          },
          {
            title: 'Kar Har Maidaan Fateh',
            artist: 'Sukhwinder Singh, Shreya Ghoshal',
            language: 'Hindi',
            genre: 'Bollywood',
            mood: 'inspirational',
            energy: 8,
          },
          // Intentional duplicate to test sanitization
          {
            title: 'Zinda',
            artist: 'Siddharth Mahadevan',
            language: 'Hindi',
            genre: 'Rock',
          },
        ],
      } as T;
    }

    throw new Error('Unexpected prompt');
  }
}

async function runTests() {
  const mockClient = new MockGeminiClient();
  const provider: AiProvider = new GeminiAiProvider({ client: mockClient });

  // Test 1: Intent parsing
  const intent: MusicIntent = await provider.parse('15 energetic Hindi songs for a workout');
  if (intent.mode !== 'mixed' || intent.count !== 15 || intent.languages?.[0] !== 'Hindi') {
    throw new Error(`Intent parse test failed: ${JSON.stringify(intent)}`);
  }
  console.log('✓ Intent parse test passed:', intent);

  // Test 2: Recommendation generation + sanitization
  const req: RecommendationRequest = { intent, count: 15 };
  const result: RecommendationResult = await provider.recommend(req);

  if (result.candidates.length !== 2) {
    throw new Error(`Expected 2 deduplicated candidates, got: ${result.candidates.length}`);
  }

  const [c1, c2] = result.candidates;
  if (c1.title !== 'Zinda' || c2.title !== 'Kar Har Maidaan Fateh') {
    throw new Error(`Candidate titles mismatched: ${JSON.stringify(result.candidates)}`);
  }

  // Ensure no videoId or YouTube URLs leaked
  for (const candidate of result.candidates) {
    if ('videoId' in candidate || 'url' in candidate) {
      throw new Error(`Forbidden field found in candidate: ${JSON.stringify(candidate)}`);
    }
  }

  console.log('✓ Recommendation test passed:', result);
  console.log('ALL UNIT CHECKS PASSED');
}

runTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
