import type { ASTNode } from '../transformation/types';
import type { CodeGenerator, GeneratorConfig, GeneratedFile } from './types';

export class ReactGenerator implements CodeGenerator {
  private usedClassNames = new Map<string, number>();
  private nodeClassMap = new Map<string, string>();
  private imageImportMap = new Map<string, string>(); // nodeId -> import variable name

  private buildClassNameMap(node: ASTNode): void {
    const baseName = this.sanitizeCSSName(node.name, node.type);
    const count = this.usedClassNames.get(baseName) || 0;
    this.usedClassNames.set(baseName, count + 1);
    const uniqueName = count === 0 ? baseName : `${baseName}-${count}`;
    this.nodeClassMap.set(node.id, uniqueName);
    node.children.forEach((child) => this.buildClassNameMap(child));
  }
  private buildImageImportMap(node: ASTNode): void {
    if (
      node.type === 'Image' &&
      node.metadata.imageRef &&
      node.metadata.imageRef.startsWith('./')
    ) {
      const fileName = node.metadata.imageRef.split('/').pop() || 'image';
      const varName =
        'img' +
        fileName
          .replace(/\.[^.]+$/, '')
          .replace(/[^a-zA-Z0-9]/g, '_')
          .replace(/^_+/, '');
      this.imageImportMap.set(node.id, varName);
    }
    node.children.forEach((child) => this.buildImageImportMap(child));
  }
  generate(node: ASTNode, config: GeneratorConfig): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // Build unique class name mapping first
    this.usedClassNames = new Map();
    this.nodeClassMap = new Map();
    this.imageImportMap = new Map();
    this.buildClassNameMap(node);
    this.buildImageImportMap(node);

    const componentCode = this.generateComponent(node, config);
    const ext = config.typescript ? 'tsx' : 'jsx';

    files.push({
      path: `${config.outputDir}/${this.toFileName(node.name)}.${ext}`,
      content: componentCode,
    });

    // Generate CSS file for css-modules mode
    if (config.styleMode === 'css-modules') {
      files.push({
        path: `${config.outputDir}/${this.toFileName(node.name)}.module.css`,
        content: this.generateCSSModule(node),
      });
    }

