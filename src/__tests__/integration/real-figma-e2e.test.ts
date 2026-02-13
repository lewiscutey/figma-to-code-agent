/**
 * End-to-End Tests with Real Figma Data
 *
 * These tests use cached Figma API responses from real design files
 * to validate the full pipeline: Extract → Parse → Transform → Generate.
 *
 * Test fixtures:
 *   - MIUI12 官网 (全局导航-黑): Navigation bar with groups, text, images
 *   - Figma Basics - Homepage: Landing page with text, buttons, images
 *   - Figma Basics - Shopping Cart: E-commerce cart with product cards
 *   - Figma Basics - Product Page: Product detail with navigation
 */

import * as fs from 'fs';
import * as path from 'path';
import { ASTParser } from '../../transformation/ASTParser';
import { TransformationPipeline } from '../../transformation/TransformationPipeline';
import { FlattenTransformer } from '../../transformation/transformers/FlattenTransformer';
import { ComponentExtractor } from '../../transformation/transformers/ComponentExtractor';
import { LayoutOptimizer } from '../../transformation/transformers/LayoutOptimizer';
import { SemanticNamer } from '../../transformation/transformers/SemanticNamer';
import { ReactGenerator } from '../../generation/ReactGenerator';
import { VueGenerator } from '../../generation/VueGenerator';
import { DesignTokenExtractor } from '../../tokens/DesignTokenExtractor';
import { DesignTokenExporter } from '../../tokens/DesignTokenExporter';
import type { GeneratorConfig, GeneratedFile } from '../../generation/types';
import type { DocumentNode, Node } from '../../extraction/types';
import type { ASTNode } from '../../transformation/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------


/** Load a cached Figma file from .figma-cache by its hash filename */
function loadCachedFile(hash: string): any {
  const cachePath = path.resolve(process.cwd(), `.figma-cache/${hash}.json`);
  if (!fs.existsSync(cachePath)) {
    return null;
  }
  const raw = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
  return raw.value;
}

/** Recursively find a node by ID in the Figma tree */
function findNodeById(node: any, targetId: string): any | null {
  if (node.id === targetId) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeById(child, targetId);
      if (found) return found;
    }
  }
  return null;
}

/** Count total nodes in a tree */
function countNodes(node: any): number {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}

/** Count nodes of a specific type */
function countNodesByType(node: any, type: string): number {
  let count = node.type === type ? 1 : 0;
  if (node.children) {
    for (const child of node.children) {
      count += countNodesByType(child, type);
    }
  }
  return count;
}

/** Count AST nodes recursively */
function countASTNodes(node: ASTNode): number {
  let count = 1;
  for (const child of node.children) {
    count += countASTNodes(child);
  }
  return count;
}

/** Build a full transformation pipeline */
function createPipeline(): TransformationPipeline {
  const pipeline = new TransformationPipeline();
  pipeline
    .register(new FlattenTransformer())
    .register(new ComponentExtractor())
    .register(new LayoutOptimizer())
    .register(new SemanticNamer());
  return pipeline;
}

/** Run the full pipeline and return generated files */
async function runFullPipeline(
  targetNode: DocumentNode | Node,
  framework: 'react' | 'vue',
  styleMode: 'css-modules' | 'tailwind' | 'css' = 'css-modules'
): Promise<{ ast: ASTNode; transformed: ASTNode; files: GeneratedFile[] }> {
  const parser = new ASTParser();
  const ast = parser.parse(targetNode as DocumentNode);

  const pipeline = createPipeline();
  const transformed = await pipeline.execute(ast);

  const generator = framework === 'react' ? new ReactGenerator() : new VueGenerator();
  const config: GeneratorConfig = {
    framework,
    styleMode,
    typescript: framework === 'react',
    outputDir: './output',
  };

  const files = generator.generate(transformed, config);
  return { ast, transformed, files };
}

