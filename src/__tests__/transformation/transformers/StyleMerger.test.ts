import { StyleMerger } from '../../../transformation/transformers/StyleMerger';
import type { ASTNode } from '../../../transformation/types';

function makeNode(overrides: Partial<ASTNode> = {}): ASTNode {
  return {
    id: overrides.id || 'n1',
    type: overrides.type || 'Container',
    name: overrides.name || 'test',
    children: overrides.children || [],
    layout: { display: 'block', position: { x: 0, y: 0 }, size: { width: 100, height: 100 } },
    styles: { ...overrides.styles },
    metadata: { figmaId: '1:1', figmaType: 'FRAME', isComponent: false, exportable: false, ...overrides.metadata },
  } as ASTNode;
}

describe('StyleMerger', () => {
  const merger = new StyleMerger();

  it('assigns shared style class to nodes with identical styles', () => {
    const root = makeNode({
      children: [
        makeNode({ id: 'a', styles: { backgroundColor: { r: 255, g: 0, b: 0, a: 1 } } }),
        makeNode({ id: 'b', styles: { backgroundColor: { r: 255, g: 0, b: 0, a: 1 } } }),
      ],
    });
    const result = merger.transform(root);
    const classA = (result.children[0].metadata as any).sharedStyleClass;
    const classB = (result.children[1].metadata as any).sharedStyleClass;
    expect(classA).toBeDefined();
    expect(classA).toBe(classB);
  });

  it('assigns different classes for different styles', () => {
    const root = makeNode({
      children: [
        makeNode({ id: 'a', styles: { backgroundColor: { r: 255, g: 0, b: 0, a: 1 } } }),
        makeNode({ id: 'b', styles: { backgroundColor: { r: 0, g: 0, b: 255, a: 1 } } }),
      ],
    });
    const result = merger.transform(root);
    const classA = (result.children[0].metadata as any).sharedStyleClass;
    const classB = (result.children[1].metadata as any).sharedStyleClass;
    expect(classA).not.toBe(classB);
  });

  it('does not assign class to nodes with no styles', () => {
    const root = makeNode({ children: [makeNode({ id: 'a' })] });
    const result = merger.transform(root);
    expect((result.children[0].metadata as any).sharedStyleClass).toBeUndefined();
  });

  it('handles typography styles', () => {
    const typo = { fontFamily: 'Inter', fontSize: 16, fontWeight: 400, lineHeight: 24 };
    const root = makeNode({
      children: [
        makeNode({ id: 'a', styles: { typography: typo } }),
        makeNode({ id: 'b', styles: { typography: typo } }),
      ],
    });
    const result = merger.transform(root);
    const classA = (result.children[0].metadata as any).sharedStyleClass;
    const classB = (result.children[1].metadata as any).sharedStyleClass;
    expect(classA).toBe(classB);
  });
});
