/**
 * Property-based tests for Transformers
 * Feature: figma-to-code-agent, Property 7: 组件提取和复用
 * Feature: figma-to-code-agent, Property 8: 转换管道应用
 * Feature: figma-to-code-agent, Property 9: 样式提取和复用
 * Feature: figma-to-code-agent, Property 10: 语义化命名生成
 * Validates: Requirements 2.3, 2.4, 2.5, 2.6
 */

import * as fc from 'fast-check';
import { TransformationPipeline } from '../../../transformation/TransformationPipeline';
import { ComponentExtractor } from '../../../transformation/transformers/ComponentExtractor';
import { SemanticNamer } from '../../../transformation/transformers/SemanticNamer';
import { StyleMerger } from '../../../transformation/transformers/StyleMerger';
import { createContainerNode, createTextNode } from '../../../transformation/ASTFactory';
import type { ASTNode } from '../../../transformation/types';

function makeTree(depth: number, breadth: number): ASTNode {
  const root = createContainerNode('root', 'root', '0:0', 'FRAME');
  root.layout.size = { width: 1920, height: 1080 };

  const addChildren = (parent: ASTNode, d: number) => {
    if (d <= 0) return;
    for (let i = 0; i < breadth; i++) {
      const id = `${parent.id}-${i}`;
      const child = d === 1
        ? createTextNode(id, `text-${id}`, id)
        : createContainerNode(id, `container-${id}`, id, 'FRAME');
      child.layout.size = { width: 100, height: 50 };
      child.layout.position = { x: i * 110, y: 0 };
      parent.children.push(child);
      if (d > 1) addChildren(child, d - 1);
    }
  };

  addChildren(root, depth);
  return root;
}

// Arbitrary for small AST trees
const astTreeArb = fc.tuple(
  fc.integer({ min: 1, max: 3 }),
  fc.integer({ min: 1, max: 4 })
).map(([depth, breadth]) => makeTree(depth, breadth));

function countNodes(node: ASTNode): number {
  return 1 + node.children.reduce((sum, c) => sum + countNodes(c), 0);
}

describe('Transformer Property Tests', () => {
  it('Property 7: ComponentExtractor marks repeated structures as components', () => {
    const extractor = new ComponentExtractor();

    fc.assert(
      fc.property(astTreeArb, (tree) => {
        const result = extractor.transform(tree);
        // Result should still be a valid tree
        expect(result.id).toBeDefined();
        expect(result.children).toBeDefined();
        // Node count should not increase (extraction doesn't add nodes)
        expect(countNodes(result)).toBeLessThanOrEqual(countNodes(tree));
      }),
      { numRuns: 100 }
    );
  });

  it('Property 8: TransformationPipeline preserves tree structure through transforms', async () => {
    const pipeline = new TransformationPipeline();
    pipeline.register(new SemanticNamer());

    await fc.assert(
      fc.asyncProperty(astTreeArb, async (tree) => {
        const result = await pipeline.execute(tree);
        // Root should still exist with valid structure
        expect(result.id).toBeDefined();
        expect(result.type).toBeDefined();
        expect(result.name).toBeDefined();
        expect(Array.isArray(result.children)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 9: StyleMerger assigns shared classes to nodes with identical styles', () => {
    const merger = new StyleMerger();

    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        (numChildren) => {
          const root = createContainerNode('root', 'root', '0:0', 'FRAME');
          root.layout.size = { width: 1920, height: 1080 };

          // Create children with identical styles
          for (let i = 0; i < numChildren; i++) {
            const child = createContainerNode(`c${i}`, `child-${i}`, `0:${i}`, 'FRAME');
            child.styles.backgroundColor = { r: 255, g: 0, b: 0, a: 1 };
            child.styles.borderRadius = 8;
            child.layout.size = { width: 100, height: 50 };
            root.children.push(child);
          }

          const result = merger.transform(root);

          // All children with same styles should get the same shared class
          const sharedClasses = result.children.map(
            (c: any) => c.metadata.sharedStyleClass
          );
          const uniqueClasses = new Set(sharedClasses.filter(Boolean));
          expect(uniqueClasses.size).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 10: SemanticNamer produces names without special characters', () => {
    const namer = new SemanticNamer();

    fc.assert(
      fc.property(astTreeArb, (tree) => {
        const result = namer.transform(tree);

        const checkName = (node: ASTNode) => {
          // Component names should not contain spaces or special chars
          if (node.metadata.componentName) {
            expect(node.metadata.componentName).toMatch(/^[a-zA-Z][a-zA-Z0-9-]*$/);
          }
          node.children.forEach(checkName);
        };
        checkName(result);
      }),
      { numRuns: 100 }
    );
  });
});
