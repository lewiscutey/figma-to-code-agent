import { FigmaToCodeAgent } from '../FigmaToCodeAgent'
import type { AgentConfig } from '../FigmaToCodeAgent'

describe('FigmaToCodeAgent', () => {
  let config: AgentConfig

  beforeEach(() => {
    config = {
      figmaToken: 'test-token',
      fileKey: 'test-file-key',
      framework: 'react',
      styleMode: 'css-modules',
      typescript: true,
      outputDir: 'src/components',
    }
  })

  it('should create agent with config', () => {
    const agent = new FigmaToCodeAgent(config)

    expect(agent).toBeDefined()
  })

  it('should support React framework', () => {
    config.framework = 'react'
    const agent = new FigmaToCodeAgent(config)

    expect(agent).toBeDefined()
  })

  it('should support Vue framework', () => {
    config.framework = 'vue'
    const agent = new FigmaToCodeAgent(config)

    expect(agent).toBeDefined()
  })
})
