/**
 * Property-based tests for AST Parser
 * Feature: figma-to-code-agent, Property 5: Figma 到 AST 解析
 * Feature: figma-to-code-agent, Property 6: 布局模式识别
 * Validates: Requirements 2.1, 2.2
 */

import * as fc from 'fast-check';
import { ASTParser } from '../../transformation/ASTParser';

// Generate a valid Figma-like node tree
const figmaNodeArb = fc.letrec((tie) => ({
  leaf: fc.record({
    id: fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ':'), { minLength: 3, maxLength: 7 }),
    name: fc.stringOf(fc.constantFrom('a', 'b', 'c', '-', '_', ' ', 'A', 'B'), { minLength: 1, maxLength: 20 }),
    type: fc.constantFrom('TEXT', 'RECTANGLE', 'ELLIPSE', 'LINE', 'VECTOR'),
    children: fc.constant([]),
    absoluteBoundingBox: fc.record({
      x: fc.integer({ min: 0, max: 2000 }),
      y: fc.integer({ min: 0, max: 2000 }),
      width: fc.integer({ min: 1, max: 1920 }),
      height: fc.integer({ min: 1, max: 1080 }),
    }),
    fills: fc.array(fc.record({
      type: fc.constant('SOLID'),
      color: fc.record({
        r: fc.float({ min: 0, max: 1, noNaN: true }),
        g: fc.float({ min: 0, max: 1, noNaN: true }),
        b: fc.float({ min: 0, max: 1, noNaN: true }),
        a: fc.float({ min: 0, max: 1, noNaN: true }),
      }),
      visible: fc.constant(true),
    }), { minLength: 0, maxLength: 2 }),
    visible: fc.constant(true),
    opacity: fc.float({ min: 0, max: 1, noNaN: true }),
  }),
  container: fc.record({
    id: fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ':'), { minLength: 3, maxLength: 7 }),
    name: fc.stringOf(fc.constantFrom('a', 'b', 'c', '-', '_', ' ', 'A', 'B'), { minLength: 1, maxLength: 20 }),
    type: fc.constantFrom('FRAME', 'GROUP', 'COMPONENT'),
    children: fc.array(tie('leaf'), { minLength: 0, maxLength: 3 }),
    absoluteBoundingBox: fc.record({
      x: fc.integer({ min: 0, max: 2000 }),
      y: fc.integer({ min: 0, max: 2000 }),
      width: fc.integer({ min: 1, max: 1920 }),
      height: fc.integer({ min: 1, max: 1080 }),
    }),
    fills: fc.array(fc.record({
      type: fc.constant('SOLID'),
      color: fc.record({
        r: fc.float({ min: 0, max: 1, noNaN: true }),
        g: fc.float({ min: 0, max: 1, noNaN: true }),
        b: fc.float({ min: 0, max: 1, noNaN: true }),
        a: fc.float({ min: 0, max: 1, noNaN: true }),
      }),
      visible: fc.constant(true),
    }), { minLength: 0, maxLength: 2 }),
    visible: fc.constant(true),
    opacity: fc.float({ min: 0, max: 1, noNaN: true }),
    layoutMode: fc.constantFrom(undefined, 'HORIZONTAL', 'VERTICAL'),
  }),
}));

describe('AST Parser Property Tests', () => {
  const parser = new ASTParser();

  it('Property 5: every parsed node has id, type, name, children, layout, styles, metadata', () => {
    fc.assert(
      fc.property(figmaNodeArb.container, (figmaNode) => {
        const ast = parser.parse(figmaNode as any);

        // Verify root node structure
        expect(ast.id).toBeDefined();
        expect(ast.type).toBeDefined();
        expect(ast.name).toBeDefined();
        expect(ast.children).toBeDefined();
        expect(Array.isArray(ast.children)).toBe(true);
        expect(ast.layout).toBeDefined();
        expect(ast.styles).toBeDefined();
        expect(ast.metadata).toBeDefined();

        // Verify all children recursively
        const checkNode = (node: any) => {
          expect(node.id).toBeDefined();
          expect(node.type).toBeDefined();
          expect(node.name).toBeDefined();
          expect(Array.isArray(node.children)).toBe(true);
          expect(node.layout).toBeDefined();
          expect(node.layout.position).toBeDefined();
          expect(node.layout.size).toBeDefined();
          expect(node.styles).toBeDefined();
          expect(node.metadata).toBeDefined();
          node.children.forEach(checkNode);
        };
        checkNode(ast);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 6: layout mode is correctly detected from Figma layoutMode', () => {
    fc.assert(
      fc.property(figmaNodeArb.container, (figmaNode) => {
        const ast = parser.parse(figmaNode as any);

        // If Figma node has layoutMode, AST should have flex display
        if ((figmaNode as any).layoutMode === 'HORIZONTAL' || (figmaNode as any).layoutMode === 'VERTICAL') {
          expect(ast.layout.display).toBe('flex');
          if ((figmaNode as any).layoutMode === 'VERTICAL') {
            expect(ast.layout.flexDirection).toBe('column');
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});
