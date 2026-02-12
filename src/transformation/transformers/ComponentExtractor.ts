import type { ASTNode } from '../types';
import type { Transformer } from '../TransformationPipeline';

/**
 * Extract reusable components from the AST
 * Identifies repeated patterns and marks them as components
 */
export class ComponentExtractor implements Transformer {
  name = 'component-extractor';
  private componentMap = new Map<string, ASTNode[]>();

  transform(node: ASTNode): ASTNode {
    // First pass: collect potential components
    this.collectComponents(node);

    // Second pass: mark repeated patterns as components
    return this.markComponents(node);
  }

  private collectComponents(node: ASTNode): void {
    // Skip if already a component
    if (node.metadata.isComponent) {
      return;
    }

    // Generate a signature for this node
    const signature = this.generateSignature(node);

    // Add to component map
    if (!this.componentMap.has(signature)) {
      this.componentMap.set(signature, []);
    }
    this.componentMap.get(signature)!.push(node);

    // Recursively collect from children
    node.children.forEach((child) => this.collectComponents(child));
  }

  private markComponents(node: ASTNode): ASTNode {
    const signature = this.generateSignature(node);
    const instances = this.componentMap.get(signature) || [];

    // Mark as component if repeated (appears more than once)
    // But NEVER convert Text, Image, or Shape nodes to Component
    if (
      instances.length > 1 &&
      !node.metadata.isComponent &&
      node.type !== 'Text' &&
      node.type !== 'Image' &&
      node.type !== 'Shape'
    ) {
      return {
        ...node,
        type: 'Component',
        metadata: {
          ...node.metadata,
          isComponent: true,
          componentName: this.generateComponentName(node),
        },
        children: node.children.map((child) => this.markComponents(child)),
      };
    }

    // Recursively process children
    return {
      ...node,
      children: node.children.map((child) => this.markComponents(child)),
    };
  }

  private generateSignature(node: ASTNode): string {
    // Generate a signature based on structure and styles
    const parts = [
      node.type,
      node.children.length.toString(),
      node.layout.display,
      JSON.stringify(node.styles.backgroundColor),
      node.styles.borderRadius?.toString() || '',
    ];

    return parts.join('|');
  }

  private generateComponentName(node: ASTNode): string {
    // Generate a meaningful component name
    if (node.name && node.name !== 'Frame' && node.name !== 'Group') {
      return node.name;
    }

    // Generate based on type
    switch (node.type) {
      case 'Text':
        return 'TextComponent';
      case 'Image':
        return 'ImageComponent';
      case 'Shape':
        return 'ShapeComponent';
      default:
        return 'Component';
    }
  }
}
