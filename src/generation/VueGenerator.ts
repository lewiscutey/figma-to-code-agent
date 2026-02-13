import type { ASTNode } from '../transformation/types';
import type { CodeGenerator, GeneratorConfig, GeneratedFile } from './types';

export class VueGenerator implements CodeGenerator {
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

  private findNodeById(node: ASTNode, id: string): ASTNode | null {
    if (node.id === id) return node;
    for (const child of node.children) {
      const found = this.findNodeById(child, id);
      if (found) return found;
    }
    return null;
  }

  generate(node: ASTNode, config: GeneratorConfig): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    this.usedClassNames = new Map();
    this.nodeClassMap = new Map();
    this.imageImportMap = new Map();
    this.buildClassNameMap(node);
    this.buildImageImportMap(node);

    const componentCode = this.generateComponent(node, config);

    files.push({
      path: `${config.outputDir}/${this.toFileName(node.name)}.vue`,
      content: componentCode,
    });

    // For css mode, also generate a standalone CSS file
    if (config.styleMode === 'css') {
      files.push({
        path: `${config.outputDir}/${this.toFileName(node.name)}.css`,
        content: this.generateStandaloneCSS(node),
      });
    }

    return files;
  }

  private generateComponent(node: ASTNode, config: GeneratorConfig): string {
    const template = this.generateTemplate(node, config);
    const script = this.generateScript(node, config);
    const style = this.generateStyle(node, config);

    return `<template>
${this.indent(template, 1)}
</template>

${script}

${style}
`;
  }

  private generateTemplate(node: ASTNode, config: GeneratorConfig): string {
    const inner = this.generateElement(node, config, 0);
    return `<div class="responsive-wrapper">
  <div ref="scaleRef" class="scale-container" :style="{ transform: \`scale(\${scale})\` }">
${this.indent(inner, 2)}
  </div>
</div>`;
  }

  private generateElement(node: ASTNode, config: GeneratorConfig, depth: number): string {
    const tag = this.getHTMLTag(node);
    const className = config.styleMode === 'tailwind'
      ? this.generateTailwindClasses(node)
      : this.nodeClassMap.get(node.id) || this.sanitizeCSSName(node.name);
    const layerName = node.name || 'unnamed';
    const comment = depth > 0 ? `<!-- ${layerName} -->\n` : '';

    // Text node
    if (node.type === 'Text' && node.metadata.textContent) {
      return `${comment}<${tag} class="${className}">${node.metadata.textContent}</${tag}>`;
    }

    // Image node
    if (node.type === 'Image') {
      const importVar = this.imageImportMap.get(node.id);
      if (importVar) {
        return `${comment}<img class="${className}" :src="${importVar}" alt="${layerName}" />`;
      }
      return `${comment}<div class="${className}" />`;
    }

    if (node.children.length === 0) {
      return `${comment}<${tag} class="${className}" />`;
    }

    const children = node.children
      .map((child) => this.generateElement(child, config, depth + 1))
      .join('\n');

    return `${comment}<${tag} class="${className}">
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

  private generateScript(node: ASTNode, config: GeneratorConfig): string {
    const lang = config.typescript ? ' lang="ts"' : '';
    const imports: string[] = [];
    const designWidth = Math.round(node.layout.size.width) || 1920;

    imports.push(`import { ref, onMounted, onUnmounted } from 'vue'`);

    const importedVars = new Set<string>();
    for (const [nodeId, varName] of this.imageImportMap) {
      if (importedVars.has(varName)) continue;
      importedVars.add(varName);
      const imgNode = this.findNodeById(node, nodeId);
      if (imgNode && imgNode.metadata.imageRef) {
        imports.push(`import ${varName} from '${imgNode.metadata.imageRef}'`);
      }
    }

    return `<script setup${lang}>
${imports.join('\n')}

const scaleRef = ref(null)
const scale = ref(1)

const updateScale = () => {
  if (scaleRef.value) {
    const parentWidth = scaleRef.value.parentElement?.clientWidth || window.innerWidth
    scale.value = Math.min(1, parentWidth / ${designWidth})
  }
}

onMounted(() => {
  updateScale()
  window.addEventListener('resize', updateScale)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateScale)
})
</script>`;
  }

  private generateStyle(node: ASTNode, config: GeneratorConfig): string {
    if (config.styleMode === 'tailwind') return '';

    const styles: string[] = [];
    const designWidth = Math.round(node.layout.size.width) || 1920;
    const designHeight = Math.round(node.layout.size.height) || 1080;

    styles.push(`.responsive-wrapper {\n  width: 100%;\n  overflow: hidden;\n}`);
    styles.push(
      `.scale-container {\n  width: ${designWidth}px;\n  height: ${designHeight}px;\n  transform-origin: top left;\n}`
    );

    this.collectStyles(node, styles);

    // Deduplicate identical CSS rules
    const deduped = this.deduplicateStyles(styles);

    // Add responsive media queries
    const mediaQueries = this.generateMediaQueries(node);
    if (mediaQueries) {
      deduped.push(mediaQueries);
    }

    return `<style scoped>
