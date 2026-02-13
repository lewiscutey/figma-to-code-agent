import type { ASTNode } from '../types';
import type { Transformer } from '../TransformationPipeline';

/**
 * Breakpoint definition for responsive design.
 */
export interface Breakpoint {
  name: string;
  minWidth: number;
  maxWidth: number;
}

const DEFAULT_BREAKPOINTS: Breakpoint[] = [
  { name: 'mobile', minWidth: 0, maxWidth: 767 },
  { name: 'tablet', minWidth: 768, maxWidth: 1023 },
  { name: 'desktop', minWidth: 1024, maxWidth: Infinity },
];

/**
 * Merges responsive breakpoint variants into a single component.
 * Identifies frames with the same name but different widths as
 * breakpoint variants and consolidates them.
 */
export class ResponsiveMerger implements Transformer {
  name = 'responsive-merger';
  private breakpoints: Breakpoint[];

  constructor(breakpoints?: Breakpoint[]) {
    this.breakpoints = breakpoints || DEFAULT_BREAKPOINTS;
  }

  transform(node: ASTNode): ASTNode {
    return this.mergeResponsiveVariants(node);
  }

  private mergeResponsiveVariants(node: ASTNode): ASTNode {
    if (node.children.length < 2) {
      return {
        ...node,
        children: node.children.map((c) => this.mergeResponsiveVariants(c)),
      };
    }

    // Group children by name to find breakpoint variants
    const nameGroups = new Map<string, ASTNode[]>();
    const ungrouped: ASTNode[] = [];

    for (const child of node.children) {
      const baseName = this.extractBaseName(child.name);
      if (baseName) {
        if (!nameGroups.has(baseName)) {
          nameGroups.set(baseName, []);
        }
        nameGroups.get(baseName)!.push(child);
      } else {
        ungrouped.push(child);
      }
    }

    const mergedChildren: ASTNode[] = [];

    for (const [baseName, variants] of nameGroups) {
      if (variants.length > 1 && this.areBreakpointVariants(variants)) {
        // Merge into a single responsive component
        mergedChildren.push(this.createResponsiveComponent(baseName, variants));
      } else {
        mergedChildren.push(...variants);
      }
    }

    mergedChildren.push(...ungrouped);

    return {
      ...node,
      children: mergedChildren.map((c) => this.mergeResponsiveVariants(c)),
    };
  }

  /**
   * Check if a set of nodes are breakpoint variants (same name, different widths).
   */
  private areBreakpointVariants(nodes: ASTNode[]): boolean {
    const widths = nodes.map((n) => n.layout.size.width);
    const uniqueWidths = new Set(widths);
    return uniqueWidths.size === nodes.length && uniqueWidths.size >= 2;
  }

  /**
   * Create a merged responsive component from breakpoint variants.
   */
  private createResponsiveComponent(baseName: string, variants: ASTNode[]): ASTNode {
    // Sort by width (mobile first)
    const sorted = [...variants].sort((a, b) => a.layout.size.width - b.layout.size.width);
    const primary = sorted[sorted.length - 1]; // Use largest as primary

    const breakpointData = sorted.map((variant) => ({
      breakpoint: this.detectBreakpoint(variant.layout.size.width),
      width: variant.layout.size.width,
      layout: variant.layout,
      childCount: variant.children.length,
    }));

    return {
      ...primary,
      name: baseName,
      metadata: {
        ...primary.metadata,
        componentName: baseName,
        responsive: true,
        breakpoints: breakpointData,
      } as any,
      children: primary.children,
    };
  }

  /**
   * Detect which breakpoint a width falls into.
   */
  private detectBreakpoint(width: number): string {
    for (const bp of this.breakpoints) {
      if (width >= bp.minWidth && width <= bp.maxWidth) {
        return bp.name;
      }
    }
    return 'desktop';
  }

  /**
   * Extract base name by removing common breakpoint suffixes.
   */
  private extractBaseName(name: string): string {
    return name
      .replace(/[-_\s]*(mobile|tablet|desktop|sm|md|lg|xl|xxl|small|medium|large)$/i, '')
      .trim();
  }
}
