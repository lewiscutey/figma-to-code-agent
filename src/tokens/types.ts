/**
 * Design Token Types
 * Represents extracted design tokens from Figma designs
 */

export interface ColorToken {
  name: string;
  value: { r: number; g: number; b: number; a: number };
  css: string; // rgba(r, g, b, a)
}

export interface TypographyToken {
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing?: number;
}

export interface SpacingToken {
  name: string;
  value: number;
}

export interface EffectToken {
  name: string;
  type: 'drop-shadow' | 'inner-shadow' | 'blur';
  css: string;
}

export interface BorderRadiusToken {
  name: string;
  value: number;
}

export interface DesignTokens {
  colors: ColorToken[];
  typography: TypographyToken[];
  spacing: SpacingToken[];
  effects: EffectToken[];
  borderRadius: BorderRadiusToken[];
}

export type TokenExportFormat = 'css' | 'scss' | 'json' | 'js';
