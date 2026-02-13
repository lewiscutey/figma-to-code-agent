import type { DesignTokens, TokenExportFormat } from './types';

/**
 * Exports design tokens to various formats: CSS variables, SCSS, JSON, JS.
 */
export class DesignTokenExporter {
  export(tokens: DesignTokens, format: TokenExportFormat): string {
    switch (format) {
      case 'css': return this.toCSS(tokens);
      case 'scss': return this.toSCSS(tokens);
      case 'json': return this.toJSON(tokens);
      case 'js': return this.toJS(tokens);
    }
  }

  private toCSS(tokens: DesignTokens): string {
    const lines: string[] = [':root {'];
    for (const c of tokens.colors) lines.push(`  --${c.name}: ${c.css};`);
    for (const t of tokens.typography) {
      lines.push(`  --${t.name}-family: ${t.fontFamily};`);
      lines.push(`  --${t.name}-size: ${t.fontSize}px;`);
      lines.push(`  --${t.name}-weight: ${t.fontWeight};`);
      lines.push(`  --${t.name}-line-height: ${t.lineHeight}px;`);
    }
    for (const s of tokens.spacing) lines.push(`  --${s.name}: ${s.value}px;`);
    for (const e of tokens.effects) lines.push(`  --${e.name}: ${e.css};`);
    for (const r of tokens.borderRadius) lines.push(`  --${r.name}: ${r.value}px;`);
    lines.push('}');
    return lines.join('\n') + '\n';
  }

  private toSCSS(tokens: DesignTokens): string {
    const lines: string[] = [];
    for (const c of tokens.colors) lines.push(`$${c.name}: ${c.css};`);
    for (const t of tokens.typography) {
      lines.push(`$${t.name}-family: ${t.fontFamily};`);
      lines.push(`$${t.name}-size: ${t.fontSize}px;`);
      lines.push(`$${t.name}-weight: ${t.fontWeight};`);
      lines.push(`$${t.name}-line-height: ${t.lineHeight}px;`);
    }
    for (const s of tokens.spacing) lines.push(`$${s.name}: ${s.value}px;`);
    for (const e of tokens.effects) lines.push(`$${e.name}: ${e.css};`);
    for (const r of tokens.borderRadius) lines.push(`$${r.name}: ${r.value}px;`);
    return lines.join('\n') + '\n';
  }

  private toJSON(tokens: DesignTokens): string {
    return JSON.stringify(tokens, null, 2) + '\n';
  }

  private toJS(tokens: DesignTokens): string {
    return `export const designTokens = ${JSON.stringify(tokens, null, 2)};\n`;
  }
}
