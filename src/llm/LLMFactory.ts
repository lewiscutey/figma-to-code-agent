import type { LLMConfig, LLMProvider } from './types'
import { BedrockProvider } from './BedrockProvider'
import { OpenAIProvider } from './OpenAIProvider'

export class LLMFactory {
  static create(config: LLMConfig): LLMProvider {
    switch (config.provider) {
      case 'bedrock':
        return new BedrockProvider(config)
      case 'openai':
        return new OpenAIProvider(config)
      case 'anthropic':
        return new OpenAIProvider({ ...config, apiKey: config.apiKey })
      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`)
    }
  }
}