${deduped.join('\n\n')}
</style>`;
  }

  /**
   * Generate a standalone CSS file (for css mode).
   */
  private generateStandaloneCSS(node: ASTNode): string {
    const styles: string[] = [];
    const designWidth = Math.round(node.layout.size.width) || 1920;
    const designHeight = Math.round(node.layout.size.height) || 1080;

    styles.push(`.responsive-wrapper {\n  width: 100%;\n  overflow: hidden;\n}`);
    styles.push(
      `.scale-container {\n  width: ${designWidth}px;\n  height: ${designHeight}px;\n  transform-origin: top left;\n}`
    );

    this.collectStyles(node, styles);
    const deduped = this.deduplicateStyles(styles);

    const mediaQueries = this.generateMediaQueries(node);
    if (mediaQueries) {
      deduped.push(mediaQueries);
    }

    return deduped.join('\n\n') + '\n';
  }

  /**
   * Deduplicate CSS rules: merge selectors with identical rule bodies.
   */
  private deduplicateStyles(styles: string[]): string[] {
    const ruleMap = new Map<string, string[]>();
    const ordered: string[] = [];

    for (const block of styles) {
      const braceIdx = block.indexOf('{');
      if (braceIdx === -1) {
        ordered.push(block);
        continue;
      }
      const selector = block.substring(0, braceIdx).trim();
      const body = block.substring(braceIdx).trim();

      if (!ruleMap.has(body)) {
        ruleMap.set(body, []);
        ordered.push(body);
      }
      ruleMap.get(body)!.push(selector);
    }

    return ordered.map((body) => {
      const selectors = ruleMap.get(body);
      if (!selectors) return body;
      return `${selectors.join(',\n')} ${body}`;
    });
  }

  /**
   * Generate @media queries for responsive components.
   */
  private generateMediaQueries(node: ASTNode): string | null {
    const queries: string[] = [];
    this.collectMediaQueries(node, queries);
    return queries.length > 0 ? queries.join('\n\n') : null;
  }

  private collectMediaQueries(node: ASTNode, queries: string[]): void {
    const meta = node.metadata as any;
    if (meta.responsive && Array.isArray(meta.breakpoints)) {
      const className = this.nodeClassMap.get(node.id) || this.sanitizeCSSName(node.name);
      for (const bp of meta.breakpoints) {
        const minW = bp.width || bp.breakpoint?.minWidth;
        if (minW && bp.layout) {
          const rules: string[] = [];
          if (bp.layout.size?.width) rules.push(`  width: ${Math.round(bp.layout.size.width)}px;`);
          if (bp.layout.size?.height) rules.push(`  height: ${Math.round(bp.layout.size.height)}px;`);
          if (rules.length > 0) {
            queries.push(`@media (min-width: ${minW}px) {\n  .${className} {\n  ${rules.join('\n  ')}\n  }\n}`);
          }
        }
      }
    }
    node.children.forEach((child) => this.collectMediaQueries(child, queries));
  }

  private collectStyles(node: ASTNode, styles: string[], parentNode?: ASTNode): void {
    const className = this.nodeClassMap.get(node.id) || this.sanitizeCSSName(node.name);
    const cssRules: string[] = [];

    const isRootLevel = !parentNode || parentNode.type === 'Root' || parentNode.type === 'Page';
    const parentHasAutoLayout = parentNode?.layout.display === 'flex';
    const needsAbsolute = !isRootLevel && !parentHasAutoLayout && parentNode;

    const isSingleTextParent = node.children.length === 1 && node.children[0].type === 'Text';
    const parentIsSingleTextContainer =
      parentNode && parentNode.children.length === 1 && node.type === 'Text';

    const hasNonFlexChildren =
      node.children.length > 0 && node.layout.display !== 'flex' && !isSingleTextParent;

    // Flex layout
    if (node.layout.display === 'flex') {
      cssRules.push(`  display: flex;`);
      if (node.layout.flexDirection)
        cssRules.push(`  flex-direction: ${node.layout.flexDirection};`);
      if (node.layout.justifyContent)
        cssRules.push(`  justify-content: ${node.layout.justifyContent};`);
      if (node.layout.alignItems) cssRules.push(`  align-items: ${node.layout.alignItems};`);
      if (node.layout.gap) cssRules.push(`  gap: ${node.layout.gap}px;`);
    } else if (isSingleTextParent) {
      cssRules.push(`  display: flex;`);
      cssRules.push(`  align-items: center;`);
      cssRules.push(`  justify-content: center;`);
    }

    // Position
    if (needsAbsolute && !parentIsSingleTextContainer) {
      cssRules.push(`  position: absolute;`);
      const relX = Math.round(node.layout.position.x - (parentNode.layout.position.x || 0));
      const relY = Math.round(node.layout.position.y - (parentNode.layout.position.y || 0));
      cssRules.push(`  left: ${relX}px;`);
      cssRules.push(`  top: ${relY}px;`);
    } else if (hasNonFlexChildren) {
      cssRules.push(`  position: relative;`);
    }

    // Size
    if (parentIsSingleTextContainer) {
      // Text in flex container: no fixed size
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

    // Overflow
    if (node.children.length > 0 && node.type !== 'Root' && node.type !== 'Page' && !isRootLevel) {
      cssRules.push(`  overflow: hidden;`);
      if (!node.styles.backgroundColor) {
        cssRules.push(`  background-color: inherit;`);
      }
    }

    // Background color
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

    // Image
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

  private sanitizeCSSName(name: string, nodeType?: string): string {
    let cleaned = name;
    if (nodeType === 'Text' && cleaned.length > 40) {
      cleaned = cleaned
        .split(/[\s,.!?]+/)
        .slice(0, 4)
        .join(' ');
    }

    return (
      cleaned
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/^[0-9]+/, '')
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .toLowerCase()
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'element'
    );
  }

  private generateTailwindClasses(node: ASTNode): string {
    const classes: string[] = [];

    // Layout
    if (node.layout.display === 'flex') {
      classes.push('flex');
      if (node.layout.flexDirection === 'column') classes.push('flex-col');
      if (node.layout.justifyContent) classes.push(`justify-${node.layout.justifyContent}`);
      if (node.layout.alignItems) classes.push(`items-${node.layout.alignItems}`);
      if (node.layout.gap) classes.push(`gap-${this.toTailwindSpacing(node.layout.gap)}`);
    }

    // Size
    if (node.layout.size.width) classes.push(`w-[${Math.round(node.layout.size.width)}px]`);
    if (node.layout.size.height) classes.push(`h-[${Math.round(node.layout.size.height)}px]`);

    // Background color
    if (node.styles.backgroundColor) {
      const c = node.styles.backgroundColor;
      classes.push(`bg-[rgba(${c.r},${c.g},${c.b},${c.a})]`);
    }

    // Border radius
    if (node.styles.borderRadius) {
      const radius = Array.isArray(node.styles.borderRadius)
        ? node.styles.borderRadius[0]
        : node.styles.borderRadius;
      if (radius > 0) {
        classes.push(radius >= 9999 ? 'rounded-full' : `rounded-[${radius}px]`);
      }
    }

    // Opacity
    if (node.styles.opacity !== undefined && node.styles.opacity !== 1) {
      classes.push(`opacity-${Math.round(node.styles.opacity * 100)}`);
    }

    // Typography
    if (node.type === 'Text' && node.styles.typography) {
      const t = node.styles.typography;
      classes.push(`text-[${t.fontSize}px]`);
      classes.push(`font-[${t.fontWeight}]`);
      if (t.textAlign && t.textAlign !== 'left') classes.push(`text-${t.textAlign}`);
    }

    // Responsive breakpoint classes
    const meta = node.metadata as any;
    if (meta.responsive && meta.breakpoints) {
      classes.push('responsive');
    }

    return classes.join(' ');
  }

  private toTailwindSpacing(px: number): string {
    const rounded = Math.round(px);
    if (rounded % 4 === 0) return String(rounded / 4);
    return `[${rounded}px]`;
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
}
