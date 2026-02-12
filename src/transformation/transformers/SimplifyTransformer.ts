import type { ASTNode } from '../types';
import type { Transformer } from '../TransformationPipeline';

/**
 * Aggressively simplify the AST by:
 * 1. Removing empty/invisible nodes
 * 2. Merging single-child containers
 * 3. Converting decorative shapes to CSS
 * 4. Flattening unnecessary nesting
 */
export class SimplifyTransformer implements Transformer {
  name = 'simplify';

  transform(node: ASTNode): ASTNode {
    return this.simplifyNode(node);
  }

  private simplifyNode(node: ASTNode): ASTNode {
    // Remove invisible nodes
    if (this.isInvisible(node)) {
      return null as any;
    }

    // Recursively simplify children and filter out nulls
    let children = node.children
      .map((child) => this.simplifyNode(child))
      .filter((child) => child !== null);

    // Remove empty containers
    if (this.isEmptyContainer(node, children)) {
      return null as any;
    }

    // Merge single-child containers without meaningful properties
    if (this.shouldMergeWithChild(node, children)) {
      const child = children[0];
      // Merge styles and layout from parent to child
      return {
        ...child,
        styles: this.mergeStyles(node.styles, child.styles),
        layout: this.mergeLayout(node.layout, child.layout),
        parent: node.parent,
      };
    }

    // Flatten children with same type
    children = this.flattenSameTypeChildren(node, children);

    return {
      ...node,
      children,
    };
  }

  private isInvisible(node: ASTNode): boolean {
    // Check if node is invisible
    if (node.styles.opacity === 0) return true;

    // Check if node has zero size
    if (node.layout.size.width === 0 || node.layout.size.height === 0) {
      return true;
    }

    return false;
  }

  private isEmptyContainer(node: ASTNode, children: ASTNode[]): boolean {
    if (node.type !== 'Container') return false;
    if (children.length > 0) return false;

    // Keep if has background or border
    if (node.styles.backgroundColor || node.styles.border) return false;

    return true;
  }

  private shouldMergeWithChild(node: ASTNode, children: ASTNode[]): boolean {
    // Only merge containers with single child
    if (node.type !== 'Container' || children.length !== 1) {
      return false;
    }

    const child = children[0];

    // Don't merge if parent has important visual styles
    if (this.hasImportantStyles(node)) {
      return false;
    }

    // Don't merge if parent has important layout
    if (this.hasImportantLayout(node)) {
      return false;
    }

    // Don't merge different semantic types
    if (node.metadata.componentName || child.metadata.componentName) {
      return false;
    }

    return true;
  }

  private hasImportantStyles(node: ASTNode): boolean {
    const { styles } = node;
    return !!(
      styles.backgroundColor ||
      styles.border ||
      styles.borderRadius ||
      (styles.boxShadow && styles.boxShadow.length > 0)
    );
  }

  private hasImportantLayout(node: ASTNode): boolean {
    const { layout } = node;
    return !!(layout.padding || layout.margin || layout.gap || layout.display === 'grid');
  }

  private flattenSameTypeChildren(node: ASTNode, children: ASTNode[]): ASTNode[] {
    // If node is a flex container, flatten child flex containers with same direction
    if (node.layout.display === 'flex') {
      const flattened: ASTNode[] = [];

      for (const child of children) {
        if (
          child.type === 'Container' &&
          child.layout.display === 'flex' &&
          child.layout.flexDirection === node.layout.flexDirection &&
          !this.hasImportantStyles(child) &&
          !child.layout.padding &&
          !child.layout.margin
        ) {
          // Flatten this child's children into parent
          flattened.push(...child.children);
        } else {
          flattened.push(child);
        }
      }

      return flattened;
    }

    return children;
  }

  private mergeStyles(parent: any, child: any): any {
    return {
      ...parent,
      ...child,
      // Child styles take precedence
    };
  }

  private mergeLayout(parent: any, child: any): any {
    return {
      ...parent,
      ...child,
      // Child layout takes precedence
    };
  }
}
