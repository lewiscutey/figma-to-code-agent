import { VisualValidator } from '../../validation/VisualValidator';
import type { Difference } from '../../validation/VisualValidator';

describe('VisualValidator', () => {
  const validator = new VisualValidator();

  describe('compareImages', () => {
    it('returns 0 similarity for empty buffers', () => {
      const result = validator.compareImages(Buffer.alloc(0), Buffer.alloc(0));
      expect(result.similarity).toBe(0);
      expect(result.differences).toHaveLength(1);
      expect(result.differences[0].type).toBe('missing');
    });

    it('returns 100 similarity for identical buffers', () => {
      const buf = Buffer.from([1, 2, 3, 4, 5]);
      const result = validator.compareImages(buf, buf);
      expect(result.similarity).toBe(100);
      expect(result.differences).toHaveLength(0);
    });

    it('returns partial similarity for different buffers', () => {
      const buf1 = Buffer.from([1, 2, 3, 4, 5]);
      const buf2 = Buffer.from([1, 2, 9, 9, 5]);
      const result = validator.compareImages(buf1, buf2);
      expect(result.similarity).toBeGreaterThan(0);
      expect(result.similarity).toBeLessThan(100);
    });

    it('detects size differences', () => {
      const buf1 = Buffer.from([1, 2, 3]);
      const buf2 = Buffer.from([1, 2, 3, 4, 5]);
      const result = validator.compareImages(buf1, buf2);
      expect(result.differences.some((d) => d.type === 'size')).toBe(true);
    });
  });

  describe('generateSuggestions', () => {
    it('generates color suggestion for color differences', () => {
      const diffs: Difference[] = [
        { area: { x: 0, y: 0, width: 10, height: 10 }, type: 'color', severity: 'medium', description: 'test' },
      ];
      const suggestions = validator.generateSuggestions(diffs);
      expect(suggestions.some((s) => s.includes('color'))).toBe(true);
    });

    it('generates position suggestion for position differences', () => {
      const diffs: Difference[] = [
        { area: { x: 0, y: 0, width: 10, height: 10 }, type: 'position', severity: 'low', description: 'test' },
      ];
      const suggestions = validator.generateSuggestions(diffs);
      expect(suggestions.some((s) => s.includes('positioning'))).toBe(true);
    });

    it('deduplicates suggestions', () => {
      const diffs: Difference[] = [
        { area: { x: 0, y: 0, width: 10, height: 10 }, type: 'color', severity: 'low', description: 'a' },
        { area: { x: 0, y: 0, width: 10, height: 10 }, type: 'color', severity: 'medium', description: 'b' },
      ];
      const suggestions = validator.generateSuggestions(diffs);
      expect(suggestions).toHaveLength(1);
    });

    it('returns empty for no differences', () => {
      expect(validator.generateSuggestions([])).toHaveLength(0);
    });
  });

  describe('generateReport', () => {
    it('generates a markdown report', () => {
      const report = validator.generateReport([
        {
          passed: true,
          similarity: 98,
          differences: [],
          suggestions: [],
          viewport: { name: 'desktop', width: 1440, height: 900 },
        },
      ]);
      expect(report).toContain('Visual Validation Report');
      expect(report).toContain('PASSED');
      expect(report).toContain('98%');
    });

    it('includes failure details', () => {
      const report = validator.generateReport([
        {
          passed: false,
          similarity: 72,
          differences: [
            { area: { x: 0, y: 0, width: 10, height: 10 }, type: 'color', severity: 'high', description: 'Colors differ' },
          ],
          suggestions: ['Check colors'],
          viewport: { name: 'mobile', width: 375, height: 812 },
        },
      ]);
      expect(report).toContain('FAILED');
      expect(report).toContain('72%');
      expect(report).toContain('Colors differ');
      expect(report).toContain('Check colors');
    });
  });
});
