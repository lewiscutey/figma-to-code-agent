/**
 * Property-based tests for Configuration Management
 * Feature: figma-to-code-agent, Property 42: 配置文件解析
 * Validates: Requirements 9.1
 */

import * as fc from 'fast-check';
import { ConfigManager } from '../../config/ConfigManager';

const validConfigArb = fc.record({
  figma: fc.record({
    accessToken: fc.string({ minLength: 0, maxLength: 50 }),
    useMCP: fc.boolean(),
  }),
  generation: fc.record({
    framework: fc.constantFrom('react', 'vue'),
    styleMode: fc.constantFrom('css-modules', 'tailwind', 'css'),
    typescript: fc.boolean(),
    outputDir: fc.constantFrom('./output', './dist', './build'),
    namingConvention: fc.constantFrom('camelCase', 'PascalCase', 'kebab-case', 'snake_case'),
  }),
  transformation: fc.record({
    enabledTransformers: fc.constant(['component-extractor', 'layout-optimizer']),
    componentThreshold: fc.integer({ min: 1, max: 200 }),
    maxNestingDepth: fc.integer({ min: 1, max: 10 }),
  }),
  designTokens: fc.record({
    extract: fc.boolean(),
    format: fc.constantFrom('css', 'scss', 'json', 'js'),
    outputPath: fc.constant('./output/tokens'),
  }),
  validation: fc.record({
    enabled: fc.boolean(),
    viewports: fc.constant([{ name: 'desktop', width: 1440, height: 900 }]),
    threshold: fc.float({ min: 0, max: 1, noNaN: true }),
  }),
  assets: fc.record({
    outputDir: fc.constant('./output/assets'),
    imageFormat: fc.constantFrom('png', 'jpg', 'webp', 'svg'),
    optimize: fc.boolean(),
  }),
});

describe('Config Manager Property Tests', () => {
  it('Property 42: valid JSON config is parsed and applied correctly', () => {
    fc.assert(
      fc.property(validConfigArb, (config) => {
        const manager = new ConfigManager();
        const jsonStr = JSON.stringify(config);
        const result = manager.parse(jsonStr);

        // Parsed config should match input values
        expect(result.generation.framework).toBe(config.generation.framework);
        expect(result.generation.styleMode).toBe(config.generation.styleMode);
        expect(result.generation.typescript).toBe(config.generation.typescript);
        expect(result.transformation.componentThreshold).toBe(config.transformation.componentThreshold);
        expect(result.designTokens.format).toBe(config.designTokens.format);
        expect(result.assets.imageFormat).toBe(config.assets.imageFormat);
      }),
      { numRuns: 100 }
    );
  });
});
