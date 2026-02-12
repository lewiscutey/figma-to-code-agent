import { ReactGenerator } from '../../generation/ReactGenerator';
import { createContainerNode, createTextNode } from '../../transformation/ASTFactory';
import type { GeneratorConfig } from '../../generation/types';

describe('ReactGenerator', () => {
  let generator: ReactGenerator;
  let config: GeneratorConfig;

  beforeEach(() => {
    generator = new ReactGenerator();
    config = {
      framework: 'react',
      styleMode: 'css-modules',
      typescript: true,
      outputDir: 'src/components',
    };
  });

  it('should generate React component with TypeScript', () => {
    const node = createContainerNode('1', 'button', '1:1', 'FRAME');

    const files = generator.generate(node, config);

    expect(files.length).toBeGreaterThanOrEqual(1);
    expect(files[0].path).toBe('src/components/Button.tsx');
    expect(files[0].content).toContain('import React');
    expect(files[0].content).toContain('interface ButtonProps');
    expect(files[0].content).toContain('export function Button');
  });

  it('should generate React component without TypeScript', () => {
    config.typescript = false;
    const node = createContainerNode('1', 'button', '1:1', 'FRAME');

    const files = generator.generate(node, config);

    expect(files[0].path).toBe('src/components/Button.jsx');
    expect(files[0].content).not.toContain('interface');
  });

  it('should generate CSS modules import', () => {
    const node = createContainerNode('1', 'card', '1:1', 'FRAME');

    const files = generator.generate(node, config);

    expect(files[0].content).toContain("import styles from './Card.module.css'");
    expect(files[0].content).toContain("className={styles['card']}");
  });

  it('should generate Tailwind classes', () => {
    config.styleMode = 'tailwind';
    const node = createContainerNode('1', 'container', '1:1', 'FRAME');
    node.layout.display = 'flex';
    node.layout.flexDirection = 'row';

    const files = generator.generate(node, config);

    expect(files[0].content).toContain('className="flex');
  });

  it('should generate nested components', () => {
    const parent = createContainerNode('1', 'parent', '1:1', 'FRAME');
    const child = createTextNode('2', 'text', '1:2');
    parent.children = [child];

    const files = generator.generate(parent, config);

    expect(files[0].content).toContain('<div');
    expect(files[0].content).toContain('<span');
  });

  it('should generate self-closing tags for empty nodes', () => {
    const node = createContainerNode('1', 'empty', '1:1', 'FRAME');

    const files = generator.generate(node, config);

    expect(files[0].content).toContain('<div');
    expect(files[0].content).toContain('/>');
  });
});