    return files;
  }

  private generateComponent(node: ASTNode, config: GeneratorConfig): string {
    const imports = this.generateImports(node, config);
    const props = config.typescript ? this.generatePropsInterface(node) : '';
    const component = this.generateComponentBody(node, config);

    return `${imports}\n\n${props}${component}`;
  }

  private generateImports(node: ASTNode, config: GeneratorConfig): string {
    const imports = ["import React from 'react'"];

    if (config.styleMode === 'css-modules') {
      imports.push(`import styles from './${this.toFileName(node.name)}.module.css'`);
    }

    // Add image imports (deduplicate by variable name)
    const importedVars = new Set<string>();
    for (const [_nodeId, varName] of this.imageImportMap) {
      if (importedVars.has(varName)) continue;
      importedVars.add(varName);
      const imgNode = this.findNodeById(node, _nodeId);
      if (imgNode && imgNode.metadata.imageRef) {
        imports.push(`import ${varName} from '${imgNode.metadata.imageRef}'`);
      }
    }

    return imports.join('\n');
  }

  private findNodeById(node: ASTNode, id: string): ASTNode | null {
    if (node.id === id) return node;
    for (const child of node.children) {
      const found = this.findNodeById(child, id);
      if (found) return found;
    }
    return null;
  }

  private generatePropsInterface(node: ASTNode): string {
    return `interface ${this.toComponentName(node.name)}Props {
  className?: string
  children?: React.ReactNode
}

`;
  }

  private generateComponentBody(node: ASTNode, config: GeneratorConfig): string {
    const componentName = this.toComponentName(node.name);
    const propsParam = config.typescript ? `props: ${componentName}Props` : 'props';

    const jsx = this.generateJSX(node, config, 0);
    const designWidth = Math.round(node.layout.size.width) || 1920;

    return `export function ${componentName}(${propsParam}) {
    const containerRef = React.useRef(null)
    const [scale, setScale] = React.useState(1)

    React.useEffect(() => {
      const updateScale = () => {
        if (containerRef.current) {
          const parentWidth = containerRef.current.parentElement?.clientWidth || window.innerWidth
          setScale(Math.min(1, parentWidth / ${designWidth}))
        }
      }
      updateScale()
      window.addEventListener('resize', updateScale)
      return () => window.removeEventListener('resize', updateScale)
    }, [])

    return (
      <div className={styles['responsive-wrapper']}>
        <div ref={containerRef} className={styles['scale-container']} style={{ transform: \`scale(\${scale})\` }}>
  ${this.indent(jsx, 4)}
        </div>
      </div>
    )
  }
  `;
  }

  private generateJSX(node: ASTNode, config: GeneratorConfig, depth: number = 0): string {
    const tag = this.getHTMLTag(node);
    const className = this.generateClassName(node, config);
    const style = config.styleMode === 'css' ? this.generateInlineStyle(node) : '';

    const attrs = [className, style].filter(Boolean).join(' ');

    // Add Figma layer name as comment for better readability (but not for root element)
    const layerName = node.name || 'unnamed';
    const comment = depth > 0 ? `{/* ${layerName} */}\n` : '';

    // Text node: render text content
    if (node.type === 'Text' && node.metadata.textContent) {
      const text = node.metadata.textContent;
      return `${comment}<${tag}${attrs ? ' ' + attrs : ''}>${text}</${tag}>`;
    }

    // Image node: render with imported src if available
    if (node.type === 'Image') {
      const importVar = this.imageImportMap.get(node.id);
      if (importVar) {
        return `${comment}<img${attrs ? ' ' + attrs : ''} src={${importVar}} alt="${layerName}" />`;
      }
      return `${comment}<div${attrs ? ' ' + attrs : ''} />`;
    }

    if (node.children.length === 0) {
      return `${comment}<${tag}${attrs ? ' ' + attrs : ''} />`;
    }

    const children = node.children
      .map((child) => this.generateJSX(child, config, depth + 1))
      .join('\n');

    return `${comment}<${tag}${attrs ? ' ' + attrs : ''}>
  ${this.indent(children, 1)}
  </${tag}>`;
  }

  private getHTMLTag(node: ASTNode): string {
    switch (node.type) {
      case 'Text':
        return 'span';
      case 'Image':
        return 'img';
      default:
        return 'div';
    }
  }

  private generateClassName(node: ASTNode, config: GeneratorConfig): string {
    const uniqueName = this.nodeClassMap.get(node.id) || this.sanitizeCSSName(node.name);
    if (config.styleMode === 'css-modules') {
      return `className={styles['${uniqueName}']}`;
    }
    if (config.styleMode === 'tailwind') {
      return `className="${this.generateTailwindClasses(node)}"`;
    }
    return `className="${uniqueName}"`;
  }

  private sanitizeCSSName(name: string, nodeType?: string): string {
    // For Text nodes, Figma uses the text content as the name which can be very long.
    // Truncate to first few meaningful words.
    let cleaned = name;
    if (nodeType === 'Text' && cleaned.length > 40) {
      // Take first 3-4 words only
      cleaned = cleaned
        .split(/[\s,.!?]+/)
        .slice(0, 4)
        .join(' ');
    }

    // Convert to valid CSS class name
    return (
      cleaned
        // Remove special characters except letters, numbers, hyphens, underscores, spaces
        .replace(/[^\w\s-]/g, '')
        .trim()
        // Replace spaces with hyphens
        .replace(/\s+/g, '-')
        // Remove leading numbers
        .replace(/^[0-9]+/, '')
        // Convert camelCase to kebab-case
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .toLowerCase()
        // Collapse multiple hyphens
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'element'
    );
  }

  private generateTailwindClasses(node: ASTNode): string {
    const classes: string[] = [];

    if (node.layout.display === 'flex') {
      classes.push('flex');
      if (node.layout.flexDirection === 'column') classes.push('flex-col');
      if (node.layout.justifyContent) classes.push(`justify-${node.layout.justifyContent}`);
      if (node.layout.alignItems) classes.push(`items-${node.layout.alignItems}`);
      if (node.layout.gap) classes.push(`gap-${Math.round(node.layout.gap / 4)}`);
    }

    if (node.styles.backgroundColor) {
      classes.push('bg-gray-100');
    }

    if (node.styles.borderRadius) {
      const radius = Array.isArray(node.styles.borderRadius)
        ? node.styles.borderRadius[0]
        : node.styles.borderRadius;
      classes.push(`rounded-${radius > 8 ? 'lg' : 'md'}`);
    }

    return classes.join(' ');
  }

  private generateInlineStyle(node: ASTNode): string {
    const styles: string[] = [];

    if (node.styles.backgroundColor) {
      const { r, g, b, a } = node.styles.backgroundColor;
      styles.push(`backgroundColor: 'rgba(${r},${g},${b},${a})'`);
    }

    if (node.styles.borderRadius) {
      styles.push(`borderRadius: ${node.styles.borderRadius}`);
    }

    if (styles.length === 0) return '';

    return `style={{ ${styles.join(', ')} }}`;
  }

  private toComponentName(name: string): string {
    let sanitized = name
      // Remove non-ASCII characters (Chinese, etc.)
      // eslint-disable-next-line no-control-regex
      .replace(/[^\x00-\x7F]/g, '')
      // Remove special characters except letters, numbers, spaces, hyphens, underscores
      .replace(/[^\w\s-]/g, '')
      // Replace spaces and hyphens with nothing (will use camelCase)
      .replace(/[\s-]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
      // Remove leading numbers
      .replace(/^[0-9]+/, '');

    if (!sanitized) {
      sanitized = 'Component';
    }

    return sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
  }

  private toFileName(name: string): string {
    let sanitized = name
      // eslint-disable-next-line no-control-regex
      .replace(/[^\x00-\x7F]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s-]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
      .replace(/^[0-9]+/, '');
    if (!sanitized) sanitized = 'Component';
    return sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
  }

  private indent(text: string, level: number): string {
    const spaces = '  '.repeat(level);
    return text
      .split('\n')
      .map((line) => (line ? spaces + line : line))
      .join('\n');
  }

  private generateCSSModule(node: ASTNode): string {
    const styles: string[] = [];
    const designWidth = Math.round(node.layout.size.width) || 1920;
    const designHeight = Math.round(node.layout.size.height) || 1080;

    // Add responsive wrapper styles
    styles.push(`.responsive-wrapper {\n  width: 100%;\n  overflow: hidden;\n}`);
    styles.push(
      `.scale-container {\n  width: ${designWidth}px;\n  height: ${designHeight}px;\n  transform-origin: top left;\n}`
    );

    this.usedClassNames = new Map();
    this.collectStyles(node, styles);
    return styles.join('\n\n') + '\n';
  }

  private collectStyles(node: ASTNode, styles: string[], parentNode?: ASTNode): void {
    const className = this.nodeClassMap.get(node.id) || this.sanitizeCSSName(node.name);
    const cssRules: string[] = [];

    const isRootLevel = !parentNode || parentNode.type === 'Root' || parentNode.type === 'Page';
    const parentHasAutoLayout = parentNode?.layout.display === 'flex';
    const needsAbsolute = !isRootLevel && !parentHasAutoLayout && parentNode;

    // Detect if this container has only one Text child — use flex centering instead of absolute
    const isSingleTextParent = node.children.length === 1 && node.children[0].type === 'Text';
    // Detect if parent is a single-text-parent (so this text child should NOT be absolute)
    const parentIsSingleTextContainer =
      parentNode && parentNode.children.length === 1 && node.type === 'Text';

    const hasNonFlexChildren =
      node.children.length > 0 && node.layout.display !== 'flex' && !isSingleTextParent;

    // Flex layout (from Figma auto-layout)
    if (node.layout.display === 'flex') {
      cssRules.push(`  display: flex;`);
      if (node.layout.flexDirection)
        cssRules.push(`  flex-direction: ${node.layout.flexDirection};`);
      if (node.layout.justifyContent)
        cssRules.push(`  justify-content: ${node.layout.justifyContent};`);
      if (node.layout.alignItems) cssRules.push(`  align-items: ${node.layout.alignItems};`);
      if (node.layout.gap) cssRules.push(`  gap: ${node.layout.gap}px;`);
    } else if (isSingleTextParent) {
      // Container with single text child: use flex centering for better text rendering
      cssRules.push(`  display: flex;`);
      cssRules.push(`  align-items: center;`);
      cssRules.push(`  justify-content: center;`);
    }

    // Position: absolute takes priority (it also serves as containing block for children)
    // Skip absolute for text nodes inside single-text containers (they use flex centering)
    if (needsAbsolute && !parentIsSingleTextContainer) {
      cssRules.push(`  position: absolute;`);
      const relX = Math.round(node.layout.position.x - (parentNode.layout.position.x || 0));
      const relY = Math.round(node.layout.position.y - (parentNode.layout.position.y || 0));
      cssRules.push(`  left: ${relX}px;`);
      cssRules.push(`  top: ${relY}px;`);
    } else if (hasNonFlexChildren) {
      cssRules.push(`  position: relative;`);
    }

    // Size — skip fixed width/height for text inside flex-centered containers
    if (parentIsSingleTextContainer) {
      // Text in flex container: no fixed size needed
    } else {
      if (node.layout.size.width) {
        if (isRootLevel) {
          // Root container: width handled by scale-container wrapper
        } else {
          cssRules.push(`  width: ${Math.round(node.layout.size.width)}px;`);
        }
      }
      if (node.layout.size.height) {
        if (!isRootLevel) {
          cssRules.push(`  height: ${Math.round(node.layout.size.height)}px;`);
        }
      }
    }

    // Padding
    if (node.layout.padding) {
      const p = node.layout.padding;
      if (typeof p === 'object' && 'top' in p) {
        const { top, right, bottom, left } = p;
        if (top === right && right === bottom && bottom === left) {
          if (top > 0) cssRules.push(`  padding: ${top}px;`);
        } else if (top > 0 || right > 0 || bottom > 0 || left > 0) {
          cssRules.push(`  padding: ${top}px ${right}px ${bottom}px ${left}px;`);
        }
      }
    }

    // Overflow hidden only for non-root containers
    if (node.children.length > 0 && node.type !== 'Root' && node.type !== 'Page' && !isRootLevel) {
      cssRules.push(`  overflow: hidden;`);
      // Containers without their own background need to inherit parent's background
      // to properly occlude layers beneath them (matching Figma's compositing behavior)
      if (!node.styles.backgroundColor) {
        cssRules.push(`  background-color: inherit;`);
      }
    }

    // Background color (not for text - their fill is text color)
    if (node.styles.backgroundColor && node.type !== 'Text') {
      const bg = node.styles.backgroundColor;
      cssRules.push(`  background-color: rgba(${bg.r}, ${bg.g}, ${bg.b}, ${bg.a});`);
    }

    // Border radius
    if (node.styles.borderRadius) {
      const br = node.styles.borderRadius;
      if (typeof br === 'number' && br > 0) cssRules.push(`  border-radius: ${br}px;`);
    }

    // Opacity
    if (node.styles.opacity !== undefined && node.styles.opacity !== 1) {
      cssRules.push(`  opacity: ${node.styles.opacity};`);
    }

    // Typography
    if (node.type === 'Text' && node.styles.typography) {
      const t = node.styles.typography;
      cssRules.push(`  font-family: '${t.fontFamily}', sans-serif;`);
      cssRules.push(`  font-size: ${t.fontSize}px;`);
      cssRules.push(`  font-weight: ${t.fontWeight};`);
      if (t.lineHeight) cssRules.push(`  line-height: ${Math.round(t.lineHeight)}px;`);
      if (t.letterSpacing && t.letterSpacing !== 0)
        cssRules.push(`  letter-spacing: ${t.letterSpacing}px;`);
      if (t.textAlign && !parentIsSingleTextContainer)
        cssRules.push(`  text-align: ${t.textAlign};`);
      // Prevent short text from wrapping (single-line text in Figma)
      const textContent = node.metadata.textContent || '';
      const isSingleLine =
        !textContent.includes('\n') &&
        node.layout.size.height <= Math.round(t.lineHeight || t.fontSize) * 1.5;
      if (isSingleLine) cssRules.push(`  white-space: nowrap;`);
      if (node.styles.backgroundColor) {
        const c = node.styles.backgroundColor;
        cssRules.push(`  color: rgba(${c.r}, ${c.g}, ${c.b}, ${c.a});`);
      }
    }

    // Image styling
    if (node.type === 'Image') {
      if (node.metadata.imageRef) {
        cssRules.push(`  object-fit: cover;`);
        cssRules.push(`  display: block;`);
      } else {
        cssRules.push(`  background-color: #e0e0e0;`);
      }
    }

    if (cssRules.length > 0) {
      styles.push(`.${className} {\n${cssRules.join('\n')}\n}`);
    }

    node.children.forEach((child) => this.collectStyles(child, styles, node));
  }
}
