import type { ASTNode } from '../types';
import type { Transformer } from '../TransformationPipeline';
import type { LLMProvider } from '../../llm/types';

export class AISemanticNamer implements Transformer {
  name = 'AISemanticNamer';

  constructor(private llm: LLMProvider) {}

  async transform(node: ASTNode): Promise<ASTNode> {
    if (node.type === 'Component' || node.type === 'Container') {
      const name = await this.generateName(node);
      node.name = name;
    }

    if (node.children) {
      node.children = await Promise.all(node.children.map((child) => this.transform(child)));
    }

    return node;
  }

  private async generateName(node: ASTNode): Promise<string> {
    const context = this.buildContext(node);
    const response = await this.llm.chat([
      {
        role: 'system',
        content:
          'You are a UI component naming expert. Generate semantic, descriptive component names following React/Vue conventions. Return ONLY the component name, nothing else.',
      },
      {
        role: 'user',
        content: `Generate a component name for:\n${context}`,
      },
    ]);

    return response.content.trim().replace(/[^a-zA-Z0-9]/g, '');
  }

  private buildContext(node: ASTNode): string {
    const parts = [
      `Type: ${node.type}`,
      `Original name: ${node.name}`,
      `Layout: ${node.layout?.display || 'none'}`,
      `Children: ${node.children?.length || 0}`,
    ];

    if (node.children?.some((c: ASTNode) => c.type === 'Text')) {
      parts.push('Contains text');
    }
    if (node.children?.some((c: ASTNode) => c.type === 'Image')) {
      parts.push('Contains image');
    }

    return parts.join('\n');
  }
}
