import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import type { LLMConfig, LLMMessage, LLMProvider, LLMResponse } from './types'

export class BedrockProvider implements LLMProvider {
  private client: BedrockRuntimeClient

  constructor(private config: LLMConfig) {
    this.client = new BedrockRuntimeClient({ region: config.region || 'us-east-1' })
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
    })

    const response = await this.client.send(command)
    const result = JSON.parse(new TextDecoder().decode(response.body))

    return {
      content: result.content[0].text,
      usage: {
        inputTokens: result.usage.input_tokens,
        outputTokens: result.usage.output_tokens,
      },
    }
  }
}
