/**
 * Integration Tests - End-to-End Flow
 * Feature: figma-to-code-agent
 * Validates: Complete pipeline from extraction → parsing → transformation → generation
 *
 * Tests the full conversion pipeline without external dependencies by mocking
 * the Figma API layer and verifying the output through all stages.
 */

import { ASTParser } from '../../transformation/ASTParser';
import { TransformationPipeline } from '../../transformation/TransformationPipeline';
import { ComponentExtractor } from '../../transformation/transformers/ComponentExtractor';
import { LayoutOptimizer } from '../../transformation/transformers/LayoutOptimizer';
import { SemanticNamer } from '../../transformation/transformers/SemanticNamer';
import { FlattenTransformer } from '../../transformation/transformers/FlattenTransformer';
import { ReactGenerator } from '../../generation/ReactGenerator';
import { VueGenerator } from '../../generation/VueGenerator';
import { DesignTokenExtractor } from '../../tokens/DesignTokenExtractor';
import { DesignTokenExporter } from '../../tokens/DesignTokenExporter';
import type { GeneratorConfig } from '../../generation/types';
import type { DocumentNode, Node } from '../../extraction/types';

function createTestFigmaDocument(): DocumentNode {
  return {
    id: '0:0',
    name: 'Test Design',
    type: 'DOCUMENT',
    children: [
      {
        id: '0:1',
        name: 'Page 1',
        type: 'CANVAS',
        children: [
          createCardFrame('1:1', 'Hero Section'),
          createCardFrame('1:2', 'Feature Card'),
          createNavFrame('1:3', 'Navigation'),
        ],
      },
    ],
  };
}

function createCardFrame(id: string, name: string): Node {
  return {
    id,
    name,
    type: 'FRAME',
    visible: true,
    absoluteBoundingBox: { x: 0, y: 0, width: 400, height: 300 },
    layoutMode: 'VERTICAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'CENTER',
    itemSpacing: 16,
    paddingTop: 24, paddingRight: 24, paddingBottom: 24, paddingLeft: 24,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 } }],
    cornerRadius: 8,
    effects: [{
      type: 'DROP_SHADOW', visible: true, radius: 4,
      color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 2 },
    }],
    children: [
      {
        id: `${id}-title`, name: 'Title', type: 'TEXT', visible: true,
        characters: `${name} Title`,
        absoluteBoundingBox: { x: 24, y: 24, width: 352, height: 32 },
        style: { fontFamily: 'Inter', fontSize: 24, fontWeight: 700, lineHeightPx: 32 },
        fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 } }],
      },
      {
        id: `${id}-desc`, name: 'Description', type: 'TEXT', visible: true,
        characters: 'A description paragraph.',
        absoluteBoundingBox: { x: 24, y: 72, width: 352, height: 48 },
        style: { fontFamily: 'Inter', fontSize: 16, fontWeight: 400, lineHeightPx: 24 },
        fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4, a: 1 } }],
      },
      {
        id: `${id}-btn`, name: 'Button', type: 'FRAME', visible: true,
        absoluteBoundingBox: { x: 24, y: 136, width: 120, height: 40 },
        layoutMode: 'HORIZONTAL',
        primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER',
        paddingTop: 8, paddingRight: 16, paddingBottom: 8, paddingLeft: 16,
        fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 1, a: 1 } }],
        cornerRadius: 4,
        children: [{
          id: `${id}-btn-text`, name: 'Button Text', type: 'TEXT', visible: true,
          characters: 'Click Me',
          absoluteBoundingBox: { x: 40, y: 144, width: 80, height: 24 },
          style: { fontFamily: 'Inter', fontSize: 14, fontWeight: 600, lineHeightPx: 20 },
          fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 } }],
        }],
      },
    ],
  };
}

