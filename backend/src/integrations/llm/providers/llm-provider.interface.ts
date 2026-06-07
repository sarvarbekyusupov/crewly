export interface LlmCompletionResult {
  output: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  finishReason: string | null;
  rawResponse: unknown;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
}

export interface LlmCompletionOpts {
  model?: string;
  system?: string;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: { type: 'json_object' };
}

export interface LlmProvider {
  readonly name: string;
  isAvailable(): boolean;
  complete(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    opts: LlmCompletionOpts,
  ): Promise<LlmCompletionResult>;
}
