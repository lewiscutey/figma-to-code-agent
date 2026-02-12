import type { GeneratedFile } from '../generation/types'
import type { LLMProvider } from '../llm/types'

export class AICodeOptimizer {
  constructor(private llm: LLMProvider) {}

  async optimize(files: GeneratedFile[]): Promise<GeneratedFile[]> {
    return Promise.all(
      files.map(async (file) => ({
        ...file,
        content: await this.optimizeCode(file.content, file.path),
      }))
    )
  }

  private async optimizeCode(code: string, filePath: string): Promise<string> {
    const response = await this.llm.chat([
      {
        role: 'system',
        content:
          'You are a code optimization expert. Improve code quality: remove redundancy, improve naming, add accessibility, optimize performance. Return ONLY the optimized code, no explanations.',
      },
      {
        role: 'user',
        content: `Optimize this ${filePath}:\n\`\`\`\n${code}\n\`\`\``,
      },
    ])

    return this.extractCode(response.content)
  }

  private extractCode(response: string): string {
    const match = response.match(/```(?:tsx?|vue)?\n([\s\S]*?)\n```/)
    return match ? match[1] : response
  }
}
