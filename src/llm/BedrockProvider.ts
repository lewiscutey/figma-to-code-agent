import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import type { LLMConfig, LLMMessage, LLMProvider, LLMResponse } from './types';

export class BedrockProvider implements LLMProvider {
  private client: BedrockRuntimeClient;

  constructor(private config: LLMConfig) {
    this.client = new BedrockRuntimeClient({ region: config.region || 'us-east-1' });
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const command = new InvokeModelCommand({
      modelId: this.config.model,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: this.config.maxTokens || 4096,
        temperature: this.config.temperature || 0.7,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    try {
      const response = await this.client.send(command);
      if (!response.body) {
        throw new Error('Bedrock returned empty response body');
      }

      const result = JSON.parse(new TextDecoder().decode(response.body));

      if (!result.content || !Array.isArray(result.content) || result.content.length === 0) {
        throw new Error('Bedrock returned empty content array');
      }

      return {
        content: result.content[0].text,
        usage: result.usage
          ? { inputTokens: result.usage.input_tokens, outputTokens: result.usage.output_tokens }
          : undefined,
      };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Bedrock')) {
        throw error;
      }
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Bedrock API error: ${msg}`);
    }
  }
}
