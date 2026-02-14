import { LayoutOptimizer } from '../../../transformation/transformers/LayoutOptimizer';
import { createContainerNode } from '../../../transformation/ASTFactory';

describe('LayoutOptimizer', () => {
  let optimizer: LayoutOptimizer;

  beforeEach(() => {
    optimizer = new LayoutOptimizer();
  });

  it('should convert absolute to flex for horizontally aligned children', () => {
    const parent = createContainerNode('1', 'Parent', '1:1', 'FRAME');
    parent.layout.display = 'absolute';

    const child1 = createContainerNode('2', 'Child1', '1:2', 'FRAME');
    child1.layout.position = { x: 0, y: 0 };

    const child2 = createContainerNode('3', 'Child2', '1:3', 'FRAME');
    child2.layout.position = { x: 100, y: 0 };

    parent.children = [child1, child2];

    const result = optimizer.transform(parent);

    expect(result.layout.display).toBe('flex');
    expect(result.layout.flexDirection).toBe('row');
  });

  it('should convert absolute to flex for vertically aligned children', () => {
    const parent = createContainerNode('1', 'Parent', '1:1', 'FRAME');
    parent.layout.display = 'absolute';

    const child1 = createContainerNode('2', 'Child1', '1:2', 'FRAME');
    child1.layout.position = { x: 0, y: 0 };

    const child2 = createContainerNode('3', 'Child2', '1:3', 'FRAME');
    child2.layout.position = { x: 0, y: 100 };

    parent.children = [child1, child2];

    const result = optimizer.transform(parent);

    expect(result.layout.display).toBe('flex');
    expect(result.layout.flexDirection).toBe('column');
  });

  it('should not convert absolute with single child', () => {
    const parent = createContainerNode('1', 'Parent', '1:1', 'FRAME');
    parent.layout.display = 'absolute';

    const child = createContainerNode('2', 'Child', '1:2', 'FRAME');
    parent.children = [child];

    const result = optimizer.transform(parent);

    expect(result.layout.display).toBe('absolute');
  });

  it('should recursively optimize children', () => {
    const root = createContainerNode('1', 'Root', '1:1', 'FRAME');
    const child = createContainerNode('2', 'Child', '1:2', 'FRAME');
    child.layout.display = 'absolute';

    const grandchild1 = createContainerNode('3', 'GC1', '1:3', 'FRAME');
    grandchild1.layout.position = { x: 0, y: 0 };

    const grandchild2 = createContainerNode('4', 'GC2', '1:4', 'FRAME');
    grandchild2.layout.position = { x: 100, y: 0 };

    child.children = [grandchild1, grandchild2];
    root.children = [child];

    const result = optimizer.transform(root);

    expect(result.children[0].layout.display).toBe('flex');
  });
});

describe('LayoutOptimizer - block to flex conversion', () => {
  let optimizer: LayoutOptimizer;

  beforeEach(() => {
    optimizer = new LayoutOptimizer();
  });

  it('should convert block to flex for horizontally aligned children', () => {
    const parent = createContainerNode('1', 'Parent', '1:1', 'FRAME');
    parent.layout.display = 'block';
    parent.layout.position = { x: 0, y: 0 };
    parent.layout.size = { width: 400, height: 100 };

    const child1 = createContainerNode('2', 'Child1', '1:2', 'FRAME');
    child1.layout.position = { x: 10, y: 10 };
    child1.layout.size = { width: 100, height: 80 };

    const child2 = createContainerNode('3', 'Child2', '1:3', 'FRAME');
    child2.layout.position = { x: 130, y: 10 };
    child2.layout.size = { width: 100, height: 80 };

    parent.children = [child1, child2];

    const result = optimizer.transform(parent);

    expect(result.layout.display).toBe('flex');
    expect(result.layout.flexDirection).toBe('row');
  });

  it('should convert block to flex for vertically aligned children', () => {
    const parent = createContainerNode('1', 'Parent', '1:1', 'FRAME');
    parent.layout.display = 'block';
    parent.layout.position = { x: 0, y: 0 };
    parent.layout.size = { width: 200, height: 400 };

    const child1 = createContainerNode('2', 'Child1', '1:2', 'FRAME');
    child1.layout.position = { x: 10, y: 10 };
    child1.layout.size = { width: 180, height: 80 };

    const child2 = createContainerNode('3', 'Child2', '1:3', 'FRAME');
    child2.layout.position = { x: 10, y: 110 };
    child2.layout.size = { width: 180, height: 80 };

    parent.children = [child1, child2];

    const result = optimizer.transform(parent);

    expect(result.layout.display).toBe('flex');
    expect(result.layout.flexDirection).toBe('column');
  });

  it('should infer consistent gap between children', () => {
    const parent = createContainerNode('1', 'Parent', '1:1', 'FRAME');
    parent.layout.display = 'block';
    parent.layout.position = { x: 0, y: 0 };
    parent.layout.size = { width: 500, height: 100 };

    const child1 = createContainerNode('2', 'C1', '1:2', 'FRAME');
    child1.layout.position = { x: 0, y: 0 };
    child1.layout.size = { width: 100, height: 80 };

    const child2 = createContainerNode('3', 'C2', '1:3', 'FRAME');
    child2.layout.position = { x: 120, y: 0 };
    child2.layout.size = { width: 100, height: 80 };

    const child3 = createContainerNode('4', 'C3', '1:4', 'FRAME');
    child3.layout.position = { x: 240, y: 0 };
    child3.layout.size = { width: 100, height: 80 };

    parent.children = [child1, child2, child3];

    const result = optimizer.transform(parent);

    expect(result.layout.display).toBe('flex');
    expect(result.layout.gap).toBe(20);
  });

  it('should not convert block to flex for overlapping children', () => {
    const parent = createContainerNode('1', 'Parent', '1:1', 'FRAME');
    parent.layout.display = 'block';
    parent.layout.position = { x: 0, y: 0 };
    parent.layout.size = { width: 200, height: 200 };

    const child1 = createContainerNode('2', 'C1', '1:2', 'FRAME');
    child1.layout.position = { x: 0, y: 0 };
    child1.layout.size = { width: 150, height: 150 };

    const child2 = createContainerNode('3', 'C2', '1:3', 'FRAME');
    child2.layout.position = { x: 50, y: 50 };
    child2.layout.size = { width: 150, height: 150 };

    parent.children = [child1, child2];

    const result = optimizer.transform(parent);

    expect(result.layout.display).toBe('block');
  });
});
