import type { LLMConfig, LLMProvider } from './types';
import { AnthropicProvider } from './AnthropicProvider';
import { BedrockProvider } from './BedrockProvider';
import { OpenAIProvider } from './OpenAIProvider';

export class LLMFactory {
  static create(config: LLMConfig): LLMProvider {
    if (!config.provider) {
      throw new Error('LLM provider is required');
    }
    if (!config.model) {
      throw new Error('LLM model name is required');
    }

    switch (config.provider) {
      case 'bedrock':
        return new BedrockProvider(config);
      case 'openai':
        if (!config.apiKey) {
          throw new Error('OpenAI API key is required');
        }
        return new OpenAIProvider(config);
      case 'anthropic':
        if (!config.apiKey) {
          throw new Error('Anthropic API key is required');
        }
        return new AnthropicProvider(config);
      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}. Supported: bedrock, openai, anthropic`);
    }
  }
}
