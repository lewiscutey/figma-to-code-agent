import { VueGenerator } from '../../generation/VueGenerator';
import { createContainerNode, createTextNode } from '../../transformation/ASTFactory';
import type { GeneratorConfig } from '../../generation/types';

describe('VueGenerator', () => {
  let generator: VueGenerator;
  let config: GeneratorConfig;

  beforeEach(() => {
    generator = new VueGenerator();
    config = {
      framework: 'vue',
      styleMode: 'css',
      typescript: true,
      outputDir: 'src/components',
    };
  });

  it('should generate Vue component', () => {
    const node = createContainerNode('1', 'button', '1:1', 'FRAME');

    const files = generator.generate(node, config);

    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('src/components/Button.vue');
    expect(files[0].content).toContain('<template>');
    expect(files[0].content).toContain('<script setup');
    expect(files[0].content).toContain('<style');
  });

  it('should generate TypeScript script', () => {
    const node = createContainerNode('1', 'card', '1:1', 'FRAME');

    const files = generator.generate(node, config);

    expect(files[0].content).toContain('<script setup lang="ts">');
  });

  it('should generate JavaScript script', () => {
    config.typescript = false;
    const node = createContainerNode('1', 'card', '1:1', 'FRAME');

    const files = generator.generate(node, config);

    expect(files[0].content).toContain('<script setup>');
    expect(files[0].content).not.toContain('lang="ts"');
  });

  it('should generate scoped styles', () => {
    config.styleMode = 'css-modules';
    const node = createContainerNode('1', 'card', '1:1', 'FRAME');

    const files = generator.generate(node, config);

    expect(files[0].content).toContain('<style scoped>');
  });

  it('should not generate style section for Tailwind', () => {
    config.styleMode = 'tailwind';
    const node = createContainerNode('1', 'card', '1:1', 'FRAME');

    const files = generator.generate(node, config);

    expect(files[0].content).not.toContain('<style');
  });

  it('should generate nested elements', () => {
    const parent = createContainerNode('1', 'parent', '1:1', 'FRAME');
    const child = createTextNode('2', 'text', '1:2');
    parent.children = [child];

    const files = generator.generate(parent, config);

    expect(files[0].content).toContain('<div');
    expect(files[0].content).toContain('<span');
  });
});
