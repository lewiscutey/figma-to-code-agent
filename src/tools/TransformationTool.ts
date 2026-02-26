import { TransformationPipeline } from '../transformation/TransformationPipeline';
import type { ASTNode } from '../transformation/types';
import type { Tool, ToolMetadata } from './types';

/**
 * AST 转换工具
 * 封装 TransformationPipeline
 */
export class TransformationTool implements Tool {
  name = 'transformation';
  description = 'Transform and optimize AST nodes';
  category = 'transformation' as const;
  capabilities = ['optimize_layout', 'extract_components', 'enhance_accessibility'];

  constructor(private pipeline: TransformationPipeline) {}

  /**
   * 检查工具是否可用
   */
  async isAvailable(): Promise<boolean> {
    return true;
  }

  /**
   * 执行工具
   */
  async execute(inputs: { node: ASTNode }): Promise<ASTNode> {
    const { node } = inputs;

    if (!node) {
      throw new Error('AST node is required');
    }

    return await this.pipeline.execute(node);
  }

  /**
   * 获取工具元数据
   */
  getMetadata(): ToolMetadata {
    return {
      version: '1.0.0',
      author: 'Figma-to-Code Agent',
      performance: {
        avgDuration: 500, // 平均 500ms
        reliability: 0.98,
      },
      cost: {
        apiCallsPerExecution: 0, // 不需要 API 调用
      },
    };
  }
}
