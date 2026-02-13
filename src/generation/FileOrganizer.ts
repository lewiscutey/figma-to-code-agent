import type { ASTNode } from '../transformation/types';
import type { GeneratedFile } from './types';

/**
 * Organizes generated files into a proper directory structure
 * following framework conventions.
 */
export class FileOrganizer {
  private framework: 'react' | 'vue';
  private outputDir: string;

  constructor(framework: 'react' | 'vue', outputDir: string) {
    this.framework = framework;
    this.outputDir = outputDir;
  }

  /**
   * Generate file name following framework conventions.
   * React: PascalCase.jsx / PascalCase.tsx
   * Vue: kebab-case.vue
   */
  generateFileName(componentName: string, typescript = false): string {
    if (this.framework === 'react') {
      const name = this.toPascalCase(componentName);
      return `${name}.${typescript ? 'tsx' : 'jsx'}`;
    }
    // Vue
    const name = this.toKebabCase(componentName);
    return `${name}.vue`;
  }

  /**
   * Generate directory structure from AST component tree.
   * Returns a map of component name -> directory path.
   */
  generateStructure(root: ASTNode): Map<string, string> {
    const structure = new Map<string, string>();
    this.buildStructure(root, this.outputDir, structure, 0);
    return structure;
  }

  /**
   * Generate Props interface for a component that receives data from parent.
   */
  generatePropsInterface(node: ASTNode): string {
    const props = this.inferProps(node);
    if (props.length === 0) return '';

    const name = this.toPascalCase(node.metadata.componentName || node.name);
    const lines = [`export interface ${name}Props {`];
    for (const prop of props) {
      lines.push(`  ${prop.name}${prop.optional ? '?' : ''}: ${prop.type};`);
    }
    lines.push('}');
    return lines.join('\n');
  }

  /**
   * Organize a flat list of generated files into proper directory structure.
   */
  organize(files: GeneratedFile[], root: ASTNode): GeneratedFile[] {
    const structure = this.generateStructure(root);
    return files.map((file) => {
      // Try to match file to a component directory
      const baseName = file.path.split('/').pop() || '';
      const componentName = baseName.replace(/\.(jsx|tsx|vue|css|module\.css)$/, '');
      const dir = structure.get(componentName) || structure.get(this.toPascalCase(componentName));
      if (dir) {
        return { ...file, path: `${dir}/${baseName}` };
      }
      return file;
    });
  }

  private buildStructure(
    node: ASTNode,
    currentDir: string,
    structure: Map<string, string>,
    depth: number,
  ): void {
    if (node.metadata.isComponent || node.type === 'Component') {
      const name = node.metadata.componentName || node.name;
      const dirName = this.framework === 'react' ? this.toPascalCase(name) : this.toKebabCase(name);
      const componentDir = depth > 0 ? `${currentDir}/components/${dirName}` : `${currentDir}/${dirName}`;
      structure.set(name, componentDir);
      structure.set(this.toPascalCase(name), componentDir);

      for (const child of node.children) {
        this.buildStructure(child, componentDir, structure, depth + 1);
      }
    } else {
      for (const child of node.children) {
        this.buildStructure(child, currentDir, structure, depth);
      }
    }
  }

  private inferProps(node: ASTNode): Array<{ name: string; type: string; optional: boolean }> {
    const props: Array<{ name: string; type: string; optional: boolean }> = [];

    // If node has text children, it likely needs a text/label prop
    const textChildren = node.children.filter((c) => c.type === 'Text');
    if (textChildren.length > 0) {
      props.push({ name: 'children', type: 'React.ReactNode', optional: true });
    }

    // If node has image children, it likely needs src prop
    const imageChildren = node.children.filter((c) => c.type === 'Image');
    if (imageChildren.length > 0) {
      props.push({ name: 'imageSrc', type: 'string', optional: true });
    }

    // className is always optional
    props.push({ name: 'className', type: 'string', optional: true });

    return props;
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/[^\w\s-]/g, '')
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
      .join('');
  }

  private toKebabCase(str: string): string {
    return str
      .replace(/[^\w\s-]/g, '')
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }
}
