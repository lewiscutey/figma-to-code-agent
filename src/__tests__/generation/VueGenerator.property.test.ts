/**
 * Property-based tests for Vue Generator
 * Feature: figma-to-code-agent, Property 18: Vue 代码有效性
 * Validates: Requirements 4.2
 */

import * as fc from 'fast-check';
import { VueGenerator } from '../../generation/VueGenerator';
import { createContainerNode, createTextNode, createImageNode } from '../../transformation/ASTFactory';
import type { ASTNode } from '../../transformation/types';
import type { GeneratorConfig } from '../../generation/types';

function buildTree(types: string[]): ASTNode {
  const root = createContainerNode('root', 'main-container', '0:0', 'FRAME');
  root.layout.size = { width: 1920, height: 1080 };

  types.forEach((t, i) => {
    let child: ASTNode;
    if (t === 'text') {
      child = createTextNode(`t${i}`, `label-${i}`, `0:${i}`);
      child.metadata.textContent = 'Hello';
      child.styles.typography = { fontFamily: 'Inter', fontSize: 16, fontWeight: 400, lineHeight: 24 };
    } else if (t === 'image') {
      child = createImageNode(`i${i}`, `image-${i}`, `0:${i}`);
    } else {
      child = createContainerNode(`c${i}`, `box-${i}`, `0:${i}`, 'FRAME');
    }
    child.layout.size = { width: 100, height: 50 };
    child.layout.position = { x: i * 110, y: 0 };
    root.children.push(child);
  });

  return root;
}

const childTypesArb = fc.array(
  fc.constantFrom('container', 'text', 'image'),
  { minLength: 0, maxLength: 5 }
);

const styleModeArb = fc.constantFrom('css-modules', 'tailwind', 'css') as fc.Arbitrary<'css-modules' | 'tailwind' | 'css'>;

describe('Vue Generator Property Tests', () => {
  const generator = new VueGenerator();

  it('Property 18: generated Vue code is valid SFC with template, script, style', () => {
    fc.assert(
      fc.property(childTypesArb, styleModeArb, (types, styleMode) => {
        const tree = buildTree(types);
        const config: GeneratorConfig = {
          framework: 'vue',
          styleMode,
          typescript: true,
          outputDir: 'src',
        };

        const files = generator.generate(tree, config);
        const vueFile = files.find((f) => f.path.endsWith('.vue'));
        expect(vueFile).toBeDefined();
        const code = vueFile!.content;

        // Must contain template section
        expect(code).toContain('<template>');
        expect(code).toContain('</template>');
        // Must contain script section
        expect(code).toContain('<script');
        expect(code).toContain('</script>');
        // Must contain style section (for css-modules and css modes)
        if (styleMode !== 'tailwind') {
          expect(code).toContain('<style');
          expect(code).toContain('</style>');
        }
      }),
      { numRuns: 100 }
    );
  });
});
