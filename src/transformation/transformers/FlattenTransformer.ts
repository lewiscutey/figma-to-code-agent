import type { ASTNode } from '../types'
import type { Transformer } from '../TransformationPipeline'

/**
 * Flatten unnecessary nesting in the AST
 * Removes single-child containers that don't add semantic value
 */
export class FlattenTransformer implements Transformer {
  name = 'flatten'

  transform(node: ASTNode): ASTNode {
    return this.flattenNode(node)
  }

  private flattenNode(node: ASTNode): ASTNode {
    // First, recursively flatten children
    const flattenedChildren = node.children.map((child) => this.flattenNode(child))

    // Check if this node can be flattened
    if (this.canFlatten(node, flattenedChildren)) {
      // Return the single child, but preserve parent reference
      const child = flattenedChildren[0]
      return {
        ...child,
        parent: node.parent,
      }
    }

    // Return node with flattened children
    return {
      ...node,
      children: flattenedChildren,
    }
  }

  private canFlatten(node: ASTNode, children: ASTNode[]): boolean {
    // Don't flatten if not a container
    if (node.type !== 'Container') {
      return false
    }

    // Don't flatten if has multiple children
    if (children.length !== 1) {
      return false
    }

    // Don't flatten if has meaningful styles
    if (this.hasMeaningfulStyles(node)) {
      return false
    }

    // Don't flatten if has meaningful layout properties
    if (this.hasMeaningfulLayout(node)) {
      return false
    }

    return true
  }

  private hasMeaningfulStyles(node: ASTNode): boolean {
    const { styles } = node
    return !!(
      styles.backgroundColor ||
      styles.border ||
      styles.borderRadius ||
      (styles.boxShadow && styles.boxShadow.length > 0) ||
      (styles.opacity !== undefined && styles.opacity < 1)
    )
  }

  private hasMeaningfulLayout(node: ASTNode): boolean {
    const { layout } = node
    return !!(
      layout.padding ||
      layout.margin ||
      (layout.display === 'flex' && (layout.flexDirection || layout.justifyContent || layout.alignItems || layout.gap))
    )
  }
}