function createNavFrame(id: string, name: string): Node {
  return {
    id, name, type: 'FRAME', visible: true,
    absoluteBoundingBox: { x: 0, y: 0, width: 1440, height: 64 },
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'SPACE_BETWEEN', counterAxisAlignItems: 'CENTER',
    itemSpacing: 24,
    paddingTop: 12, paddingRight: 32, paddingBottom: 12, paddingLeft: 32,
    fills: [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95, a: 1 } }],
    children: [
      {
        id: `${id}-logo`, name: 'Logo', type: 'TEXT', visible: true,
        characters: 'MyApp',
        absoluteBoundingBox: { x: 32, y: 20, width: 80, height: 24 },
        style: { fontFamily: 'Inter', fontSize: 20, fontWeight: 700, lineHeightPx: 24 },
        fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 } }],
      },
      {
        id: `${id}-links`, name: 'Nav Links', type: 'FRAME', visible: true,
        absoluteBoundingBox: { x: 800, y: 20, width: 400, height: 24 },
        layoutMode: 'HORIZONTAL', itemSpacing: 32,
        children: [
          {
            id: `${id}-link1`, name: 'Home', type: 'TEXT', visible: true,
            characters: 'Home',
            absoluteBoundingBox: { x: 800, y: 20, width: 50, height: 24 },
            style: { fontFamily: 'Inter', fontSize: 14, fontWeight: 400 },
            fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3, a: 1 } }],
          },
          {
            id: `${id}-link2`, name: 'About', type: 'TEXT', visible: true,
            characters: 'About',
            absoluteBoundingBox: { x: 882, y: 20, width: 50, height: 24 },
            style: { fontFamily: 'Inter', fontSize: 14, fontWeight: 400 },
            fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3, a: 1 } }],
          },
        ],
      },
    ],
  };
}

