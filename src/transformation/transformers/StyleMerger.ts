import type { ASTNode, StyleInfo, Color } from '../types';
import type { Transformer } from '../TransformationPipeline';

/**
 * Merges duplicate styles across the AST.
 * Identifies nodes with identical style properties and assigns
 * shared class references via metadata.
 */
export class StyleMerger implements Transformer {
  name = 'style-merger';
  private styleGroups = new Map<string, string>();
  private groupCounter = 0;

  transform(node: ASTNode): ASTNode {
    this.styleGroups.clear();
    this.groupCounter = 0;
    // First pass: collect style signatures
    this.collectStyles(node);
    // Second pass: assign shared class names
    return this.assignSharedStyles(node);
  }

  private collectStyles(node: ASTNode): void {
    const sig = this.styleSignature(node.styles);
    if (sig && !this.styleGroups.has(sig)) {
      this.groupCounter++;
      this.styleGroups.set(sig, `shared-style-${this.groupCounter}`);
    }
    node.children.forEach((child) => this.collectStyles(child));
  }

  private assignSharedStyles(node: ASTNode): ASTNode {
    const sig = this.styleSignature(node.styles);
    const sharedClass = sig ? this.styleGroups.get(sig) : undefined;

    return {
      ...node,
      metadata: {
        ...node.metadata,
        ...(sharedClass ? { sharedStyleClass: sharedClass } : {}),
      },
      children: node.children.map((child) => this.assignSharedStyles(child)),
    };
  }

  private styleSignature(styles: StyleInfo): string | null {
    const parts: string[] = [];
    if (styles.backgroundColor) {
      parts.push(`bg:${this.colorKey(styles.backgroundColor)}`);
    }
    if (styles.borderRadius !== undefined) {
      parts.push(`br:${JSON.stringify(styles.borderRadius)}`);
    }
    if (styles.border) {
      parts.push(`bd:${styles.border.width}-${styles.border.style}-${this.colorKey(styles.border.color)}`);
    }
    if (styles.opacity !== undefined) {
      parts.push(`op:${styles.opacity}`);
    }
    if (styles.typography) {
      const t = styles.typography;
      parts.push(`ty:${t.fontFamily}-${t.fontSize}-${t.fontWeight}`);
    }
    if (styles.boxShadow && styles.boxShadow.length > 0) {
      parts.push(`sh:${styles.boxShadow.map((s) => `${s.offsetX},${s.offsetY},${s.blur}`).join('|')}`);
    }
    return parts.length > 0 ? parts.join(';') : null;
  }

  private colorKey(c: Color): string {
    return `${c.r},${c.g},${c.b},${c.a}`;
  }
}
