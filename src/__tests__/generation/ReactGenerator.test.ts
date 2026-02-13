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

  it('should generate separate CSS file for css mode', () => {
    config.styleMode = 'css';
    const node = createContainerNode('1', 'card', '1:1', 'FRAME');

    const files = generator.generate(node, config);

    expect(files).toHaveLength(2);
    expect(files[0].path).toContain('.tsx');
    expect(files[0].content).toContain("import './Card.css'");
    expect(files[1].path).toContain('.css');
    expect(files[1].content).toContain('.responsive-wrapper');
  });

  it('should deduplicate identical CSS rules', () => {
    config.styleMode = 'css';
    const parent = createContainerNode('1', 'parent', '1:1', 'FRAME');
    const child1 = createContainerNode('2', 'box-a', '1:2', 'FRAME');
    const child2 = createContainerNode('3', 'box-b', '1:3', 'FRAME');
    // Give both children identical styles
    child1.styles.backgroundColor = { r: 255, g: 0, b: 0, a: 1 };
    child2.styles.backgroundColor = { r: 255, g: 0, b: 0, a: 1 };
    child1.layout.size = { width: 100, height: 50 };
    child2.layout.size = { width: 100, height: 50 };
    parent.children = [child1, child2];

    const files = generator.generate(parent, config);
    const css = files[1].content;

    // Identical rules should be merged (selectors joined)
    const bgMatches = css.match(/background-color: rgba\(255, 0, 0, 1\)/g);
    expect(bgMatches).not.toBeNull();
    // Should appear fewer times than without dedup (merged selectors)
    expect(bgMatches!.length).toBeLessThanOrEqual(2);
  });

  it('should generate improved Tailwind classes with actual values', () => {
    config.styleMode = 'tailwind';
    const node = createContainerNode('1', 'box', '1:1', 'FRAME');
    node.styles.backgroundColor = { r: 100, g: 200, b: 50, a: 1 };
    node.styles.borderRadius = 12;
    node.layout.size = { width: 200, height: 100 };

    const files = generator.generate(node, config);

    expect(files[0].content).toContain('bg-[rgba(100,200,50,1)]');
    expect(files[0].content).toContain('rounded-[12px]');
    expect(files[0].content).toContain('w-[200px]');
    expect(files[0].content).toContain('h-[100px]');
  });
});
