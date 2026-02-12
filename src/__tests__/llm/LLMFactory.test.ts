import { LLMFactory } from '../../llm/LLMFactory'
import type { LLMConfig } from '../../llm/types'

describe('LLMFactory', () => {
  it('should create Bedrock provider', () => {
    const config: LLMConfig = {
      provider: 'bedrock',
      model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      region: 'us-east-1',
    }

    const provider = LLMFactory.create(config)
    expect(provider).toBeDefined()
  })

  it('should create OpenAI provider', () => {
    const config: LLMConfig = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-key',
    }

    const provider = LLMFactory.create(config)
    expect(provider).toBeDefined()
  })

  it('should throw error for unsupported provider', () => {
    const config = {
      provider: 'invalid',
      model: 'test',
    } as any

    expect(() => LLMFactory.create(config)).toThrow('Unsupported LLM provider')
  })
})
