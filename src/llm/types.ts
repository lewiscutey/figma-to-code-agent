export interface LLMConfig {
  provider: 'bedrock' | 'openai' | 'anthropic'
  model: string
  region?: string
  apiKey?: string
  maxTokens?: number
  temperature?: number
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMResponse {
  content: string
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

export interface LLMProvider {
  chat(messages: LLMMessage[]): Promise<LLMResponse>
}
