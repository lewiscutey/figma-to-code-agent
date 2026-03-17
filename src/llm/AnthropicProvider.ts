import axios from 'axios';
import type { LLMConfig, LLMMessage, LLMProvider, LLMResponse } from './types';

export class AnthropicProvider implements LLMProvider {
  constructor(private config: LLMConfig) {
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const systemMessage = messages.find((m) => m.role === 'system');
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: this.config.model,
          max_tokens: this.config.maxTokens || 4096,
          temperature: this.config.temperature || 0.7,
          ...(systemMessage ? { system: systemMessage.content } : {}),
          messages: nonSystemMessages.map((m) => ({ role: m.role, content: m.content })),
        },
        {
          headers: {
            'x-api-key': this.config.apiKey!,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      const data = response.data;
      if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
        throw new Error('Anthropic API returned empty response');
      }

      return {
        content: data.content[0].text,
        usage: data.usage
          ? { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens }
          : undefined,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const msg = error.response?.data?.error?.message || error.message;
        if (status === 401) throw new Error(`Anthropic authentication failed: ${msg}`);
        if (status === 429) throw new Error(`Anthropic rate limit exceeded: ${msg}`);
        if (status === 529) throw new Error(`Anthropic API overloaded: ${msg}`);
        throw new Error(`Anthropic API error (${status}): ${msg}`);
      }
      throw error;
    }
  }
}
