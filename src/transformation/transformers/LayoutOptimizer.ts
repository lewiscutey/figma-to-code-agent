import type { ASTNode } from '../types';
import type { Transformer } from '../TransformationPipeline';

/**
 * Optimize layout properties for better CSS generation
 */
export class LayoutOptimizer implements Transformer {
  name = 'layout-optimizer';

  transform(node: ASTNode): ASTNode {
    return this.optimizeNode(node);
  }

  private optimizeNode(node: ASTNode): ASTNode {
    // Optimize children first (bottom-up) so child layouts are resolved before parent
    const optimizedChildren = node.children.map((child) => this.optimizeNode(child));
    const nodeWithChildren = { ...node, children: optimizedChildren };

    const optimizedLayout = { ...nodeWithChildren.layout };

    // Convert block-display containers to flex when children are spatially aligned
    // This handles Figma frames that don't use Auto Layout but have clear row/column patterns
    if (
      (optimizedLayout.display === 'block' || optimizedLayout.display === 'absolute') &&
      this.canConvertToFlex(nodeWithChildren)
    ) {
      const direction = this.inferFlexDirection(nodeWithChildren);
      optimizedLayout.display = 'flex';
      optimizedLayout.flexDirection = direction;

      // Infer gap from consistent spacing between children
      const gap = this.inferGap(nodeWithChildren, direction);
      if (gap > 0) {
        optimizedLayout.gap = gap;
      }

      // Infer alignment from children positions
      const alignment = this.inferAlignment(nodeWithChildren, direction);
      if (alignment.justify) optimizedLayout.justifyContent = alignment.justify;
      if (alignment.align) optimizedLayout.alignItems = alignment.align;
    }

    // Simplify uniform padding
    if (optimizedLayout.padding) {
      const { top, right, bottom, left } = optimizedLayout.padding;
      if (top === right && right === bottom && bottom === left) {
        optimizedLayout.padding = { top, right, bottom, left };
      }
    }

    return {
      ...nodeWithChildren,
      layout: optimizedLayout,
    };
  }

  private canConvertToFlex(node: ASTNode): boolean {
    if (node.children.length < 2) return false;

    // Check if children are aligned in a row or column
    const positions = node.children.map((child) => ({
      x: child.layout.position.x,
      y: child.layout.position.y,
      w: child.layout.size.width,
      h: child.layout.size.height,
    }));

    const isRow = this.isAlignedHorizontally(positions);
    const isColumn = this.isAlignedVertically(positions);

    return isRow || isColumn;
  }

  private isAlignedHorizontally(
    positions: Array<{ x: number; y: number; w: number; h: number }>
  ): boolean {
    if (positions.length < 2) return false;

    // Children are in a row if their vertical centers are roughly aligned
    const centers = positions.map((p) => p.y + p.h / 2);
    const avgCenter = centers.reduce((a, b) => a + b, 0) / centers.length;
    const maxHeight = Math.max(...positions.map((p) => p.h));
    // Tolerance: 30% of the tallest child's height, minimum 10px
    const tolerance = Math.max(10, maxHeight * 0.3);

    const aligned = centers.every((c) => Math.abs(c - avgCenter) < tolerance);
    if (!aligned) return false;

    // Also verify children are ordered left-to-right (not overlapping significantly)
    const sorted = [...positions].sort((a, b) => a.x - b.x);
    for (let i = 1; i < sorted.length; i++) {
      const prevRight = sorted[i - 1].x + sorted[i - 1].w;
      // Allow small overlap (up to 5px) but reject major overlaps
      if (sorted[i].x < prevRight - 5) return false;
    }

    return true;
  }

