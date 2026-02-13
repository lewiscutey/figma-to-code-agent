import { DesignTokenExtractor } from '../../tokens/DesignTokenExtractor';
import type { ASTNode } from '../../transformation/types';

function makeNode(overrides: Partial<ASTNode> = {}): ASTNode {
  return {
    id: 'n1',
    type: 'Container',
    name: 'test',
    children: [],
    layout: {
      display: 'block',
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
    ...overrides,
  } as ASTNode;
}

describe('DesignTokenExtractor', () => {
  const extractor = new DesignTokenExtractor();

  it('extracts color tokens from background colors', () => {
    const root = makeNode({
      styles: { backgroundColor: { r: 255, g: 0, b: 0, a: 1 } },
    });
    const tokens = extractor.extract(root);
    expect(tokens.colors).toHaveLength(1);
    expect(tokens.colors[0].css).toBe('rgba(255, 0, 0, 1)');
  });

  it('deduplicates identical colors', () => {
    const root = makeNode({
      children: [
        makeNode({ styles: { backgroundColor: { r: 0, g: 0, b: 0, a: 1 } } }),
        makeNode({ styles: { backgroundColor: { r: 0, g: 0, b: 0, a: 1 } } }),
      ],
    });
    const tokens = extractor.extract(root);
    expect(tokens.colors).toHaveLength(1);
  });

  it('extracts typography tokens', () => {
    const root = makeNode({
      styles: {
        typography: {
          fontFamily: 'Inter',
          fontSize: 16,
          fontWeight: 400,
          lineHeight: 24,
        },
      },
    });
    const tokens = extractor.extract(root);
    expect(tokens.typography).toHaveLength(1);
    expect(tokens.typography[0].fontFamily).toBe('Inter');
    expect(tokens.typography[0].name).toBe('text-base-regular');
  });

  it('extracts spacing tokens from padding', () => {
    const root = makeNode({
      layout: {
        display: 'flex',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        padding: { top: 8, right: 16, bottom: 8, left: 16 },
      },
    });
    const tokens = extractor.extract(root);
    expect(tokens.spacing).toHaveLength(2); // 8 and 16
    expect(tokens.spacing[0].value).toBe(8);
    expect(tokens.spacing[1].value).toBe(16);
  });

  it('extracts spacing from gap', () => {
    const root = makeNode({
      layout: {
        display: 'flex',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        gap: 12,
      },
    });
    const tokens = extractor.extract(root);
    expect(tokens.spacing).toHaveLength(1);
    expect(tokens.spacing[0].value).toBe(12);
  });

  it('extracts border radius tokens', () => {
    const root = makeNode({
      styles: { borderRadius: 8 },
    });
    const tokens = extractor.extract(root);
    expect(tokens.borderRadius).toHaveLength(1);
    expect(tokens.borderRadius[0].value).toBe(8);
  });

  it('extracts box shadow effects', () => {
    const root = makeNode({
      styles: {
        boxShadow: [{
          type: 'drop-shadow',
          offsetX: 0,
          offsetY: 4,
          blur: 8,
          spread: 0,
          color: { r: 0, g: 0, b: 0, a: 0.25 },
        }],
      },
    });
    const tokens = extractor.extract(root);
    expect(tokens.effects).toHaveLength(1);
    expect(tokens.effects[0].type).toBe('drop-shadow');
  });

  it('generates correct color names for white/black', () => {
    const root = makeNode({
      children: [
        makeNode({ styles: { backgroundColor: { r: 255, g: 255, b: 255, a: 1 } } }),
        makeNode({ styles: { backgroundColor: { r: 0, g: 0, b: 0, a: 1 } } }),
        makeNode({ styles: { backgroundColor: { r: 0, g: 0, b: 0, a: 0.5 } } }),
      ],
    });
    const tokens = extractor.extract(root);
    const names = tokens.colors.map((c) => c.name);
    expect(names).toContain('white');
    expect(names).toContain('black');
    expect(names).toContain('black-transparent');
  });

  it('returns empty tokens for a node with no styles', () => {
    const root = makeNode();
    const tokens = extractor.extract(root);
    expect(tokens.colors).toHaveLength(0);
    expect(tokens.typography).toHaveLength(0);
    expect(tokens.spacing).toHaveLength(0);
    expect(tokens.effects).toHaveLength(0);
    expect(tokens.borderRadius).toHaveLength(0);
  });
});
