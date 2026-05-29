export interface LlmCompletionResult {
  output: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  finishReason: string | null;
  rawResponse: unknown;
}

export interface LlmCompletionOpts {
  model?: string;
  system?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LlmProvider {
  readonly name: string;
  isAvailable(): boolean;
  complete(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    opts: LlmCompletionOpts,
  ): Promise<LlmCompletionResult>;
}
