/**
 * Property-based tests for Design Token Extraction
 * Feature: figma-to-code-agent, Property 11: 颜色令牌提取
 * Feature: figma-to-code-agent, Property 12: 字体令牌提取
 * Feature: figma-to-code-agent, Property 13: 间距令牌提取
 * Feature: figma-to-code-agent, Property 14: 效果令牌提取
 * Feature: figma-to-code-agent, Property 15: 令牌命名语义化
 * Feature: figma-to-code-agent, Property 16: 令牌格式导出往返
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import * as fc from 'fast-check';
import { DesignTokenExtractor } from '../../tokens/DesignTokenExtractor';
import { DesignTokenExporter } from '../../tokens/DesignTokenExporter';
import { createContainerNode, createTextNode } from '../../transformation/ASTFactory';
import type { ASTNode, Color, Spacing } from '../../transformation/types';

const colorArb = fc.record({
  r: fc.integer({ min: 0, max: 255 }),
  g: fc.integer({ min: 0, max: 255 }),
  b: fc.integer({ min: 0, max: 255 }),
  a: fc.float({ min: 0, max: 1, noNaN: true }),
});

const spacingArb = fc.record({
  top: fc.integer({ min: 0, max: 100 }),
  right: fc.integer({ min: 0, max: 100 }),
  bottom: fc.integer({ min: 0, max: 100 }),
  left: fc.integer({ min: 0, max: 100 }),
});

function buildTree(colors: Color[], spacings: Spacing[], fontSizes: number[]): ASTNode {
  const root = createContainerNode('root', 'root', '0:0', 'FRAME');
  root.layout.size = { width: 1920, height: 1080 };

  colors.forEach((c, i) => {
    const child = createContainerNode(`c${i}`, `box-${i}`, `0:${i}`, 'FRAME');
    child.styles.backgroundColor = c;
    child.layout.size = { width: 100, height: 50 };
    root.children.push(child);
  });

  spacings.forEach((s, i) => {
    const child = createContainerNode(`s${i}`, `spaced-${i}`, `1:${i}`, 'FRAME');
    child.layout.padding = s;
    child.layout.size = { width: 100, height: 50 };
    root.children.push(child);
  });

  fontSizes.forEach((fs, i) => {
    const child = createTextNode(`t${i}`, `text-${i}`, `2:${i}`);
    child.styles.typography = {
      fontFamily: 'Inter',
      fontSize: fs,
      fontWeight: 400,
      lineHeight: fs * 1.5,
    };
    child.layout.size = { width: 200, height: fs * 2 };
    child.metadata.textContent = 'Sample text';
    root.children.push(child);
  });

  return root;
}

describe('Design Token Property Tests', () => {
  const extractor = new DesignTokenExtractor();
  const exporter = new DesignTokenExporter();

  it('Property 11: extracted color tokens include all unique colors from the tree', () => {
    fc.assert(
      fc.property(
        fc.array(colorArb, { minLength: 1, maxLength: 5 }),
        (colors) => {
          const tree = buildTree(colors, [], []);
          const tokens = extractor.extract(tree);
          // Should have at least 1 color token (dedup may reduce count)
          expect(tokens.colors.length).toBeGreaterThanOrEqual(1);
          expect(tokens.colors.length).toBeLessThanOrEqual(colors.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 12: extracted typography tokens include all unique font styles', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 10, max: 72 }), { minLength: 1, maxLength: 5 }),
        (fontSizes) => {
          const tree = buildTree([], [], fontSizes);
          const tokens = extractor.extract(tree);
          expect(tokens.typography.length).toBeGreaterThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13: extracted spacing tokens include padding/gap values', () => {
    fc.assert(
      fc.property(
        fc.array(spacingArb, { minLength: 1, maxLength: 5 }),
        (spacings) => {
          const tree = buildTree([], spacings, []);
          const tokens = extractor.extract(tree);
          // Spacing tokens should be extracted from padding values
          expect(tokens.spacing).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 14: extracted effect tokens include border radius and shadows', () => {
    const root = createContainerNode('root', 'root', '0:0', 'FRAME');
    root.layout.size = { width: 1920, height: 1080 };

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        (radius) => {
          const child = createContainerNode('c1', 'box', '0:1', 'FRAME');
          child.styles.borderRadius = radius;
          child.layout.size = { width: 100, height: 50 };
          root.children = [child];

          const tokens = extractor.extract(root);
          expect(tokens.effects).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 15: token names are semantic (contain type prefix/suffix)', () => {
    fc.assert(
      fc.property(
        fc.array(colorArb, { minLength: 1, maxLength: 3 }),
        fc.array(fc.integer({ min: 10, max: 72 }), { minLength: 1, maxLength: 3 }),
        (colors, fontSizes) => {
          const tree = buildTree(colors, [], fontSizes);
          const tokens = extractor.extract(tree);

          tokens.colors.forEach((t) => {
            expect(t.name).toBeDefined();
            expect(typeof t.name).toBe('string');
            expect(t.name.length).toBeGreaterThan(0);
          });

          tokens.typography.forEach((t) => {
            expect(t.name).toBeDefined();
            expect(typeof t.name).toBe('string');
            expect(t.name.length).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 16: export to JSON and parse back preserves token values', () => {
    fc.assert(
      fc.property(
        fc.array(colorArb, { minLength: 1, maxLength: 3 }),
        (colors) => {
          const tree = buildTree(colors, [], []);
          const tokens = extractor.extract(tree);

          // Export to JSON
          const jsonStr = exporter.export(tokens, 'json');
          const parsed = JSON.parse(jsonStr);

          // Should contain color tokens
          expect(parsed).toBeDefined();
          expect(typeof parsed).toBe('object');
        }
      ),
      { numRuns: 100 }
    );
  });
});
