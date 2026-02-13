import { ResponsiveMerger } from '../../../transformation/transformers/ResponsiveMerger';
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
    styles: {},
    metadata: { figmaId: '1:1', figmaType: 'FRAME', isComponent: false, exportable: false },
  } as ASTNode;
}

describe('ResponsiveMerger', () => {
  const merger = new ResponsiveMerger();

  it('merges breakpoint variants with same base name', () => {
    const root = makeNode({
      children: [
        makeNode({ id: 'a', name: 'hero-mobile', layout: { display: 'flex', position: { x: 0, y: 0 }, size: { width: 375, height: 600 } } }),
        makeNode({ id: 'b', name: 'hero-desktop', layout: { display: 'flex', position: { x: 0, y: 0 }, size: { width: 1440, height: 800 } } }),
      ],
    });
    const result = merger.transform(root);
    expect(result.children).toHaveLength(1);
    expect(result.children[0].name).toBe('hero');
    expect((result.children[0].metadata as any).responsive).toBe(true);
  });

  it('does not merge nodes with different base names', () => {
    const root = makeNode({
      children: [
        makeNode({ id: 'a', name: 'header', layout: { display: 'block', position: { x: 0, y: 0 }, size: { width: 375, height: 60 } } }),
        makeNode({ id: 'b', name: 'footer', layout: { display: 'block', position: { x: 0, y: 0 }, size: { width: 1440, height: 100 } } }),
      ],
    });
    const result = merger.transform(root);
    expect(result.children).toHaveLength(2);
  });

  it('does not merge single variants', () => {
    const root = makeNode({
      children: [
        makeNode({ id: 'a', name: 'card-mobile', layout: { display: 'block', position: { x: 0, y: 0 }, size: { width: 375, height: 200 } } }),
      ],
    });
    const result = merger.transform(root);
    expect(result.children).toHaveLength(1);
    expect(result.children[0].name).toBe('card-mobile');
  });

  it('preserves breakpoint data in metadata', () => {
    const root = makeNode({
      children: [
        makeNode({ id: 'a', name: 'nav-sm', layout: { display: 'flex', position: { x: 0, y: 0 }, size: { width: 320, height: 50 } } }),
        makeNode({ id: 'b', name: 'nav-lg', layout: { display: 'flex', position: { x: 0, y: 0 }, size: { width: 1200, height: 80 } } }),
      ],
    });
    const result = merger.transform(root);
    const breakpoints = (result.children[0].metadata as any).breakpoints;
    expect(breakpoints).toBeDefined();
    expect(breakpoints).toHaveLength(2);
  });
});
