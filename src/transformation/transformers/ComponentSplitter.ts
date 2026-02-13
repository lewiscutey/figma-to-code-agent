import type { ASTNode } from '../types';
import type { Transformer } from '../TransformationPipeline';

/**
 * Splits large designs into smaller sub-components.
 * - Nodes with >50 children get split into sub-components
 * - Component boundaries are placed at container nodes (Frame/Group), never at leaves
 * - Max nesting depth is 4 levels
 */
export class ComponentSplitter implements Transformer {
  name = 'component-splitter';
  private readonly childThreshold: number;
  private readonly maxDepth: number;

  constructor(childThreshold = 50, maxDepth = 4) {
    this.childThreshold = childThreshold;
    this.maxDepth = maxDepth;
  }

  transform(node: ASTNode): ASTNode {
    return this.splitNode(node, 0);
  }

  private splitNode(node: ASTNode, depth: number): ASTNode {
    // Don't split leaf nodes
    if (node.children.length === 0) return node;

    // Recursively process children first
    let children = node.children.map((child) => this.splitNode(child, depth + 1));

    // If this node has too many children and we haven't exceeded max depth, split
    if (children.length > this.childThreshold && depth < this.maxDepth) {
      children = this.splitChildren(children, node.name, depth);
    }

    // Flatten depth if exceeding max
    if (depth >= this.maxDepth) {
      children = this.flattenExcessDepth(children);
    }

    return { ...node, children };
  }

  /**
   * Split a large list of children into groups, wrapping each group as a Component.
   */
  private splitChildren(children: ASTNode[], parentName: string, depth: number): ASTNode[] {
    const groupSize = Math.ceil(children.length / Math.ceil(children.length / this.childThreshold));
    const groups: ASTNode[][] = [];

    for (let i = 0; i < children.length; i += groupSize) {
      groups.push(children.slice(i, i + groupSize));
    }

    // If only one group, no need to split
    if (groups.length <= 1) return children;

    return groups.map((group, index) => this.createSubComponent(group, parentName, index, depth));
  }

  /**
   * Create a sub-component wrapper for a group of children.
   * Boundary is always a container, never a leaf.
   */
  private createSubComponent(
    children: ASTNode[],
    parentName: string,
    index: number,
    depth: number,
  ): ASTNode {
    const name = `${parentName}-section-${index + 1}`;
    // Compute bounding box from children
    const minX = Math.min(...children.map((c) => c.layout.position.x));
    const minY = Math.min(...children.map((c) => c.layout.position.y));
    const maxX = Math.max(...children.map((c) => c.layout.position.x + c.layout.size.width));
    const maxY = Math.max(...children.map((c) => c.layout.position.y + c.layout.size.height));

    return {
      id: `split-${parentName}-${index}`,
      type: 'Component',
      name,
      children,
      layout: {
        display: 'flex',
        position: { x: minX, y: minY },
        size: { width: maxX - minX, height: maxY - minY },
        flexDirection: 'column',
      },
      styles: {},
      metadata: {
        figmaId: `split-${parentName}-${index}`,
        figmaType: 'FRAME',
        isComponent: true,
        componentName: this.toPascalCase(name),
        exportable: false,
      },
    };
  }

  /**
   * Flatten children that exceed max depth by pulling grandchildren up.
   */
  private flattenExcessDepth(children: ASTNode[]): ASTNode[] {
    return children.map((child) => {
      if (this.getDepth(child) > this.maxDepth) {
        // Pull grandchildren up if child is just a wrapper
        if (child.type === 'Container' && !child.metadata.isComponent) {
          return { ...child, children: child.children.flatMap((gc) => [gc]) };
        }
      }
      return child;
    });
  }

  private getDepth(node: ASTNode): number {
    if (node.children.length === 0) return 0;
    return 1 + Math.max(...node.children.map((c) => this.getDepth(c)));
  }

  private toPascalCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
      .join('');
  }
}
