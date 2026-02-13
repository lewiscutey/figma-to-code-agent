import type { ASTNode } from '../types';
import type { Transformer } from '../TransformationPipeline';

/**
 * Enhances AST nodes with accessibility attributes.
 * - Adds ARIA roles based on node type and structure
 * - Adds alt text hints for images
 * - Adds landmark roles for navigation/header/footer patterns
 * - Flags interactive elements that need keyboard support
 */
export class AccessibilityEnhancer implements Transformer {
  name = 'accessibility-enhancer';

  transform(node: ASTNode): ASTNode {
    return this.enhance(node);
  }

  private enhance(node: ASTNode): ASTNode {
    const a11y: Record<string, string> = {};

    // Image nodes need alt text
    if (node.type === 'Image') {
      a11y.role = 'img';
      a11y.alt = this.generateAltText(node.name);
    }

    // Text nodes
    if (node.type === 'Text') {
      const fontSize = node.styles.typography?.fontSize;
      if (fontSize && fontSize >= 24) {
        a11y.role = 'heading';
        a11y.ariaLevel = fontSize >= 32 ? '1' : fontSize >= 24 ? '2' : '3';
      }
    }

    // Detect navigation patterns
    if (this.isNavigation(node)) {
      a11y.role = 'navigation';
      a11y.ariaLabel = this.generateAriaLabel(node.name, 'navigation');
    }

    // Detect header patterns
    if (this.isHeader(node)) {
      a11y.role = 'banner';
    }

    // Detect footer patterns
    if (this.isFooter(node)) {
      a11y.role = 'contentinfo';
    }

    // Detect button-like elements
    if (this.isButton(node)) {
      a11y.role = 'button';
      a11y.tabIndex = '0';
    }

    // Detect list patterns
    if (this.isList(node)) {
      a11y.role = 'list';
    }

    const hasA11y = Object.keys(a11y).length > 0;

    return {
      ...node,
      metadata: {
        ...node.metadata,
        ...(hasA11y ? { accessibility: a11y } : {}),
      },
      children: node.children.map((child) => this.enhance(child)),
    };
  }

  private isNavigation(node: ASTNode): boolean {
    const name = node.name.toLowerCase();
    return (
      (name.includes('nav') || name.includes('menu') || name.includes('toolbar')) &&
      node.children.length >= 2
    );
  }

  private isHeader(node: ASTNode): boolean {
    const name = node.name.toLowerCase();
    return name.includes('header') || name.includes('top-bar') || name.includes('topbar');
  }

  private isFooter(node: ASTNode): boolean {
    const name = node.name.toLowerCase();
    return name.includes('footer') || name.includes('bottom-bar');
  }

  private isButton(node: ASTNode): boolean {
    const name = node.name.toLowerCase();
    if (name.includes('button') || name.includes('btn') || name.includes('cta')) {
      return true;
    }
    // Small container with single text child and background color = likely a button
    if (
      node.type === 'Container' &&
      node.children.length === 1 &&
      node.children[0].type === 'Text' &&
      node.styles.backgroundColor &&
      node.styles.borderRadius
    ) {
      return true;
    }
    return false;
  }

  private isList(node: ASTNode): boolean {
    if (node.children.length < 3) return false;
    // Check if children have similar structure (same type and similar layout)
    const types = node.children.map((c) => c.type);
    const allSameType = types.every((t) => t === types[0]);
    return allSameType && node.layout.display === 'flex';
  }

  private generateAltText(name: string): string {
    return name
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim() || 'Image';
  }

  private generateAriaLabel(name: string, fallback: string): string {
    const cleaned = name.replace(/[-_]+/g, ' ').trim();
    return cleaned || fallback;
  }
}
