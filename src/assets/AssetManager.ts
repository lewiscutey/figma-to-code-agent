import type { ASTNode } from '../transformation/types';

/**
 * Represents a single extracted asset.
 */
export interface Asset {
  id: string;
  name: string;
  type: 'image' | 'icon' | 'font';
  format: string;
  path: string;
  originalName: string;
  usedBy: string[];
}

/**
 * Asset manifest listing all extracted assets.
 */
export interface AssetManifest {
  images: Asset[];
  icons: Asset[];
  totalSize: number;
}

/**
 * Options for image optimization.
 */
export interface OptimizationOptions {
  format?: 'png' | 'jpg' | 'webp' | 'svg';
  quality?: number;
}

/**
 * Manages extraction, deduplication, and organization of image assets
 * from the AST tree.
 */
export class AssetManager {
  private assetsDir: string;
  private seenRefs = new Map<string, Asset>();

  constructor(assetsDir = 'assets/images') {
    this.assetsDir = assetsDir;
  }

  /**
   * Extract all image and icon assets from the AST.
   * Deduplicates by imageRef.
   */
  extractAssets(root: ASTNode): AssetManifest {
    const images: Asset[] = [];
    const icons: Asset[] = [];
    this.seenRefs.clear();

    this.traverse(root, (node) => {
      if (node.type === 'Image' && node.metadata.imageRef) {
        const ref = node.metadata.imageRef;
        if (this.seenRefs.has(ref)) {
          // Deduplicate: just add usage reference
          const existing = this.seenRefs.get(ref)!;
          if (!existing.usedBy.includes(node.name)) {
            existing.usedBy.push(node.name);
          }
          return;
        }

        const format = this.detectFormat(ref);
        const fileName = this.sanitizeFileName(node.name, format);
        const asset: Asset = {
          id: node.metadata.figmaId,
          name: fileName,
          type: format === 'svg' ? 'icon' : 'image',
          format,
          path: `${this.assetsDir}/${fileName}`,
          originalName: node.name,
          usedBy: [node.name],
        };

        this.seenRefs.set(ref, asset);
        if (asset.type === 'icon') {
          icons.push(asset);
        } else {
          images.push(asset);
        }
      }

      // Detect shape-only containers as icons
      if (
        node.type === 'Container' &&
        node.children.length > 0 &&
        node.children.every((c) => c.type === 'Shape')
      ) {
        const ref = node.metadata.figmaId;
        if (!this.seenRefs.has(ref)) {
          const fileName = this.sanitizeFileName(node.name, 'svg');
          const asset: Asset = {
            id: node.metadata.figmaId,
            name: fileName,
            type: 'icon',
            format: 'svg',
            path: `${this.assetsDir}/${fileName}`,
            originalName: node.name,
            usedBy: [node.name],
          };
          this.seenRefs.set(ref, asset);
          icons.push(asset);
        }
      }
    });

    return { images, icons, totalSize: images.length + icons.length };
  }

  /**
   * Generate import statement for an asset based on framework.
   */
  generateImport(asset: Asset, framework: 'react' | 'vue', componentDir: string): string {
    const relativePath = this.computeRelativePath(componentDir, asset.path);
    const varName = this.toCamelCase(asset.name.replace(/\.\w+$/, ''));

    if (framework === 'react') {
      return `import ${varName} from '${relativePath}';`;
    }
    // Vue - used in template with require or import
    return `import ${varName} from '${relativePath}';`;
  }

  /**
   * Compute relative path from component directory to asset.
   */
  computeRelativePath(from: string, to: string): string {
    const fromParts = from.split('/').filter(Boolean);
    const toParts = to.split('/').filter(Boolean);

    let common = 0;
    while (common < fromParts.length && common < toParts.length && fromParts[common] === toParts[common]) {
      common++;
    }

    const ups = fromParts.length - common;
    const remaining = toParts.slice(common);
    const prefix = ups > 0 ? Array(ups).fill('..').join('/') : '.';
    return `${prefix}/${remaining.join('/')}`;
  }

  /**
   * Detect image format from file reference or URL.
   */
  detectFormat(ref: string): string {
    if (ref.endsWith('.svg')) return 'svg';
    if (ref.endsWith('.jpg') || ref.endsWith('.jpeg')) return 'jpg';
    if (ref.endsWith('.webp')) return 'webp';
    return 'png';
  }

  /**
   * Sanitize file name: remove special chars, use semantic naming.
   */
  sanitizeFileName(name: string, format: string): string {
    const sanitized = name
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .substring(0, 50) || 'asset';
    return `${sanitized}.${format}`;
  }

  private traverse(node: ASTNode, visitor: (n: ASTNode) => void): void {
    visitor(node);
    node.children.forEach((child) => this.traverse(child, visitor));
  }

  private toCamelCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map((s, i) => (i === 0 ? s.toLowerCase() : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()))
      .join('');
  }
}
