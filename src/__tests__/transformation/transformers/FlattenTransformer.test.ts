import { FlattenTransformer } from '../../../transformation/transformers/FlattenTransformer';
import { createContainerNode, createTextNode } from '../../../transformation/ASTFactory';

describe('FlattenTransformer', () => {
  let transformer: FlattenTransformer;

  beforeEach(() => {
    transformer = new FlattenTransformer();
  });

  it('should flatten single-child containers without styles', () => {
    const child = createTextNode('2', 'Text', '1:2');
    const parent = createContainerNode('1', 'Container', '1:1', 'FRAME');
    parent.children = [child];
    child.parent = parent;

    const result = transformer.transform(parent);

    expect(result.type).toBe('Text');
    expect(result.name).toBe('Text');
  });

  it('should not flatten containers with multiple children', () => {
    const child1 = createTextNode('2', 'Text1', '1:2');
    const child2 = createTextNode('3', 'Text2', '1:3');
    const parent = createContainerNode('1', 'Container', '1:1', 'FRAME');
    parent.children = [child1, child2];
    child1.parent = parent;
    child2.parent = parent;

    const result = transformer.transform(parent);

    expect(result.type).toBe('Container');
    expect(result.children).toHaveLength(2);
  });

  it('should not flatten containers with background color', () => {
    const child = createTextNode('2', 'Text', '1:2');
    const parent = createContainerNode('1', 'Container', '1:1', 'FRAME');
    parent.children = [child];
    parent.styles.backgroundColor = { r: 255, g: 0, b: 0, a: 1 };
    child.parent = parent;

    const result = transformer.transform(parent);

    expect(result.type).toBe('Container');
  });

  it('should not flatten containers with border radius', () => {
    const child = createTextNode('2', 'Text', '1:2');
    const parent = createContainerNode('1', 'Container', '1:1', 'FRAME');
    parent.children = [child];
    parent.styles.borderRadius = 8;
    child.parent = parent;

    const result = transformer.transform(parent);

    expect(result.type).toBe('Container');
  });

  it('should not flatten containers with padding', () => {
    const child = createTextNode('2', 'Text', '1:2');
    const parent = createContainerNode('1', 'Container', '1:1', 'FRAME');
    parent.children = [child];
    parent.layout.padding = { top: 10, right: 10, bottom: 10, left: 10 };
    child.parent = parent;

    const result = transformer.transform(parent);

    expect(result.type).toBe('Container');
  });

  it('should not flatten flex containers', () => {
    const child = createTextNode('2', 'Text', '1:2');
    const parent = createContainerNode('1', 'Container', '1:1', 'FRAME');
    parent.children = [child];
    parent.layout.display = 'flex';
    parent.layout.flexDirection = 'row';
    child.parent = parent;

    const result = transformer.transform(parent);

    expect(result.type).toBe('Container');
  });

  it('should recursively flatten nested containers', () => {
    const text = createTextNode('3', 'Text', '1:3');
    const inner = createContainerNode('2', 'Inner', '1:2', 'FRAME');
    const outer = createContainerNode('1', 'Outer', '1:1', 'FRAME');

    inner.children = [text];
    text.parent = inner;

    outer.children = [inner];
    inner.parent = outer;

    const result = transformer.transform(outer);

    expect(result.type).toBe('Text');
    expect(result.name).toBe('Text');
  });
});
