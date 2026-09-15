export interface GeminiAiClient {
  generateStructured<T>(params: {
    systemPrompt: string;
    prompt: string;
    schema: unknown;
    temperature?: number;
    timeoutMs?: number;
  }): Promise<T>;
}
