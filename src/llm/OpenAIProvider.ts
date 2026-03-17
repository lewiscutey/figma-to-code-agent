import axios from 'axios';
import type { LLMConfig, LLMMessage, LLMProvider, LLMResponse } from './types';

export class OpenAIProvider implements LLMProvider {
  constructor(private config: LLMConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    try {
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
          timeout: 60000,
        }
      );

      const data = response.data;
      if (!data.choices || data.choices.length === 0) {
        throw new Error('OpenAI API returned empty response');
      }

      return {
        content: data.choices[0].message.content,
        usage: data.usage
          ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens }
          : undefined,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const msg = error.response?.data?.error?.message || error.message;
        if (status === 401) throw new Error(`OpenAI authentication failed: ${msg}`);
        if (status === 429) throw new Error(`OpenAI rate limit exceeded: ${msg}`);
        throw new Error(`OpenAI API error (${status}): ${msg}`);
      }
      throw error;
    }
  }
}
