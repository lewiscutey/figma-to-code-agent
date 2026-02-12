/**
 * Unit tests for AST Factory functions
 */

import {
  createPosition,
  createSize,
  createSpacing,
  createColor,
  createLayoutInfo,
  createStyleInfo,
  createNodeMetadata,
  createASTNode,
  createRootNode,
  createPageNode,
  createContainerNode,
  createComponentNode,
  createTextNode,
  createImageNode,
  createShapeNode,
  addChild,
  removeChild,
  cloneNode,
} from '../../transformation/ASTFactory';

describe('ASTFactory - Basic Helpers', () => {
  test('createPosition creates position with default values', () => {
    const pos = createPosition();
    expect(pos).toEqual({ x: 0, y: 0 });
  });

  test('createPosition creates position with custom values', () => {
    const pos = createPosition(10, 20);
    expect(pos).toEqual({ x: 10, y: 20 });
  });

  test('createSize creates size with default values', () => {
    const size = createSize();
    expect(size).toEqual({ width: 0, height: 0 });
  });

  test('createSize creates size with custom values', () => {
    const size = createSize(100, 200);
    expect(size).toEqual({ width: 100, height: 200 });
  });

  test('createSpacing creates uniform spacing', () => {
    const spacing = createSpacing(10);
    expect(spacing).toEqual({ top: 10, right: 10, bottom: 10, left: 10 });
  });

  test('createSpacing creates custom spacing', () => {
    const spacing = createSpacing(10, 20, 30, 40);
    expect(spacing).toEqual({ top: 10, right: 20, bottom: 30, left: 40 });
  });

  test('createColor creates RGBA color', () => {
    const color = createColor(255, 128, 64, 0.5);
    expect(color).toEqual({ r: 255, g: 128, b: 64, a: 0.5 });
  });

  test('createColor defaults alpha to 1', () => {
    const color = createColor(255, 128, 64);
    expect(color).toEqual({ r: 255, g: 128, b: 64, a: 1 });
  });
});

describe('ASTFactory - Layout and Style', () => {
  test('createLayoutInfo creates default layout', () => {
    const layout = createLayoutInfo();
    expect(layout.display).toBe('block');
    expect(layout.position).toEqual({ x: 0, y: 0 });
    expect(layout.size).toEqual({ width: 0, height: 0 });
  });

  test('createLayoutInfo accepts overrides', () => {
    const layout = createLayoutInfo({
      display: 'flex',
      flexDirection: 'row',
      gap: 10,
    });
    expect(layout.display).toBe('flex');
    expect(layout.flexDirection).toBe('row');
    expect(layout.gap).toBe(10);
  });

  test('createStyleInfo creates empty style by default', () => {
    const style = createStyleInfo();
    expect(style).toEqual({});
  });

  test('createStyleInfo accepts overrides', () => {
    const style = createStyleInfo({
      opacity: 0.8,
      borderRadius: 8,
    });
    expect(style.opacity).toBe(0.8);
    expect(style.borderRadius).toBe(8);
  });

  test('createNodeMetadata creates metadata with required fields', () => {
    const metadata = createNodeMetadata('figma-123', 'FRAME');
    expect(metadata).toEqual({
      figmaId: 'figma-123',
      figmaType: 'FRAME',
      isComponent: false,
      exportable: true,
    });
  });

  test('createNodeMetadata accepts overrides', () => {
    const metadata = createNodeMetadata('figma-123', 'COMPONENT', {
      isComponent: true,
      componentName: 'Button',
    });
    expect(metadata.isComponent).toBe(true);
    expect(metadata.componentName).toBe('Button');
  });
});

