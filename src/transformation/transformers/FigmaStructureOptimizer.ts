import type { ASTNode } from '../types';
import type { Transformer } from '../TransformationPipeline';

/**
 * Optimize AST structure while preserving Figma layer hierarchy
 * - Remove only truly invisible/empty nodes
 * - Keep meaningful layer names
 * - Preserve semantic structure
 */
export class FigmaStructureOptimizer implements Transformer {
  name = 'figma-structure-optimizer';

  transform(node: ASTNode): ASTNode {
    const optimized = this.optimizeNode(node);
    // Root node should never be null
    return optimized || node;
  }

  private optimizeNode(node: ASTNode): ASTNode | null {
    // Remove invisible nodes
    if (this.isInvisible(node)) {
      return null;
    }

    // Recursively optimize children
    const optimizedChildren = node.children
      .map((child) => this.optimizeNode(child))
      .filter((child): child is ASTNode => child !== null);

    // Remove empty containers without visual properties
    if (this.isEmptyContainer(node, optimizedChildren)) {
      return null;
    }

    return {
      ...node,
      children: optimizedChildren,
    };
  }

  private isInvisible(node: ASTNode): boolean {
    // Only remove if truly invisible
    if (node.styles.opacity === 0) return true;
    if (node.layout.size.width === 0 && node.layout.size.height === 0) return true;
    return false;
  }

  private isEmptyContainer(node: ASTNode, children: ASTNode[]): boolean {
    // Don't remove if has children
    if (children.length > 0) return false;

    // Don't remove if has visual styles
    if (node.styles.backgroundColor) return false;
    if (node.styles.border) return false;
    if (node.styles.borderRadius) return false;
    if (node.styles.boxShadow && node.styles.boxShadow.length > 0) return false;

    // Don't remove if it's an image or text
    if (node.type === 'Image' || node.type === 'Text') return false;

    return true;
  }
}