  private isAlignedVertically(
    positions: Array<{ x: number; y: number; w: number; h: number }>
  ): boolean {
    if (positions.length < 2) return false;

    // Children are in a column if their horizontal centers are roughly aligned
    const centers = positions.map((p) => p.x + p.w / 2);
    const avgCenter = centers.reduce((a, b) => a + b, 0) / centers.length;
    const maxWidth = Math.max(...positions.map((p) => p.w));
    // Tolerance: 30% of the widest child's width, minimum 10px
    const tolerance = Math.max(10, maxWidth * 0.3);

    const aligned = centers.every((c) => Math.abs(c - avgCenter) < tolerance);
    if (!aligned) return false;

    // Also verify children are ordered top-to-bottom (not overlapping significantly)
    const sorted = [...positions].sort((a, b) => a.y - b.y);
    for (let i = 1; i < sorted.length; i++) {
      const prevBottom = sorted[i - 1].y + sorted[i - 1].h;
      if (sorted[i].y < prevBottom - 5) return false;
    }

    return true;
  }

  private inferFlexDirection(node: ASTNode): 'row' | 'column' {
    const positions = node.children.map((child) => ({
      x: child.layout.position.x,
      y: child.layout.position.y,
      w: child.layout.size.width,
      h: child.layout.size.height,
    }));

    // Prefer row if horizontally aligned, otherwise column
    if (this.isAlignedHorizontally(positions)) return 'row';
    return 'column';
  }

  /**
   * Infer gap from consistent spacing between children
   */
  private inferGap(node: ASTNode, direction: 'row' | 'column'): number {
    if (node.children.length < 2) return 0;

    const sorted = [...node.children].sort((a, b) =>
      direction === 'row'
        ? a.layout.position.x - b.layout.position.x
        : a.layout.position.y - b.layout.position.y
    );

    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const gap =
        direction === 'row'
          ? curr.layout.position.x - (prev.layout.position.x + prev.layout.size.width)
          : curr.layout.position.y - (prev.layout.position.y + prev.layout.size.height);
      gaps.push(Math.max(0, Math.round(gap)));
    }

    // If all gaps are similar (within 3px), use the average as the gap value
    if (gaps.length === 0) return 0;
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const consistent = gaps.every((g) => Math.abs(g - avgGap) <= 3);

    return consistent ? Math.round(avgGap) : 0;
  }

  /**
   * Infer justify-content and align-items from children positions relative to parent
   */
  private inferAlignment(
    node: ASTNode,
    direction: 'row' | 'column'
  ): { justify?: string; align?: string } {
    if (node.children.length === 0) return {};

    const parentX = node.layout.position.x;
    const parentY = node.layout.position.y;
    const parentW = node.layout.size.width;
    const parentH = node.layout.size.height;

    const sorted = [...node.children].sort((a, b) =>
      direction === 'row'
        ? a.layout.position.x - b.layout.position.x
        : a.layout.position.y - b.layout.position.y
    );

    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    let justify: string | undefined;
    let align: string | undefined;

    if (direction === 'row') {
      const startGap = first.layout.position.x - parentX;
      const endGap = parentX + parentW - (last.layout.position.x + last.layout.size.width);

      if (Math.abs(startGap - endGap) < 5 && startGap > 10) {
        justify = 'center';
      } else if (startGap < 5) {
        justify = 'flex-start';
      } else if (endGap < 5) {
        justify = 'flex-end';
      }

      // Cross-axis alignment
      const centers = node.children.map((c) => c.layout.position.y + c.layout.size.height / 2);
      const parentCenter = parentY + parentH / 2;
      const avgCenter = centers.reduce((a, b) => a + b, 0) / centers.length;
      if (Math.abs(avgCenter - parentCenter) < 5) {
        align = 'center';
      }
    } else {
      const startGap = first.layout.position.y - parentY;
      const endGap = parentY + parentH - (last.layout.position.y + last.layout.size.height);

      if (Math.abs(startGap - endGap) < 5 && startGap > 10) {
        justify = 'center';
      } else if (startGap < 5) {
        justify = 'flex-start';
      } else if (endGap < 5) {
        justify = 'flex-end';
      }

      // Cross-axis alignment
      const centers = node.children.map((c) => c.layout.position.x + c.layout.size.width / 2);
      const parentCenter = parentX + parentW / 2;
      const avgCenter = centers.reduce((a, b) => a + b, 0) / centers.length;
      if (Math.abs(avgCenter - parentCenter) < 5) {
        align = 'center';
      }
    }

    return { justify, align };
  }
}
