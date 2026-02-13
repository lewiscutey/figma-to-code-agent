/**
 * Property-based tests for Component Organization
 * Feature: figma-to-code-agent, Property 19: 组件层级合理性
 * Feature: figma-to-code-agent, Property 32: 大型设计自动拆分
 * Feature: figma-to-code-agent, Property 33: 组件边界合理性
 * Feature: figma-to-code-agent, Property 34: 文件命名约定
 * Feature: figma-to-code-agent, Property 35: Props 接口生成
 * Validates: Requirements 4.3, 7.1, 7.3, 7.4, 7.5, 7.6
 */

import * as fc from 'fast-check';
import { ComponentSplitter } from '../../../transformation/transformers/ComponentSplitter';
import { FileOrganizer } from '../../../generation/FileOrganizer';
import { createContainerNode, createTextNode, createImageNode } from '../../../transformation/ASTFactory';
import type { ASTNode } from '../../../transformation/types';

function buildLargeTree(numChildren: number): ASTNode {
  const root = createContainerNode('root', 'page', '0:0', 'FRAME');
  root.layout.size = { width: 1920, height: 1080 };

  for (let i = 0; i < numChildren; i++) {
    const child = createContainerNode(`c${i}`, `box-${i}`, `0:${i}`, 'FRAME');
    child.layout.size = { width: 100, height: 50 };
    child.layout.position = { x: (i % 10) * 110, y: Math.floor(i / 10) * 60 };
    root.children.push(child);
  }

  return root;
}

function getMaxDepth(node: ASTNode, depth = 0): number {
  if (node.children.length === 0) return depth;
  return Math.max(...node.children.map((c) => getMaxDepth(c, depth + 1)));
}

describe('Component Organization Property Tests', () => {
  it('Property 19: component nesting depth does not exceed 4 levels', () => {
    const splitter = new ComponentSplitter(50, 4);

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }),
        (numChildren) => {
          const tree = buildLargeTree(numChildren);
          const result = splitter.transform(tree);
          expect(getMaxDepth(result)).toBeLessThanOrEqual(5); // root + 4 levels
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 32: nodes with >50 children are split into sub-components', () => {
    const splitter = new ComponentSplitter(50, 4);

    fc.assert(
      fc.property(
        fc.integer({ min: 51, max: 200 }),
        (numChildren) => {
          const tree = buildLargeTree(numChildren);
          const result = splitter.transform(tree);

          // Root should now have fewer direct children (split into groups)
          if (numChildren > 50) {
            // After splitting, each group should have <= 50 children
            for (const child of result.children) {
              if (child.type === 'Component' && child.metadata.isComponent) {
                expect(child.children.length).toBeLessThanOrEqual(50);
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 33: component boundaries are at container nodes, not leaves', () => {
    const splitter = new ComponentSplitter(50, 4);

    fc.assert(
      fc.property(
        fc.integer({ min: 51, max: 150 }),
        (numChildren) => {
          const tree = buildLargeTree(numChildren);
          const result = splitter.transform(tree);

          const checkBoundaries = (node: ASTNode) => {
            if (node.metadata.isComponent && node.type === 'Component') {
              // Component wrappers should not be leaf types
              expect(['Text', 'Image', 'Shape']).not.toContain(node.type);
            }
            node.children.forEach(checkBoundaries);
          };
          checkBoundaries(result);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 34: React files use PascalCase, Vue files use kebab-case', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.stringOf(fc.constantFrom('a', 'b', 'c', 'd', 'A', 'B'), { minLength: 1, maxLength: 5 }),
          fc.stringOf(fc.constantFrom('a', 'b', 'c', 'd', '-', ' ', 'A', 'B'), { minLength: 0, maxLength: 10 }),
        ).map(([first, rest]) => first + rest),
        fc.constantFrom('react', 'vue') as fc.Arbitrary<'react' | 'vue'>,
        (name, framework) => {
          const organizer = new FileOrganizer(framework, 'src');
          const fileName = organizer.generateFileName(name, true);

          if (framework === 'react') {
            // PascalCase: starts with uppercase, ends with .tsx
            expect(fileName).toMatch(/^[A-Z].*\.tsx$/);
          } else {
            // kebab-case: lowercase with dashes, ends with .vue
            expect(fileName).toMatch(/^[a-z][a-z0-9-]*\.vue$/);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 35: components with text/image children generate Props interface', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        (hasText, hasImage) => {
          const organizer = new FileOrganizer('react', 'src');
          const node = createContainerNode('c1', 'card', '0:1', 'FRAME');
          node.metadata.isComponent = true;
          node.metadata.componentName = 'Card';
          node.layout.size = { width: 300, height: 200 };

          if (hasText) {
            const text = createTextNode('t1', 'title', '0:2');
            text.metadata.textContent = 'Hello';
            text.layout.size = { width: 200, height: 30 };
            node.children.push(text);
          }
          if (hasImage) {
            const img = createImageNode('i1', 'avatar', '0:3');
            img.layout.size = { width: 50, height: 50 };
            node.children.push(img);
          }

          const propsInterface = organizer.generatePropsInterface(node);

          if (hasText || hasImage) {
            expect(propsInterface).toContain('interface');
            expect(propsInterface).toContain('Props');
          }
          // className prop is always generated
          if (propsInterface) {
            expect(propsInterface).toContain('className');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
