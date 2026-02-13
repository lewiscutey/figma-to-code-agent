import { PerformanceOptimizer } from '../../../transformation/transformers/PerformanceOptimizer';
import type { ASTNode } from '../../../transformation/types';

function makeNode(overrides: Partial<ASTNode> = {}): ASTNode {
  return {
    id: overrides.id || 'n1',
    type: overrides.type || 'Container',
    name: overrides.name || 'test',
    children: overrides.children || [],
    layout: {
      display: 'block',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
      ...overrides.layout,
    },
    styles: { ...overrides.styles },
    metadata: { figmaId: '1:1', figmaType: 'FRAME', isComponent: false, exportable: false, ...overrides.metadata },
  } as ASTNode;
}

describe('PerformanceOptimizer', () => {
  const optimizer = new PerformanceOptimizer(200, 5);

  it('marks below-fold images for lazy loading', () => {
    const root = makeNode({
      children: [
        makeNode({
          type: 'Image',
          name: 'hero',
          layout: { display: 'block', position: { x: 0, y: 50 }, size: { width: 300, height: 200 } },
        }),
        makeNode({
          type: 'Image',
          name: 'footer-img',
          layout: { display: 'block', position: { x: 0, y: 500 }, size: { width: 300, height: 200 } },
        }),
      ],
    });
    const result = optimizer.transform(root);
    expect((result.children[0].metadata as any).performance?.lazyLoad).toBeUndefined();
    expect((result.children[1].metadata as any).performance?.lazyLoad).toBe(true);
  });

  it('marks large images for explicit dimensions', () => {
    const root = makeNode({
      children: [
        makeNode({
          type: 'Image',
          name: 'big-img',
          layout: { display: 'block', position: { x: 0, y: 0 }, size: { width: 500, height: 300 } },
        }),
        makeNode({ id: 'sibling', name: 'sibling' }),
      ],
    });
    const result = optimizer.transform(root);
    const imgNode = result.children.find((c) => c.name === 'big-img');
    expect(imgNode).toBeDefined();
    expect((imgNode!.metadata as any).performance?.explicitDimensions).toBe(true);
  });

  it('suggests code splitting for large component trees', () => {
    const children = Array.from({ length: 10 }, (_, i) =>
      makeNode({ id: `c-${i}`, name: `child-${i}` }),
    );
    const root = makeNode({
      type: 'Component',
      metadata: { figmaId: '1:1', figmaType: 'FRAME', isComponent: true, exportable: false },
      children,
    });
    const result = optimizer.transform(root);
    expect((result.metadata as any).performance?.codeSplit).toBe(true);
  });

  it('removes redundant single-child wrappers', () => {
    const innerContent = makeNode({ id: 'inner', name: 'real-content', children: [makeNode({ id: 'leaf', name: 'leaf' })] });
    const wrapper = makeNode({ id: 'wrapper', name: 'wrapper', children: [innerContent] });
    const root = makeNode({ children: [wrapper, makeNode({ id: 'other', name: 'other' })] });
    const result = optimizer.transform(root);
    // Wrapper should be removed, innerContent should be direct child
    expect(result.children[0].name).toBe('real-content');
  });

  it('keeps wrappers with meaningful styles', () => {
    const inner = makeNode({ id: 'inner', name: 'content', children: [makeNode({ id: 'leaf', name: 'leaf' })] });
    const wrapper = makeNode({
      id: 'wrapper',
      name: 'styled-wrapper',
      styles: { backgroundColor: { r: 255, g: 0, b: 0, a: 1 } },
      children: [inner],
    });
    const root = makeNode({ children: [wrapper, makeNode({ id: 'other', name: 'other' })] });
    const result = optimizer.transform(root);
    expect(result.children[0].name).toBe('styled-wrapper');
  });
});