describe('Integration Tests - End-to-End Pipeline', () => {
  const figmaDoc = createTestFigmaDocument();

  describe('Complete pipeline: Parse → Transform → Generate (React)', () => {
    it('should produce valid React component files from Figma data', async () => {
      const parser = new ASTParser();
      const ast = parser.parse(figmaDoc);
      expect(ast).toBeDefined();
      expect(ast.type).toBe('Root');
      expect(ast.children.length).toBeGreaterThan(0);

      const pipeline = new TransformationPipeline();
      pipeline
        .register(new FlattenTransformer())
        .register(new ComponentExtractor())
        .register(new LayoutOptimizer())
        .register(new SemanticNamer());

      const transformed = await pipeline.execute(ast);
      expect(transformed).toBeDefined();

      const generator = new ReactGenerator();
      const config: GeneratorConfig = {
        framework: 'react', styleMode: 'css-modules',
        typescript: true, outputDir: './output',
      };

      const files = generator.generate(transformed, config);
      expect(files.length).toBeGreaterThan(0);

      for (const file of files) {
        expect(file.path).toBeTruthy();
        expect(file.content.length).toBeGreaterThan(0);
      }

      const componentFiles = files.filter(
        (f) => f.path.endsWith('.tsx') || f.path.endsWith('.jsx')
      );
      expect(componentFiles.length).toBeGreaterThan(0);

      for (const cf of componentFiles) {
        expect(cf.content).toMatch(/import|React|function|const/);
      }
    });
  });

  describe('Complete pipeline: Parse → Transform → Generate (Vue)', () => {
    it('should produce valid Vue SFC files from Figma data', async () => {
      const parser = new ASTParser();
      const ast = parser.parse(figmaDoc);

      const pipeline = new TransformationPipeline();
      pipeline
        .register(new FlattenTransformer())
        .register(new ComponentExtractor())
        .register(new LayoutOptimizer())
        .register(new SemanticNamer());

      const transformed = await pipeline.execute(ast);

      const generator = new VueGenerator();
      const config: GeneratorConfig = {
        framework: 'vue', styleMode: 'css',
        typescript: false, outputDir: './output',
      };

      const files = generator.generate(transformed, config);
      expect(files.length).toBeGreaterThan(0);

      const vueFiles = files.filter((f) => f.path.endsWith('.vue'));
      expect(vueFiles.length).toBeGreaterThan(0);

      for (const vf of vueFiles) {
        expect(vf.content).toContain('<template>');
      }
    });
  });

  describe('Style mode combinations', () => {
    const styleModes: Array<'css-modules' | 'tailwind' | 'css'> = ['css-modules', 'tailwind', 'css'];
    const frameworks: Array<'react' | 'vue'> = ['react', 'vue'];

    for (const framework of frameworks) {
      for (const styleMode of styleModes) {
        it(`should generate ${framework} code with ${styleMode} styling`, async () => {
          const parser = new ASTParser();
          const ast = parser.parse(figmaDoc);

          const pipeline = new TransformationPipeline();
          pipeline
            .register(new ComponentExtractor())
            .register(new LayoutOptimizer())
            .register(new SemanticNamer());

          const transformed = await pipeline.execute(ast);

          const generator = framework === 'react' ? new ReactGenerator() : new VueGenerator();
          const config: GeneratorConfig = {
            framework, styleMode, typescript: true, outputDir: './output',
          };

          const files = generator.generate(transformed, config);
          expect(files.length).toBeGreaterThan(0);

          for (const file of files) {
            expect(file.content.length).toBeGreaterThan(0);
          }

          if (styleMode === 'tailwind') {
            const componentFiles = files.filter(
              (f) => f.path.endsWith('.tsx') || f.path.endsWith('.jsx') || f.path.endsWith('.vue')
            );
            const hasClassNames = componentFiles.some(
              (f) => f.content.includes('className') || f.content.includes('class=')
            );
            expect(hasClassNames).toBe(true);
          }
        });
      }
    }
  });

  describe('Design token extraction in pipeline', () => {
    it('should extract design tokens from transformed AST', async () => {
      const parser = new ASTParser();
      const ast = parser.parse(figmaDoc);

      const pipeline = new TransformationPipeline();
      pipeline.register(new LayoutOptimizer()).register(new SemanticNamer());

      const transformed = await pipeline.execute(ast);

      const extractor = new DesignTokenExtractor();
      const tokens = extractor.extract(transformed);
      expect(tokens).toBeDefined();

      const exporter = new DesignTokenExporter();
      const formats: Array<'css' | 'scss' | 'json' | 'js'> = ['css', 'scss', 'json', 'js'];
      for (const format of formats) {
        const output = exporter.export(tokens, format);
        expect(output).toBeTruthy();
        expect(output.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Error recovery', () => {
    it('should handle empty document gracefully', async () => {
      const emptyDoc: DocumentNode = {
        id: '0:0', name: 'Empty', type: 'DOCUMENT', children: [],
      };

      const parser = new ASTParser();
      const ast = parser.parse(emptyDoc);
      expect(ast).toBeDefined();
      expect(ast.type).toBe('Root');

      const pipeline = new TransformationPipeline();
      pipeline.register(new ComponentExtractor()).register(new LayoutOptimizer());

      const transformed = await pipeline.execute(ast);
      expect(transformed).toBeDefined();

      const generator = new ReactGenerator();
      const files = generator.generate(transformed, {
        framework: 'react', styleMode: 'css', typescript: true, outputDir: './output',
      });
      expect(files).toBeDefined();
    });

    it('should handle nodes with missing optional properties', async () => {
      const minimalDoc: DocumentNode = {
        id: '0:0', name: 'Minimal', type: 'DOCUMENT',
        children: [{
          id: '1:0', name: 'Page', type: 'CANVAS',
          children: [{
            id: '2:0', name: 'Frame', type: 'FRAME',
            children: [{ id: '3:0', name: 'Text', type: 'TEXT', characters: 'Hello' }],
          }],
        }],
      };

      const parser = new ASTParser();
      const ast = parser.parse(minimalDoc);
      expect(ast).toBeDefined();

      const pipeline = new TransformationPipeline();
      pipeline.register(new SemanticNamer());
      const transformed = await pipeline.execute(ast);

      const generator = new ReactGenerator();
      const files = generator.generate(transformed, {
        framework: 'react', styleMode: 'css', typescript: false, outputDir: './output',
      });
      expect(files.length).toBeGreaterThan(0);
    });

    it('should handle deeply nested structures', async () => {
      let current: Node = {
        id: '10:0', name: 'Leaf Text', type: 'TEXT', characters: 'Deep leaf',
        absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 20 },
        style: { fontFamily: 'Inter', fontSize: 14, fontWeight: 400 },
      };

      for (let i = 9; i >= 1; i--) {
        current = {
          id: `${i}:0`, name: `Level ${i}`, type: 'FRAME',
          absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 200 },
          layoutMode: 'VERTICAL', children: [current],
        };
      }

      const deepDoc: DocumentNode = {
        id: '0:0', name: 'Deep', type: 'DOCUMENT',
        children: [{ id: '0:1', name: 'Page', type: 'CANVAS', children: [current] }],
      };

      const parser = new ASTParser();
      const ast = parser.parse(deepDoc);

      const pipeline = new TransformationPipeline();
      pipeline
        .register(new FlattenTransformer())
        .register(new ComponentExtractor())
        .register(new LayoutOptimizer());

      const transformed = await pipeline.execute(ast);
      expect(transformed).toBeDefined();

      const generator = new VueGenerator();
      const files = generator.generate(transformed, {
        framework: 'vue', styleMode: 'tailwind', typescript: true, outputDir: './output',
      });
      expect(files.length).toBeGreaterThan(0);
    });
  });
});
