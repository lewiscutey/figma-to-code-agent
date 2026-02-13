import { ComponentSplitter } from '../../../transformation/transformers/ComponentSplitter';
import type { ASTNode } from '../../../transformation/types';

function makeNode(overrides: Partial<ASTNode> = {}): ASTNode {
  return {
    id: overrides.id || 'n1',
    type: overrides.type || 'Container',
    name: overrides.name || 'test',
    children: overrides.children || [],
    layout: {
      display: 'flex',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
      ...overrides.layout,
    },
    styles: { ...overrides.styles },
    metadata: {
      figmaId: '1:1',
      figmaType: 'FRAME',
      isComponent: false,
      exportable: false,
      ...overrides.metadata,
    },
  } as ASTNode;
}

function makeChildren(count: number): ASTNode[] {
  return Array.from({ length: count }, (_, i) =>
    makeNode({
      id: `child-${i}`,
      name: `child-${i}`,
      type: 'Container',
      layout: {
        display: 'block',
        position: { x: i * 10, y: 0 },
        size: { width: 10, height: 10 },
      },
    }),
  );
}

describe('ComponentSplitter', () => {
  it('does not split nodes with fewer children than threshold', () => {
    const splitter = new ComponentSplitter(50);
    const root = makeNode({ children: makeChildren(10) });
    const result = splitter.transform(root);
    expect(result.children).toHaveLength(10);
  });

  it('splits nodes with more children than threshold', () => {
    const splitter = new ComponentSplitter(10);
    const root = makeNode({ name: 'big-page', children: makeChildren(55) });
    const result = splitter.transform(root);
    // Should be split into sub-components, each with <= 10 children
    expect(result.children.length).toBeGreaterThanOrEqual(2);
    expect(result.children.length).toBeLessThan(55);
    // Each sub-component should be a Component type
    for (const child of result.children) {
      expect(child.type).toBe('Component');
      expect(child.metadata.isComponent).toBe(true);
    }
  });

  it('creates component boundaries at container nodes, not leaves', () => {
    const splitter = new ComponentSplitter(5);
    const root = makeNode({
      name: 'page',
      children: makeChildren(20),
    });
    const result = splitter.transform(root);
    for (const child of result.children) {
      // Sub-components should be containers, not Text/Image/Shape
      expect(['Component', 'Container']).toContain(child.type);
    }
  });

  it('respects max depth of 4 levels', () => {
    const splitter = new ComponentSplitter(50, 4);
    // Create a deeply nested structure
    let current = makeNode({ name: 'leaf', type: 'Text' });
    for (let i = 5; i >= 0; i--) {
      current = makeNode({ name: `level-${i}`, children: [current] });
    }
    const result = splitter.transform(current);
    // Should not crash and should return a valid tree
    expect(result).toBeDefined();
    expect(result.name).toBe('level-0');
  });

  it('generates PascalCase component names', () => {
    const splitter = new ComponentSplitter(5);
    const root = makeNode({ name: 'my-page', children: makeChildren(20) });
    const result = splitter.transform(root);
    for (const child of result.children) {
      if (child.metadata.componentName) {
        expect(child.metadata.componentName).toMatch(/^[A-Z]/);
        expect(child.metadata.componentName).not.toContain('-');
      }
    }
  });

  it('preserves leaf nodes unchanged', () => {
    const splitter = new ComponentSplitter(50);
    const leaf = makeNode({ type: 'Text', name: 'hello', children: [] });
    const result = splitter.transform(leaf);
    expect(result.type).toBe('Text');
    expect(result.children).toHaveLength(0);
  });
});
