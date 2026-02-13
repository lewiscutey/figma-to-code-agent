import { AssetManager } from '../../assets/AssetManager';
import type { ASTNode } from '../../transformation/types';

function makeNode(overrides: Partial<ASTNode> = {}): ASTNode {
  return {
    id: overrides.id || 'n1',
    type: overrides.type || 'Container',
    name: overrides.name || 'test',
    children: overrides.children || [],
    layout: {
      display: 'block',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
    },
    styles: {},
    metadata: {
      figmaId: overrides.metadata?.figmaId || '1:1',
      figmaType: 'FRAME',
      isComponent: false,
      exportable: false,
      ...overrides.metadata,
    },
  } as ASTNode;
}

describe('AssetManager', () => {
  const manager = new AssetManager('assets/images');

  describe('extractAssets', () => {
    it('extracts image assets from Image nodes', () => {
      const root = makeNode({
        children: [
          makeNode({
            type: 'Image',
            name: 'hero-banner',
            metadata: { figmaId: '1:2', figmaType: 'RECTANGLE', isComponent: false, exportable: true, imageRef: './hero.png' },
          }),
        ],
      });
      const manifest = manager.extractAssets(root);
      expect(manifest.images).toHaveLength(1);
      expect(manifest.images[0].name).toBe('hero-banner.png');
      expect(manifest.images[0].format).toBe('png');
    });

    it('deduplicates assets with same imageRef', () => {
      const root = makeNode({
        children: [
          makeNode({
            type: 'Image',
            name: 'logo-1',
            metadata: { figmaId: '1:2', figmaType: 'RECTANGLE', isComponent: false, exportable: true, imageRef: './logo.png' },
          }),
          makeNode({
            type: 'Image',
            name: 'logo-2',
            metadata: { figmaId: '1:3', figmaType: 'RECTANGLE', isComponent: false, exportable: true, imageRef: './logo.png' },
          }),
        ],
      });
      const manifest = manager.extractAssets(root);
      expect(manifest.images).toHaveLength(1);
      expect(manifest.images[0].usedBy).toContain('logo-1');
      expect(manifest.images[0].usedBy).toContain('logo-2');
    });

    it('detects SVG icons from shape-only containers', () => {
      const root = makeNode({
        children: [
          makeNode({
            name: 'arrow-icon',
            type: 'Container',
            metadata: { figmaId: '1:5', figmaType: 'GROUP', isComponent: false, exportable: false },
            children: [
              makeNode({ type: 'Shape', name: 'path', metadata: { figmaId: '1:6', figmaType: 'VECTOR', isComponent: false, exportable: false } }),
            ],
          }),
        ],
      });
      const manifest = manager.extractAssets(root);
      expect(manifest.icons).toHaveLength(1);
      expect(manifest.icons[0].format).toBe('svg');
    });

    it('returns empty manifest for nodes with no assets', () => {
      const root = makeNode({ children: [makeNode({ type: 'Text', name: 'hello' })] });
      const manifest = manager.extractAssets(root);
      expect(manifest.images).toHaveLength(0);
      expect(manifest.icons).toHaveLength(0);
      expect(manifest.totalSize).toBe(0);
    });
  });

  describe('generateImport', () => {
    it('generates React import statement', () => {
      const asset = {
        id: '1:1', name: 'hero.png', type: 'image' as const, format: 'png',
        path: 'assets/images/hero.png', originalName: 'hero', usedBy: ['Hero'],
      };
      const result = manager.generateImport(asset, 'react', 'src/components/Hero');
      expect(result).toContain('import');
      expect(result).toContain('hero');
    });
  });

  describe('sanitizeFileName', () => {
    it('removes special characters', () => {
      expect(manager.sanitizeFileName('My Image (1)', 'png')).toBe('my-image-1.png');
    });

    it('handles empty names', () => {
      expect(manager.sanitizeFileName('', 'png')).toBe('asset.png');
    });
  });

  describe('detectFormat', () => {
    it('detects SVG', () => {
      expect(manager.detectFormat('./icon.svg')).toBe('svg');
    });

    it('detects JPG', () => {
      expect(manager.detectFormat('./photo.jpg')).toBe('jpg');
    });

    it('defaults to PNG', () => {
      expect(manager.detectFormat('./image')).toBe('png');
    });
  });
});
