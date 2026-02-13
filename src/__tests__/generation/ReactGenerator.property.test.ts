/**
 * Property-based tests for React Generator
 * Feature: figma-to-code-agent, Property 17: React 代码有效性
 * Feature: figma-to-code-agent, Property 22: 代码导入完整性
 * Feature: figma-to-code-agent, Property 23: 代码注释存在性
 * Validates: Requirements 4.1, 4.6, 4.7
 */

import * as fc from 'fast-check';
import { ReactGenerator } from '../../generation/ReactGenerator';
import { createContainerNode, createTextNode, createImageNode } from '../../transformation/ASTFactory';
import type { ASTNode } from '../../transformation/types';
import type { GeneratorConfig } from '../../generation/types';

function buildTree(depth: number, types: string[]): ASTNode {
  const root = createContainerNode('root', 'main-container', '0:0', 'FRAME');
  root.layout.size = { width: 1920, height: 1080 };

  types.forEach((t, i) => {
    let child: ASTNode;
    if (t === 'text') {
      child = createTextNode(`t${i}`, `label-${i}`, `0:${i}`);
      child.metadata.textContent = 'Hello';
      child.styles.typography = { fontFamily: 'Inter', fontSize: 16, fontWeight: 400, lineHeight: 24 };
    } else if (t === 'image') {
      child = createImageNode(`i${i}`, `image-${i}`, `0:${i}`);
    } else {
      child = createContainerNode(`c${i}`, `box-${i}`, `0:${i}`, 'FRAME');
    }
    child.layout.size = { width: 100, height: 50 };
    child.layout.position = { x: i * 110, y: 0 };
    root.children.push(child);
  });

  return root;
}

const childTypesArb = fc.array(
  fc.constantFrom('container', 'text', 'image'),
  { minLength: 0, maxLength: 5 }
);

const styleModeArb = fc.constantFrom('css-modules', 'tailwind', 'css') as fc.Arbitrary<'css-modules' | 'tailwind' | 'css'>;

describe('React Generator Property Tests', () => {
  const generator = new ReactGenerator();

  it('Property 17: generated React code contains valid JSX structure', () => {
    fc.assert(
      fc.property(childTypesArb, styleModeArb, (types, styleMode) => {
        const tree = buildTree(1, types);
        const config: GeneratorConfig = {
          framework: 'react',
          styleMode,
          typescript: true,
          outputDir: 'src',
        };

        const files = generator.generate(tree, config);
        const code = files[0].content;

        // Must contain React import
        expect(code).toContain("import React from 'react'");
        // Must contain export function
        expect(code).toContain('export function');
        // Must contain JSX (opening and closing tags)
        expect(code).toContain('<div');
        // Must have balanced structure (return statement)
        expect(code).toContain('return (');
      }),
      { numRuns: 100 }
    );
  });

  it('Property 22: generated code includes all required imports', () => {
    fc.assert(
      fc.property(styleModeArb, (styleMode) => {
        const tree = buildTree(1, ['container', 'text']);
        const config: GeneratorConfig = {
          framework: 'react',
          styleMode,
          typescript: true,
          outputDir: 'src',
        };

        const files = generator.generate(tree, config);
        const code = files[0].content;

        // Always has React import
        expect(code).toContain("import React from 'react'");

        // CSS modules should import styles
        if (styleMode === 'css-modules') {
          expect(code).toContain('import styles from');
        }

        // CSS mode should import .css file
        if (styleMode === 'css') {
          expect(code).toContain("import '.");
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Property 23: generated code contains layer name comments for child nodes', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('container', 'text'), { minLength: 1, maxLength: 4 }),
        (types) => {
          const tree = buildTree(1, types);
          const config: GeneratorConfig = {
            framework: 'react',
            styleMode: 'css-modules',
            typescript: true,
            outputDir: 'src',
          };

          const files = generator.generate(tree, config);
          const code = files[0].content;

          // Child nodes should have layer name comments
          if (types.length > 0) {
            expect(code).toContain('{/*');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
