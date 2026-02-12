import { ASTParser } from '../../transformation/ASTParser';
import type { Node as FigmaNode } from '../../extraction/types';

describe('ASTParser', () => {
  let parser: ASTParser;

  beforeEach(() => {
    parser = new ASTParser();
  });

  describe('parse', () => {
    it('should parse a simple frame node', () => {
      const figmaNode: FigmaNode = {
        id: '1:1',
        name: 'Frame',
        type: 'FRAME',
        absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
        children: [],
      };

      const astNode = parser.parse(figmaNode);

      expect(astNode.type).toBe('Container');
      expect(astNode.name).toBe('Frame');
      expect(astNode.metadata.figmaId).toBe('1:1');
      expect(astNode.layout.size).toEqual({ width: 100, height: 100 });
    });

    it('should parse a text node', () => {
      const figmaNode: FigmaNode = {
        id: '1:2',
        name: 'Text',
        type: 'TEXT',
        absoluteBoundingBox: { x: 0, y: 0, width: 50, height: 20 },
        characters: 'Hello',
        style: {
          fontFamily: 'Arial',
          fontSize: 16,
          fontWeight: 400,
          lineHeightPx: 20,
        },
      };

      const astNode = parser.parse(figmaNode);

      expect(astNode.type).toBe('Text');
      expect(astNode.styles.typography).toBeDefined();
      expect(astNode.styles.typography?.fontFamily).toBe('Arial');
      expect(astNode.styles.typography?.fontSize).toBe(16);
    });

    it('should parse a component node', () => {
      const figmaNode: FigmaNode = {
        id: '1:3',
        name: 'Button',
        type: 'COMPONENT',
        absoluteBoundingBox: { x: 0, y: 0, width: 120, height: 40 },
        children: [],
      };

      const astNode = parser.parse(figmaNode);

      expect(astNode.type).toBe('Component');
      expect(astNode.metadata.isComponent).toBe(true);
      expect(astNode.metadata.componentName).toBe('Button');
    });

    it('should parse flex layout', () => {
      const figmaNode: FigmaNode = {
        id: '1:4',
        name: 'FlexContainer',
        type: 'FRAME',
        absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 100 },
        layoutMode: 'HORIZONTAL',
        primaryAxisAlignItems: 'CENTER',
        counterAxisAlignItems: 'CENTER',
        itemSpacing: 10,
        children: [],
      };

      const astNode = parser.parse(figmaNode);

      expect(astNode.layout.display).toBe('flex');
      expect(astNode.layout.flexDirection).toBe('row');
      expect(astNode.layout.justifyContent).toBe('center');
      expect(astNode.layout.alignItems).toBe('center');
      expect(astNode.layout.gap).toBe(10);
    });

    it('should parse nested nodes', () => {
      const figmaNode: FigmaNode = {
        id: '1:5',
        name: 'Parent',
        type: 'FRAME',
        absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 200 },
        children: [
          {
            id: '1:6',
            name: 'Child1',
            type: 'FRAME',
            absoluteBoundingBox: { x: 10, y: 10, width: 80, height: 80 },
            children: [],
          },
          {
            id: '1:7',
            name: 'Child2',
            type: 'FRAME',
            absoluteBoundingBox: { x: 100, y: 10, width: 80, height: 80 },
            children: [],
          },
        ],
      };

      const astNode = parser.parse(figmaNode);

      expect(astNode.children).toHaveLength(2);
      expect(astNode.children[0].name).toBe('Child1');
      expect(astNode.children[1].name).toBe('Child2');
      expect(astNode.children[0].parent).toBe(astNode);
    });

    it('should parse background color', () => {
      const figmaNode: FigmaNode = {
        id: '1:8',
        name: 'ColoredFrame',
        type: 'FRAME',
        absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
        fills: [
          {
            type: 'SOLID',
            color: { r: 1, g: 0, b: 0 },
            opacity: 0.8,
          },
        ],
        children: [],
      };

      const astNode = parser.parse(figmaNode);

      expect(astNode.styles.backgroundColor).toEqual({
        r: 255,
        g: 0,
        b: 0,
        a: 0.8,
      });
    });

    it('should parse border radius', () => {
      const figmaNode: FigmaNode = {
        id: '1:9',
        name: 'RoundedFrame',
        type: 'FRAME',
        absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
        cornerRadius: 8,
        children: [],
      };

      const astNode = parser.parse(figmaNode);

      expect(astNode.styles.borderRadius).toBe(8);
    });

    it('should parse padding', () => {
      const figmaNode: FigmaNode = {
        id: '1:10',
        name: 'PaddedFrame',
        type: 'FRAME',
        absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
        paddingTop: 10,
        paddingRight: 15,
        paddingBottom: 10,
        paddingLeft: 15,
        children: [],
      };

      const astNode = parser.parse(figmaNode);

      expect(astNode.layout.padding).toEqual({
        top: 10,
        right: 15,
        bottom: 10,
        left: 15,
      });
    });
  });
});
