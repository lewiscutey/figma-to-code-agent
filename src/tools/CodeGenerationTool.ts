import { ReactGenerator } from '../generation/ReactGenerator';
import { VueGenerator } from '../generation/VueGenerator';
import type { ASTNode } from '../transformation/types';
import type { GeneratorConfig, GeneratedFile } from '../generation/types';
import type { Tool, ToolMetadata } from './types';

/**
 * 代码生成工具
 * 封装 ReactGenerator 和 VueGenerator
 */
export class CodeGenerationTool implements Tool {
  name = 'code-generation';
  description = 'Generate React or Vue code from AST';
  category = 'generation' as const;
  capabilities = ['generate_react', 'generate_vue', 'generate_components'];

  private reactGenerator: ReactGenerator;
  private vueGenerator: VueGenerator;

  constructor() {
    this.reactGenerator = new ReactGenerator();
    this.vueGenerator = new VueGenerator();
  }

  /**
   * 检查工具是否可用
   */
  async isAvailable(): Promise<boolean> {
    return true;
  }

  /**
   * 执行工具
   */
  async execute(inputs: {
    node: ASTNode;
    config: GeneratorConfig;
  }): Promise<GeneratedFile[]> {
    const { node, config } = inputs;

    if (!node) {
      throw new Error('AST node is required');
    }

    if (!config) {
      throw new Error('Generator config is required');
    }

    // 根据框架选择生成器
    const framework = config.framework || 'react';

    if (framework === 'vue') {
      return this.vueGenerator.generate(node, config);
    } else {
      return this.reactGenerator.generate(node, config);
    }
  }

  /**
   * 获取工具元数据
   */
  getMetadata(): ToolMetadata {
    return {
      version: '1.0.0',
      author: 'Figma-to-Code Agent',
      performance: {
        avgDuration: 1000, // 平均 1 秒
        reliability: 0.95,
      },
      cost: {
        apiCallsPerExecution: 0, // 不需要 API 调用
      },
    };
  }
}
