import type { ASTNode } from '../transformation/types';
import type {
  DesignTokens,
  ColorToken,
  TypographyToken,
  SpacingToken,
  EffectToken,
  BorderRadiusToken,
} from './types';

/**
 * Extracts design tokens (colors, typography, spacing, effects, border-radius)
 * from an AST tree by traversing all nodes and deduplicating values.
 */
export class DesignTokenExtractor {
  extract(root: ASTNode): DesignTokens {
    const colors = new Map<string, ColorToken>();
    const typography = new Map<string, TypographyToken>();
    const spacingSet = new Set<number>();
    const effects = new Map<string, EffectToken>();
    const radiusSet = new Set<number>();

    this.traverse(root, (node) => {
      // Colors
      if (node.styles.backgroundColor) {
        const c = node.styles.backgroundColor;
        const css = `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`;
        if (!colors.has(css)) {
          colors.set(css, {
            name: this.generateColorName(c),
            value: { r: c.r, g: c.g, b: c.b, a: c.a },
            css,
          });
        }
      }

      // Typography
      if (node.styles.typography) {
        const t = node.styles.typography;
        const key = `${t.fontFamily}-${t.fontSize}-${t.fontWeight}`;
        if (!typography.has(key)) {
          typography.set(key, {
            name: this.generateTypographyName(t.fontSize, t.fontWeight),
            fontFamily: t.fontFamily,
            fontSize: t.fontSize,
            fontWeight: t.fontWeight,
            lineHeight: t.lineHeight,
            letterSpacing: t.letterSpacing,
          });
        }
      }

      // Spacing (from padding)
      if (node.layout.padding) {
        const p = node.layout.padding;
        if ('top' in p) {
          [p.top, p.right, p.bottom, p.left].forEach((v) => {
            if (v > 0) spacingSet.add(v);
          });
        }
      }

      // Gap
      if (node.layout.gap && node.layout.gap > 0) {
        spacingSet.add(node.layout.gap);
      }

      // Border radius
      if (node.styles.borderRadius) {
        const br = node.styles.borderRadius;
        if (typeof br === 'number' && br > 0) {
          radiusSet.add(br);
        }
      }

      // Box shadows
      if (node.styles.boxShadow) {
        for (const shadow of node.styles.boxShadow) {
          const css =
            shadow.type === 'inner-shadow'
              ? `inset ${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.spread}px rgba(${shadow.color.r}, ${shadow.color.g}, ${shadow.color.b}, ${shadow.color.a})`
              : `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.spread}px rgba(${shadow.color.r}, ${shadow.color.g}, ${shadow.color.b}, ${shadow.color.a})`;
          if (!effects.has(css)) {
            effects.set(css, {
              name: this.generateEffectName(shadow.type, effects.size),
              type: shadow.type,
              css,
            });
          }
        }
      }
    });

    // Build sorted spacing tokens
    const spacingValues = Array.from(spacingSet).sort((a, b) => a - b);
    const spacingTokens: SpacingToken[] = spacingValues.map((v, i) => ({
      name: `spacing-${i + 1}`,
      value: v,
    }));

    // Build sorted border-radius tokens
    const radiusValues = Array.from(radiusSet).sort((a, b) => a - b);
    const radiusTokens: BorderRadiusToken[] = radiusValues.map((v, i) => ({
      name: `radius-${i + 1}`,
      value: v,
    }));

    return {
      colors: Array.from(colors.values()),
      typography: Array.from(typography.values()),
      spacing: spacingTokens,
      effects: Array.from(effects.values()),
      borderRadius: radiusTokens,
    };
  }

  private traverse(node: ASTNode, visitor: (n: ASTNode) => void): void {
    visitor(node);
    node.children.forEach((child) => this.traverse(child, visitor));
  }

  private generateColorName(c: { r: number; g: number; b: number; a: number }): string {
    if (c.r === 255 && c.g === 255 && c.b === 255) return c.a < 1 ? 'white-transparent' : 'white';
    if (c.r === 0 && c.g === 0 && c.b === 0) return c.a < 1 ? 'black-transparent' : 'black';
    return `color-${c.r}-${c.g}-${c.b}${c.a < 1 ? `-a${Math.round(c.a * 100)}` : ''}`;
  }

  private generateTypographyName(fontSize: number, fontWeight: number): string {
    const sizeLabel =
      fontSize <= 12 ? 'xs' : fontSize <= 14 ? 'sm' : fontSize <= 16 ? 'base' :
      fontSize <= 20 ? 'lg' : fontSize <= 24 ? 'xl' : fontSize <= 32 ? '2xl' : '3xl';
    const weightLabel =
      fontWeight <= 300 ? 'light' : fontWeight <= 400 ? 'regular' :
      fontWeight <= 500 ? 'medium' : fontWeight <= 600 ? 'semibold' : 'bold';
    return `text-${sizeLabel}-${weightLabel}`;
  }

  private generateEffectName(type: string, index: number): string {
    const prefix = type === 'inner-shadow' ? 'inner-shadow' : type === 'blur' ? 'blur' : 'shadow';
    return `${prefix}-${index + 1}`;
  }
}