describe('ASTFactory - Node Creation', () => {
  test('createASTNode creates a complete node', () => {
    const node = createASTNode({
      id: 'node-1',
      type: 'Container',
      name: 'MyContainer',
      metadata: createNodeMetadata('figma-1', 'FRAME'),
    });

    expect(node.id).toBe('node-1');
    expect(node.type).toBe('Container');
    expect(node.name).toBe('MyContainer');
    expect(node.children).toEqual([]);
    expect(node.parent).toBeUndefined();
    expect(node.layout).toBeDefined();
    expect(node.styles).toBeDefined();
    expect(node.metadata).toBeDefined();
  });

  test('createRootNode creates a root node', () => {
    const root = createRootNode('root-1', 'Document', 'figma-doc');
    expect(root.type).toBe('Root');
    expect(root.name).toBe('Document');
    expect(root.metadata.figmaType).toBe('DOCUMENT');
    expect(root.metadata.exportable).toBe(false);
  });

  test('createPageNode creates a page node', () => {
    const page = createPageNode('page-1', 'Page 1', 'figma-page');
    expect(page.type).toBe('Page');
    expect(page.name).toBe('Page 1');
    expect(page.metadata.figmaType).toBe('CANVAS');
  });

  test('createContainerNode creates a container node', () => {
    const container = createContainerNode('container-1', 'Container', 'figma-frame', 'FRAME', {
      display: 'flex',
    });
    expect(container.type).toBe('Container');
    expect(container.layout.display).toBe('flex');
  });

  test('createComponentNode creates a component node', () => {
    const component = createComponentNode('comp-1', 'Button', 'figma-comp', 'Button');
    expect(component.type).toBe('Component');
    expect(component.metadata.isComponent).toBe(true);
    expect(component.metadata.componentName).toBe('Button');
  });

  test('createTextNode creates a text node', () => {
    const text = createTextNode('text-1', 'Hello', 'figma-text');
    expect(text.type).toBe('Text');
    expect(text.metadata.figmaType).toBe('TEXT');
  });

  test('createImageNode creates an image node', () => {
    const image = createImageNode('img-1', 'Logo', 'figma-img');
    expect(image.type).toBe('Image');
    expect(image.metadata.figmaType).toBe('IMAGE');
  });

  test('createShapeNode creates a shape node', () => {
    const shape = createShapeNode('shape-1', 'Rectangle', 'figma-rect', 'RECTANGLE');
    expect(shape.type).toBe('Shape');
    expect(shape.metadata.figmaType).toBe('RECTANGLE');
  });
});

describe('ASTFactory - Tree Operations', () => {
  test('addChild adds a child to parent', () => {
    const parent = createContainerNode('p1', 'Parent', 'figma-p', 'FRAME');
    const child = createTextNode('c1', 'Child', 'figma-c');

    addChild(parent, child);

    expect(parent.children).toHaveLength(1);
    expect(parent.children[0]).toBe(child);
    expect(child.parent).toBe(parent);
  });

  test('addChild can add multiple children', () => {
    const parent = createContainerNode('p1', 'Parent', 'figma-p', 'FRAME');
    const child1 = createTextNode('c1', 'Child1', 'figma-c1');
    const child2 = createTextNode('c2', 'Child2', 'figma-c2');

    addChild(parent, child1);
    addChild(parent, child2);

    expect(parent.children).toHaveLength(2);
    expect(parent.children[0]).toBe(child1);
    expect(parent.children[1]).toBe(child2);
  });

  test('removeChild removes a child from parent', () => {
    const parent = createContainerNode('p1', 'Parent', 'figma-p', 'FRAME');
    const child = createTextNode('c1', 'Child', 'figma-c');

    addChild(parent, child);
    const removed = removeChild(parent, child);

    expect(removed).toBe(true);
    expect(parent.children).toHaveLength(0);
    expect(child.parent).toBeUndefined();
  });

  test('removeChild returns false for non-existent child', () => {
    const parent = createContainerNode('p1', 'Parent', 'figma-p', 'FRAME');
    const child = createTextNode('c1', 'Child', 'figma-c');

    const removed = removeChild(parent, child);

    expect(removed).toBe(false);
  });

  test('cloneNode creates a shallow copy', () => {
    const original = createContainerNode('c1', 'Container', 'figma-c', 'FRAME');
    const child = createTextNode('t1', 'Text', 'figma-t');
    addChild(original, child);

    const cloned = cloneNode(original, false);

    expect(cloned.id).toBe(original.id);
    expect(cloned.type).toBe(original.type);
    expect(cloned.children).toHaveLength(1);
    expect(cloned.children[0]).toBe(child); // Same reference
  });

  test('cloneNode creates a deep copy', () => {
    const original = createContainerNode('c1', 'Container', 'figma-c', 'FRAME');
    const child = createTextNode('t1', 'Text', 'figma-t');
    addChild(original, child);

    const cloned = cloneNode(original, true);

    expect(cloned.id).toBe(original.id);
    expect(cloned.type).toBe(original.type);
    expect(cloned.children).toHaveLength(1);
    expect(cloned.children[0]).not.toBe(child); // Different reference
    expect(cloned.children[0].id).toBe(child.id); // But same data
  });
});

describe('ASTFactory - Edge Cases', () => {
  test('node can have empty children array', () => {
    const node = createContainerNode('n1', 'Node', 'figma-n', 'FRAME');
    expect(node.children).toEqual([]);
  });

  test('node can have undefined parent', () => {
    const node = createContainerNode('n1', 'Node', 'figma-n', 'FRAME');
    expect(node.parent).toBeUndefined();
  });

  test('layout can have optional properties', () => {
    const layout = createLayoutInfo({
      display: 'flex',
      flexDirection: 'column',
    });
    expect(layout.gap).toBeUndefined();
    expect(layout.padding).toBeUndefined();
  });

  test('styles can be completely empty', () => {
    const styles = createStyleInfo();
    expect(Object.keys(styles)).toHaveLength(0);
  });
});