// ---------------------------------------------------------------------------
// Cache file hash mapping (pre-computed from FigmaCache key format)
// Key format: md5("file:{fileKey}:{JSON.stringify(options)}")
// ---------------------------------------------------------------------------
const MIUI12_HASH = 'f1d5645d039cd9d9fa71ec718d5b26bc';
const FIGMA_BASICS_HASH = 'e1f5322ec7cefdec50971ed21fcae3fa';

// Target node IDs from TEST_PROJECTS.md
const MIUI12_NAV_NODE = '1502:102';       // 全局导航-黑
const HOMEPAGE_NODE = '4368:321106';       // Homepage (World Peas)
const SHOPPING_CART_NODE = '4368:321123';  // Shopping cart
const PRODUCT_PAGE_NODE = '4368:321189';   // Product page


// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Real Figma Data E2E Tests', () => {
  // Load cached data once
  const miui12Data = loadCachedFile(MIUI12_HASH);
  const figmaBasicsData = loadCachedFile(FIGMA_BASICS_HASH);

  // Skip all tests if cache files are missing
  const hasMIUI12 = miui12Data !== null;
  const hasFigmaBasics = figmaBasicsData !== null;

  // =========================================================================
  // MIUI12 全局导航-黑 (Navigation Bar)
  // =========================================================================
  describe('MIUI12 - 全局导航-黑 (Navigation Bar)', () => {
    if (!hasMIUI12) {
      it.skip('skipped: MIUI12 cache file not found', () => {});
      return;
    }

    const targetNode = findNodeById(miui12Data.document, MIUI12_NAV_NODE);

    it('should find the target node in the Figma document', () => {
      expect(targetNode).not.toBeNull();
      expect(targetNode.name).toBe('全局导航-黑');
      expect(targetNode.type).toBe('FRAME');
      expect(targetNode.children.length).toBe(10);
    });

    it('should contain expected node types (GROUP, TEXT, RECTANGLE)', () => {
      const groups = countNodesByType(targetNode, 'GROUP');
      const texts = countNodesByType(targetNode, 'TEXT');
      const rects = countNodesByType(targetNode, 'RECTANGLE');

      expect(groups).toBeGreaterThan(0);
      expect(texts).toBeGreaterThan(0);
      expect(rects).toBeGreaterThan(0);
    });

    it('should parse to AST without errors', () => {
      const parser = new ASTParser();
      const ast = parser.parse(targetNode as DocumentNode);

      expect(ast).toBeDefined();
      expect(ast.type).toBeDefined();
      expect(countASTNodes(ast)).toBeGreaterThan(1);
    });

    it('should generate React code from navigation bar', async () => {
      const { files } = await runFullPipeline(targetNode, 'react', 'css-modules');

      expect(files.length).toBeGreaterThan(0);

      const tsxFiles = files.filter((f) => f.path.endsWith('.tsx'));
      expect(tsxFiles.length).toBeGreaterThan(0);

      // React files should have valid structure
      for (const file of tsxFiles) {
        expect(file.content).toMatch(/import\s+React|from\s+'react'/);
        expect(file.content.length).toBeGreaterThan(50);
      }
    });

    it('should generate Vue code from navigation bar', async () => {
      const { files } = await runFullPipeline(targetNode, 'vue', 'css');

      expect(files.length).toBeGreaterThan(0);

      const vueFiles = files.filter((f) => f.path.endsWith('.vue'));
      expect(vueFiles.length).toBeGreaterThan(0);

      for (const file of vueFiles) {
        expect(file.content).toContain('<template>');
        expect(file.content).toContain('<style');
      }
    });

    it('should generate Tailwind code from navigation bar', async () => {
      const { files } = await runFullPipeline(targetNode, 'react', 'tailwind');

      const tsxFiles = files.filter((f) => f.path.endsWith('.tsx'));
      expect(tsxFiles.length).toBeGreaterThan(0);

      // Tailwind files should have className attributes
      const hasClassNames = tsxFiles.some((f) => f.content.includes('className'));
      expect(hasClassNames).toBe(true);
    });

    it('should extract design tokens from navigation bar', async () => {
      const { transformed } = await runFullPipeline(targetNode, 'react');

      const extractor = new DesignTokenExtractor();
      const tokens = extractor.extract(transformed);

      expect(tokens).toBeDefined();
      // Navigation bar should have colors (dark background, text colors)
      expect(tokens.colors.length + tokens.typography.length + tokens.spacing.length)
        .toBeGreaterThan(0);

      // Export to all formats
      const exporter = new DesignTokenExporter();
      for (const fmt of ['css', 'scss', 'json', 'js'] as const) {
        const output = exporter.export(tokens, fmt);
        expect(output.length).toBeGreaterThan(0);
      }
    });
  });


  // =========================================================================
  // Figma Basics - Homepage (World Peas)
  // =========================================================================
  describe('Figma Basics - Homepage (World Peas)', () => {
    if (!hasFigmaBasics) {
      it.skip('skipped: Figma Basics cache file not found', () => {});
      return;
    }

    const canvas = figmaBasicsData.document.children[0]; // Figma Basics canvas
    const targetNode = findNodeById(canvas, HOMEPAGE_NODE);

    it('should find the Homepage node', () => {
      expect(targetNode).not.toBeNull();
      expect(targetNode.name).toBe('Homepage');
      expect(targetNode.type).toBe('FRAME');
      expect(targetNode.children.length).toBe(8);
    });

    it('should contain text content (paragraphs, headings)', () => {
      const textNodes = countNodesByType(targetNode, 'TEXT');
      expect(textNodes).toBeGreaterThanOrEqual(3);
    });

    it('should contain image placeholders (RECTANGLE with fills)', () => {
      const rects = countNodesByType(targetNode, 'RECTANGLE');
      expect(rects).toBeGreaterThan(0);
    });

    it('should generate React code with all sections', async () => {
      const { files, transformed } = await runFullPipeline(targetNode, 'react', 'css-modules');

      expect(files.length).toBeGreaterThan(0);

      const tsxFiles = files.filter((f) => f.path.endsWith('.tsx'));
      expect(tsxFiles.length).toBeGreaterThan(0);

      // AST should preserve the structure
      expect(countASTNodes(transformed)).toBeGreaterThan(3);
    });

    it('should generate Vue code with template and styles', async () => {
      const { files } = await runFullPipeline(targetNode, 'vue', 'css');

      const vueFiles = files.filter((f) => f.path.endsWith('.vue'));
      expect(vueFiles.length).toBeGreaterThan(0);

      for (const file of vueFiles) {
        expect(file.content).toContain('<template>');
      }
    });

    it('should extract meaningful design tokens', async () => {
      const { transformed } = await runFullPipeline(targetNode, 'react');

      const extractor = new DesignTokenExtractor();
      const tokens = extractor.extract(transformed);

      // Homepage should have colors and typography
      expect(tokens.colors.length).toBeGreaterThan(0);
      expect(tokens.typography.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Figma Basics - Shopping Cart
  // =========================================================================
  describe('Figma Basics - Shopping Cart', () => {
    if (!hasFigmaBasics) {
      it.skip('skipped: Figma Basics cache file not found', () => {});
      return;
    }

    const canvas = figmaBasicsData.document.children[0];
    const targetNode = findNodeById(canvas, SHOPPING_CART_NODE);

    it('should find the Shopping Cart node', () => {
      expect(targetNode).not.toBeNull();
      expect(targetNode.name).toBe('Shopping cart');
      expect(targetNode.type).toBe('FRAME');
      expect(targetNode.children.length).toBe(6);
    });

    it('should contain product card frames (Tomato, Ginger, Onion)', () => {
      const productNames = targetNode.children
        .filter((c: any) => c.type === 'FRAME')
        .map((c: any) => c.name);

      expect(productNames).toContain('Tomato');
      expect(productNames).toContain('Ginger');
      expect(productNames).toContain('Onion');
    });

    it('should contain a Summary section', () => {
      const summary = targetNode.children.find((c: any) => c.name === 'Summary');
      expect(summary).toBeDefined();
      expect(summary.type).toBe('FRAME');
      expect(summary.children.length).toBeGreaterThan(0);
    });

    it('should generate React code preserving product structure', async () => {
      const { files } = await runFullPipeline(targetNode, 'react', 'css-modules');

      expect(files.length).toBeGreaterThan(0);

      const tsxFiles = files.filter((f) => f.path.endsWith('.tsx'));
      expect(tsxFiles.length).toBeGreaterThan(0);

      // Generated code should be substantial (shopping cart is complex)
      const totalContent = tsxFiles.reduce((sum, f) => sum + f.content.length, 0);
      expect(totalContent).toBeGreaterThan(200);
    });

    it('should generate Vue code with scoped styles', async () => {
      const { files } = await runFullPipeline(targetNode, 'vue', 'css');

      const vueFiles = files.filter((f) => f.path.endsWith('.vue'));
      expect(vueFiles.length).toBeGreaterThan(0);

      for (const file of vueFiles) {
        expect(file.content).toContain('<template>');
        expect(file.content).toContain('<style');
      }
    });

    it('should generate Tailwind classes for shopping cart', async () => {
      const { files } = await runFullPipeline(targetNode, 'react', 'tailwind');

      const tsxFiles = files.filter((f) => f.path.endsWith('.tsx'));
      const allContent = tsxFiles.map((f) => f.content).join('\n');

      // Should have flex/grid layout classes
      expect(allContent).toMatch(/className/);
    });

    it('should extract spacing and color tokens from cart layout', async () => {
      const { transformed } = await runFullPipeline(targetNode, 'react');

      const extractor = new DesignTokenExtractor();
      const tokens = extractor.extract(transformed);

      // Shopping cart should have colors (prices, backgrounds) and spacing
      expect(tokens.colors.length).toBeGreaterThan(0);
    });
  });


  // =========================================================================
  // Figma Basics - Product Page
  // =========================================================================
  describe('Figma Basics - Product Page', () => {
    if (!hasFigmaBasics) {
      it.skip('skipped: Figma Basics cache file not found', () => {});
      return;
    }

    const canvas = figmaBasicsData.document.children[0];
    const targetNode = findNodeById(canvas, PRODUCT_PAGE_NODE);

    it('should find the Product Page node', () => {
      expect(targetNode).not.toBeNull();
      expect(targetNode.name).toBe('Product page');
      expect(targetNode.type).toBe('FRAME');
      expect(targetNode.children.length).toBe(4);
    });

    it('should contain Navigation and product sections', () => {
      const childNames = targetNode.children.map((c: any) => c.name);
      expect(childNames).toContain('Navigation');
      expect(childNames).toContain('Page heading');
    });

    it('should generate React code for product page', async () => {
      const { files, ast, transformed } = await runFullPipeline(targetNode, 'react', 'css-modules');

      // AST should capture the structure
      expect(countASTNodes(ast)).toBeGreaterThan(5);
      expect(countASTNodes(transformed)).toBeGreaterThan(3);

      expect(files.length).toBeGreaterThan(0);

      const tsxFiles = files.filter((f) => f.path.endsWith('.tsx'));
      expect(tsxFiles.length).toBeGreaterThan(0);

      for (const file of tsxFiles) {
        expect(file.content).toMatch(/import|React|function|const/);
      }
    });

    it('should generate Vue code for product page', async () => {
      const { files } = await runFullPipeline(targetNode, 'vue', 'tailwind');

      const vueFiles = files.filter((f) => f.path.endsWith('.vue'));
      expect(vueFiles.length).toBeGreaterThan(0);

      for (const file of vueFiles) {
        expect(file.content).toContain('<template>');
        // Tailwind Vue should have class bindings
        expect(file.content).toMatch(/class=/);
      }
    });

    it('should extract design tokens including typography', async () => {
      const { transformed } = await runFullPipeline(targetNode, 'react');

      const extractor = new DesignTokenExtractor();
      const tokens = extractor.extract(transformed);

      expect(tokens).toBeDefined();
      // Product page has headings and body text
      expect(tokens.typography.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Cross-design comparison tests
  // =========================================================================
  describe('Cross-design pipeline consistency', () => {
    if (!hasFigmaBasics) {
      it.skip('skipped: Figma Basics cache file not found', () => {});
      return;
    }

    const canvas = figmaBasicsData.document.children[0];

    it('should produce consistent file counts between React css-modules and css', async () => {
      const node = findNodeById(canvas, SHOPPING_CART_NODE);

      const { files: cssModFiles } = await runFullPipeline(node, 'react', 'css-modules');
      const { files: cssFiles } = await runFullPipeline(node, 'react', 'css');

      // Both should produce component files
      const cssModTsx = cssModFiles.filter((f) => f.path.endsWith('.tsx'));
      const cssTsx = cssFiles.filter((f) => f.path.endsWith('.tsx'));

      // Same number of component files regardless of style mode
      expect(cssModTsx.length).toBe(cssTsx.length);
    });

    it('should produce same number of components for React and Vue', async () => {
      const node = findNodeById(canvas, HOMEPAGE_NODE);

      const { files: reactFiles } = await runFullPipeline(node, 'react', 'css');
      const { files: vueFiles } = await runFullPipeline(node, 'vue', 'css');

      const reactComponents = reactFiles.filter(
        (f) => f.path.endsWith('.tsx') || f.path.endsWith('.jsx')
      );
      const vueComponents = vueFiles.filter((f) => f.path.endsWith('.vue'));

      // Should generate same number of components
      expect(reactComponents.length).toBe(vueComponents.length);
    });

    it('should extract same design tokens regardless of framework', async () => {
      const node = findNodeById(canvas, PRODUCT_PAGE_NODE);

      const { transformed: reactTransformed } = await runFullPipeline(node, 'react');
      const { transformed: vueTransformed } = await runFullPipeline(node, 'vue');

      const extractor = new DesignTokenExtractor();
      const reactTokens = extractor.extract(reactTransformed);
      const vueTokens = extractor.extract(vueTransformed);

      // Same input should produce same tokens
      expect(reactTokens.colors.length).toBe(vueTokens.colors.length);
      expect(reactTokens.typography.length).toBe(vueTokens.typography.length);
      expect(reactTokens.spacing.length).toBe(vueTokens.spacing.length);
    });
  });

  // =========================================================================
  // Full document pipeline test
  // =========================================================================
  describe('Full document processing', () => {
    if (!hasFigmaBasics) {
      it.skip('skipped: Figma Basics cache file not found', () => {});
      return;
    }

    it('should process the entire Figma Basics canvas', async () => {
      const canvas = figmaBasicsData.document.children[0];
      const totalNodes = countNodes(canvas);

      // Canvas should be substantial
      expect(totalNodes).toBeGreaterThan(50);

      const parser = new ASTParser();
      const ast = parser.parse(canvas as DocumentNode);
      expect(ast).toBeDefined();
      expect(countASTNodes(ast)).toBeGreaterThan(10);

      const pipeline = createPipeline();
      const transformed = await pipeline.execute(ast);
      expect(transformed).toBeDefined();

      // Generate React output for entire canvas
      const generator = new ReactGenerator();
      const files = generator.generate(transformed, {
        framework: 'react',
        styleMode: 'css-modules',
        typescript: true,
        outputDir: './output',
      });

      expect(files.length).toBeGreaterThan(0);

      // Should produce multiple component files for a complex design
      const tsxFiles = files.filter((f) => f.path.endsWith('.tsx'));
      expect(tsxFiles.length).toBeGreaterThan(0);
    });
  });
});
