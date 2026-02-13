import { DesignTokenExporter } from '../../tokens/DesignTokenExporter';
import type { DesignTokens } from '../../tokens/types';

const sampleTokens: DesignTokens = {
  colors: [
    { name: 'black', value: { r: 0, g: 0, b: 0, a: 1 }, css: 'rgba(0, 0, 0, 1)' },
  ],
  typography: [
    { name: 'text-base-regular', fontFamily: 'Inter', fontSize: 16, fontWeight: 400, lineHeight: 24 },
  ],
  spacing: [{ name: 'spacing-1', value: 8 }],
  effects: [{ name: 'shadow-1', type: 'drop-shadow', css: '0px 4px 8px 0px rgba(0, 0, 0, 0.25)' }],
  borderRadius: [{ name: 'radius-1', value: 8 }],
};

describe('DesignTokenExporter', () => {
  const exporter = new DesignTokenExporter();

  it('exports CSS variables', () => {
    const css = exporter.export(sampleTokens, 'css');
    expect(css).toContain(':root {');
    expect(css).toContain('--black: rgba(0, 0, 0, 1)');
    expect(css).toContain('--text-base-regular-size: 16px');
    expect(css).toContain('--spacing-1: 8px');
    expect(css).toContain('--shadow-1:');
    expect(css).toContain('--radius-1: 8px');
  });

  it('exports SCSS variables', () => {
    const scss = exporter.export(sampleTokens, 'scss');
    expect(scss).toContain('$black: rgba(0, 0, 0, 1)');
    expect(scss).toContain('$text-base-regular-size: 16px');
    expect(scss).toContain('$spacing-1: 8px');
  });

  it('exports JSON', () => {
    const json = exporter.export(sampleTokens, 'json');
    const parsed = JSON.parse(json);
    expect(parsed.colors).toHaveLength(1);
    expect(parsed.typography[0].fontFamily).toBe('Inter');
  });

  it('exports JS module', () => {
    const js = exporter.export(sampleTokens, 'js');
    expect(js).toContain('export const designTokens =');
    expect(js).toContain('"Inter"');
  });

  it('handles empty tokens', () => {
    const empty: DesignTokens = {
      colors: [], typography: [], spacing: [], effects: [], borderRadius: [],
    };
    const css = exporter.export(empty, 'css');
    expect(css).toContain(':root {');
    expect(css).toContain('}');
  });
});
