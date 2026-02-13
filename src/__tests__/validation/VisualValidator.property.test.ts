/**
 * Property-based tests for Visual Validation
 * Feature: figma-to-code-agent, Property 29: 代码渲染能力
 * Feature: figma-to-code-agent, Property 30: 图像相似度计算
 * Feature: figma-to-code-agent, Property 31: 差异建议生成
 * Validates: Requirements 6.1, 6.3, 6.6
 */

import * as fc from 'fast-check';
import { VisualValidator } from '../../validation/VisualValidator';

describe('Visual Validator Property Tests', () => {
  const validator = new VisualValidator();

  it('Property 29: renderCode returns a Buffer for any HTML content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          '<div>Hello</div>',
          '<div style="background:red;width:100px;height:100px"></div>',
          '<h1>Title</h1><p>Content</p>',
        ),
        fc.record({
          name: fc.constant('test'),
          width: fc.integer({ min: 320, max: 1920 }),
          height: fc.integer({ min: 240, max: 1080 }),
        }),
        async (html, viewport) => {
          const result = await validator.renderCode(html, viewport);
          expect(result).toBeInstanceOf(Buffer);
        }
      ),
      { numRuns: 10 }  // Reduced: Puppeteer fallback is slow in CI
    );
  }, 30000);

  it('Property 30: compareImages returns similarity between 0 and 100', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 100 }),
        fc.uint8Array({ minLength: 1, maxLength: 100 }),
        (buf1, buf2) => {
          const result = validator.compareImages(
            Buffer.from(buf1),
            Buffer.from(buf2),
          );
          expect(result.similarity).toBeGreaterThanOrEqual(0);
          expect(result.similarity).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 31: differences below threshold generate at least one suggestion', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('color', 'position', 'size', 'missing', 'extra') as fc.Arbitrary<'color' | 'position' | 'size' | 'missing' | 'extra'>,
        fc.constantFrom('low', 'medium', 'high') as fc.Arbitrary<'low' | 'medium' | 'high'>,
        (type, severity) => {
          const differences = [{
            area: { x: 0, y: 0, width: 100, height: 100 },
            type,
            severity,
            description: `Test ${type} difference`,
          }];

          const suggestions = validator.generateSuggestions(differences);
          expect(suggestions.length).toBeGreaterThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
