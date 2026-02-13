import { AccessibilityEnhancer } from '../../../transformation/transformers/AccessibilityEnhancer';
import type { ASTNode } from '../../../transformation/types';

function makeNode(overrides: Partial<ASTNode> = {}): ASTNode {
  return {
    id: overrides.id || 'n1',
    type: overrides.type || 'Container',
    name: overrides.name || 'test',
    children: overrides.children || [],
    layout: overrides.layout || { display: 'block', position: { x: 0, y: 0 }, size: { width: 100, height: 100 } },
    styles: { ...overrides.styles },
    metadata: { figmaId: '1:1', figmaType: 'FRAME', isComponent: false, exportable: false, ...overrides.metadata },
  } as ASTNode;
}

describe('AccessibilityEnhancer', () => {
  const enhancer = new AccessibilityEnhancer();

  it('adds role=img and alt to Image nodes', () => {
    const root = makeNode({
      children: [makeNode({ type: 'Image', name: 'hero-banner' })],
    });
    const result = enhancer.transform(root);
    const a11y = (result.children[0].metadata as any).accessibility;
    expect(a11y.role).toBe('img');
    expect(a11y.alt).toBe('Hero Banner');
  });

  it('adds heading role to large text', () => {
    const root = makeNode({
      children: [
        makeNode({
          type: 'Text',
          name: 'title',
          styles: { typography: { fontFamily: 'Inter', fontSize: 32, fontWeight: 700, lineHeight: 40 } },
        }),
      ],
    });
    const result = enhancer.transform(root);
    const a11y = (result.children[0].metadata as any).accessibility;
    expect(a11y.role).toBe('heading');
    expect(a11y.ariaLevel).toBe('1');
  });

  it('adds navigation role to nav-like containers', () => {
    const root = makeNode({
      name: 'main-nav',
      children: [
        makeNode({ name: 'link-1' }),
        makeNode({ name: 'link-2' }),
      ],
    });
    const result = enhancer.transform(root);
    const a11y = (result.metadata as any).accessibility;
    expect(a11y.role).toBe('navigation');
  });

  it('adds button role to button-like elements', () => {
    const root = makeNode({
      children: [
        makeNode({
          name: 'submit-button',
          styles: { backgroundColor: { r: 0, g: 100, b: 255, a: 1 }, borderRadius: 8 },
          children: [makeNode({ type: 'Text', name: 'Submit' })],
        }),
      ],
    });
    const result = enhancer.transform(root);
    const a11y = (result.children[0].metadata as any).accessibility;
    expect(a11y.role).toBe('button');
    expect(a11y.tabIndex).toBe('0');
  });

  it('adds list role to repeated same-type children', () => {
    const root = makeNode({
      layout: { display: 'flex' as const, position: { x: 0, y: 0 }, size: { width: 400, height: 200 } },
      children: [
        makeNode({ type: 'Text', name: 'item-1' }),
        makeNode({ type: 'Text', name: 'item-2' }),
        makeNode({ type: 'Text', name: 'item-3' }),
      ],
    });
    const result = enhancer.transform(root);
    const a11y = (result.metadata as any).accessibility;
    expect(a11y).toBeDefined();
    expect(a11y.role).toBe('list');
  });

  it('does not add a11y to plain containers', () => {
    const root = makeNode({ name: 'wrapper' });
    const result = enhancer.transform(root);
    expect((result.metadata as any).accessibility).toBeUndefined();
  });
});
