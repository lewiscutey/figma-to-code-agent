import type { ASTNode } from '../types';
import type { Transformer } from '../TransformationPipeline';

/**
 * Generate semantic names for components
 */
export class SemanticNamer implements Transformer {
  name = 'semantic-namer';

  transform(node: ASTNode): ASTNode {
    return this.renameNode(node);
  }

  private renameNode(node: ASTNode): ASTNode {
    const semanticName = this.generateSemanticName(node);

    return {
      ...node,
      name: semanticName,
      children: node.children.map((child) => this.renameNode(child)),
    };
  }

  private generateSemanticName(node: ASTNode): string {
    // Text nodes: use a short descriptive name, not the full text content
    if (node.type === 'Text') {
      // Take first few words of the text content or node name for a short label
      const text = node.metadata.textContent || node.name || 'text';
      const words = text
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim()
        .split(/\s+/)
        .slice(0, 3)
        .join(' ');
      return words ? this.toCamelCase(words) : 'text';
    }

    if (node.type === 'Image') {
      // Shorten image names
      const name = node.name || 'image';
      const short = name
        .split(/[\s_-]+/)
        .slice(0, 3)
        .join(' ');
      return this.toCamelCase(short) || 'image';
    }

    // Keep existing meaningful names
    if (this.isMeaningfulName(node.name)) {
      return this.toCamelCase(node.name);
    }

    if (node.type === 'Component' && node.metadata.componentName) {
      return this.toCamelCase(node.metadata.componentName);
    }

    if (node.layout.display === 'flex') {
      return node.layout.flexDirection === 'row' ? 'row' : 'column';
    }

    return 'container';
  }

  private isMeaningfulName(name: string): boolean {
    const genericNames = ['frame', 'group', 'container', 'rectangle', 'ellipse', 'vector'];
    return !genericNames.includes(name.toLowerCase());
  }

  private toCamelCase(str: string): string {
    return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
  }
}
