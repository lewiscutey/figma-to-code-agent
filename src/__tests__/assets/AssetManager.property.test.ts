/**
 * Property-based tests for Asset Management
 * Feature: figma-to-code-agent, Property 36: 资源目录组织
 * Feature: figma-to-code-agent, Property 37: 资源文件命名
 * Feature: figma-to-code-agent, Property 38: SVG 格式保持
 * Feature: figma-to-code-agent, Property 39: 位图格式支持
 * Feature: figma-to-code-agent, Property 40: 图像引用路径正确性
 * Feature: figma-to-code-agent, Property 41: 资源去重
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

import * as fc from 'fast-check';
import { AssetManager } from '../../assets/AssetManager';
import { createContainerNode, createImageNode } from '../../transformation/ASTFactory';
import type { ASTNode } from '../../transformation/types';

function buildImageTree(imageNames: string[], imageRefs: string[]): ASTNode {
  const root = createContainerNode('root', 'page', '0:0', 'FRAME');
  root.layout.size = { width: 1920, height: 1080 };

  imageNames.forEach((name, i) => {
    const img = createImageNode(`img${i}`, name, `0:${i}`);
    img.metadata.imageRef = imageRefs[i] || `ref-${i}`;
    img.layout.size = { width: 100, height: 100 };
    root.children.push(img);
  });

  return root;
}

const imageNameArb = fc.stringOf(
  fc.constantFrom('a', 'b', 'c', 'd', 'e', '-', '_', ' ', '1', '2'),
  { minLength: 1, maxLength: 20 }
);

describe('Asset Manager Property Tests', () => {
  it('Property 36: extracted assets are saved to configured directory with valid paths', () => {
    fc.assert(
      fc.property(
        fc.array(imageNameArb, { minLength: 1, maxLength: 5 }),
        (names) => {
          const refs = names.map((_, i) => `ref-${i}`);
          const manager = new AssetManager('assets/images');
          const tree = buildImageTree(names, refs);
          const manifest = manager.extractAssets(tree);

          for (const img of [...manifest.images, ...manifest.icons]) {
            expect(img.path).toContain('assets/images/');
            // Path should not contain special characters except - _ . /
            expect(img.path).toMatch(/^[a-zA-Z0-9._\-/]+$/);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 37: asset file names are based on layer names without special chars', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.stringOf(fc.constantFrom('a', 'b', 'c', 'd', 'e'), { minLength: 1, maxLength: 5 }),
          fc.stringOf(fc.constantFrom('a', 'b', 'c', '1', '2', '-', '_', ' '), { minLength: 0, maxLength: 15 }),
        ).map(([first, rest]) => first + rest),
        (name) => {
          const manager = new AssetManager();
          const sanitized = manager.sanitizeFileName(name, 'png');
          // Should not contain special characters beyond alphanumeric, dash, underscore
          expect(sanitized).toMatch(/^[a-z0-9_-]+\.png$/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 38: vector nodes are detected as SVG format', () => {
    const manager = new AssetManager();

    fc.assert(
      fc.property(
        fc.constantFrom('.svg', '-icon.svg', '_vector.svg'),
        (suffix) => {
          const format = manager.detectFormat(`image${suffix}`);
          expect(format).toBe('svg');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 39: bitmap formats (png, jpg, webp) are supported', () => {
    const manager = new AssetManager();

    fc.assert(
      fc.property(
        fc.constantFrom(
          { ext: '.png', expected: 'png' },
          { ext: '.jpg', expected: 'jpg' },
          { ext: '.jpeg', expected: 'jpg' },
          { ext: '.webp', expected: 'webp' },
        ),
        ({ ext, expected }) => {
          const format = manager.detectFormat(`photo${ext}`);
          expect(format).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 40: generated import paths resolve correctly', () => {
    const manager = new AssetManager('assets/images');

    fc.assert(
      fc.property(
        fc.constantFrom('src/components', 'src/pages', 'src'),
        imageNameArb,
        (componentDir, name) => {
          const asset = {
            id: '1',
            name: `${name}.png`,
            type: 'image' as const,
            format: 'png',
            path: `assets/images/${name}.png`,
            originalName: name,
            usedBy: [name],
          };

          const importStmt = manager.generateImport(asset, 'react', componentDir);
          expect(importStmt).toContain('import');
          expect(importStmt).toContain('from');
          // Should contain relative path
          expect(importStmt).toMatch(/from\s+'[./]/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 41: duplicate imageRefs result in single asset entry', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        (numDuplicates) => {
          const manager = new AssetManager();
          const root = createContainerNode('root', 'page', '0:0', 'FRAME');
          root.layout.size = { width: 1920, height: 1080 };

          // All images share the same imageRef
          const sharedRef = 'shared-ref-123';
          for (let i = 0; i < numDuplicates; i++) {
            const img = createImageNode(`img${i}`, `photo-${i}`, `0:${i}`);
            img.metadata.imageRef = sharedRef;
            img.layout.size = { width: 100, height: 100 };
            root.children.push(img);
          }

          const manifest = manager.extractAssets(root);
          // Should only have 1 image despite multiple nodes
          expect(manifest.images.length + manifest.icons.length).toBe(1);
          // The single asset should track all usages
          const asset = manifest.images[0] || manifest.icons[0];
          expect(asset.usedBy.length).toBe(numDuplicates);
        }
      ),
      { numRuns: 100 }
    );
  });
});
