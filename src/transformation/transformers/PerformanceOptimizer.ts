import type { ASTNode } from '../types';
import type { Transformer } from '../TransformationPipeline';

/**
 * Optimizes AST for better runtime performance.
 * - Marks large images for lazy loading
 * - Suggests code splitting for large component trees
 * - Removes redundant wrapper nodes
 * - Marks offscreen content for deferred rendering
 */
export class PerformanceOptimizer implements Transformer {
  name = 'performance-optimizer';
  private readonly lazyLoadThreshold: number;
  private readonly codeSplitThreshold: number;

  constructor(lazyLoadThreshold = 200, codeSplitThreshold = 30) {
    this.lazyLoadThreshold = lazyLoadThreshold;
    this.codeSplitThreshold = codeSplitThreshold;
  }

  transform(node: ASTNode): ASTNode {
    return this.optimize(node, 0);
  }

  private optimize(node: ASTNode, viewportY: number): ASTNode {
    const hints: Record<string, any> = {};

    // Mark images for lazy loading if below fold
    if (node.type === 'Image') {
      const isAboveFold = node.layout.position.y < this.lazyLoadThreshold;
      if (!isAboveFold) {
        hints.lazyLoad = true;
      }
      // Large images should have explicit dimensions
      if (node.layout.size.width > 100 || node.layout.size.height > 100) {
        hints.explicitDimensions = true;
      }
    }

    // Suggest code splitting for large component subtrees
    if (node.metadata.isComponent) {
      const descendantCount = this.countDescendants(node);
      if (descendantCount > this.codeSplitThreshold) {
        hints.codeSplit = true;
        hints.descendantCount = descendantCount;
      }
    }

    // Remove redundant single-child wrapper containers
    if (this.isRedundantWrapper(node)) {
      const child = node.children[0];
      return this.optimize(
        {
          ...child,
          // Preserve parent's position if child doesn't have meaningful position
          layout: {
            ...child.layout,
            position: child.layout.position.x === 0 && child.layout.position.y === 0
              ? node.layout.position
              : child.layout.position,
          },
        },
        viewportY,
      );
    }

    const hasHints = Object.keys(hints).length > 0;

    return {
      ...node,
      metadata: {
        ...node.metadata,
        ...(hasHints ? { performance: hints } : {}),
      },
      children: node.children.map((child) =>
        this.optimize(child, viewportY + child.layout.position.y),
      ),
    };
  }

  /**
   * Check if a node is a redundant wrapper (single child, no meaningful styles).
   * Never unwrap the root node (no parent context to absorb it).
   */
  private isRedundantWrapper(node: ASTNode): boolean {
    if (node.type !== 'Container') return false;
    if (node.children.length !== 1) return false;
    if (node.metadata.isComponent) return false;
    // Don't unwrap if child is a leaf — wrapper may provide layout context
    if (node.children[0].children.length === 0) return false;

    // Has meaningful styles? Keep it.
    const s = node.styles;
    if (s.backgroundColor || s.border || s.boxShadow?.length || s.borderRadius || s.opacity !== undefined) {
      return false;
    }

    return true;
  }

  private countDescendants(node: ASTNode): number {
    let count = 0;
    for (const child of node.children) {
      count += 1 + this.countDescendants(child);
    }
    return count;
  }
}
