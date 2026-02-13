/**
 * Property-based tests for Style Generation
 * Feature: figma-to-code-agent, Property 20: 样式模式支持
 * Feature: figma-to-code-agent, Property 21: Tailwind 类名映射
 * Validates: Requirements 4.4, 4.5
 */

import * as fc from 'fast-check';
import { ReactGenerator } from '../../generation/ReactGenerator';
import { createContainerNode, createTextNode } from '../../transformation/ASTFactory';
import type { ASTNode } from '../../transformation/types';
import type { GeneratorConfig } from '../../generation/types';

function buildStyledTree(bgColor: { r: number; g: number; b: number; a: number }, fontSize: number): ASTNode {
  const root = createContainerNode('root', 'styled-container', '0:0', 'FRAME');
  root.layout.size = { width: 1920, height: 1080 };
  root.styles.backgroundColor = bgColor;
  root.styles.borderRadius = 8;
  root.layout.padding = { top: 16, right: 16, bottom: 16, left: 16 };

  const text = createTextNode('t1', 'label', '0:1');
  text.metadata.textContent = 'Hello';
  text.styles.typography = { fontFamily: 'Inter', fontSize, fontWeight: 400, lineHeight: fontSize * 1.5 };
  text.layout.size = { width: 200, height: fontSize * 2 };
  root.children.push(text);

  return root;
}

describe('Style Generator Property Tests', () => {
  const reactGen = new ReactGenerator();

  it('Property 20: all three style modes produce valid output for React', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('css-modules', 'tailwind', 'css') as fc.Arbitrary<'css-modules' | 'tailwind' | 'css'>,
        (styleMode) => {
          const tree = buildStyledTree({ r: 100, g: 150, b: 200, a: 1 }, 16);
          const config: GeneratorConfig = { framework: 'react', styleMode, typescript: true, outputDir: 'src' };
          const files = reactGen.generate(tree, config);

          expect(files.length).toBeGreaterThanOrEqual(1);
          const code = files[0].content;

          if (styleMode === 'css-modules') {
            expect(code).toContain('import styles from');
            const cssFile = files.find((f) => f.path.endsWith('.module.css'));
            expect(cssFile).toBeDefined();
          } else if (styleMode === 'tailwind') {
            expect(code).toContain('className="');
          } else {
            // plain css
            const cssFile = files.find((f) => f.path.endsWith('.css') && !f.path.endsWith('.module.css'));
            expect(cssFile).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 21: Tailwind mode maps basic styles to Tailwind classes', () => {
    fc.assert(
      fc.property(
        fc.record({
          r: fc.integer({ min: 0, max: 255 }),
          g: fc.integer({ min: 0, max: 255 }),
          b: fc.integer({ min: 0, max: 255 }),
          a: fc.constant(1),
        }),
        fc.integer({ min: 10, max: 72 }),
        (color, fontSize) => {
          const tree = buildStyledTree(color, fontSize);
          const config: GeneratorConfig = { framework: 'react', styleMode: 'tailwind', typescript: true, outputDir: 'src' };
          const files = reactGen.generate(tree, config);
          const code = files[0].content;

          // Tailwind classes should be present in className attributes
          expect(code).toContain('className="');
          // Should contain bg- class for background color
          expect(code).toMatch(/bg-\[/);
        }
      ),
      { numRuns: 100 }
    );
  });
});
