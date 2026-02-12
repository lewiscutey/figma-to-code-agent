import axios from 'axios';
import type { LLMConfig, LLMMessage, LLMProvider, LLMResponse } from './types';

export class OpenAIProvider implements LLMProvider {
  constructor(private config: LLMConfig) {}

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: this.config.model,
        messages,
        max_tokens: this.config.maxTokens || 4096,
        temperature: this.config.temperature || 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      content: response.data.choices[0].message.content,
      usage: {
        inputTokens: response.data.usage.prompt_tokens,
        outputTokens: response.data.usage.completion_tokens,
      },
    };
  }
}
