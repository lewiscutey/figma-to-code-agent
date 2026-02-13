import type { TokenExportFormat } from '../tokens/types';

/**
 * System configuration for the Figma-to-Code agent.
 */
export interface SystemConfig {
  figma: {
    accessToken: string;
    fileKey?: string;
    useMCP?: boolean;
  };
  generation: {
    framework: 'react' | 'vue';
    styleMode: 'css-modules' | 'tailwind' | 'css';
    typescript: boolean;
    outputDir: string;
    namingConvention: 'camelCase' | 'PascalCase' | 'kebab-case' | 'snake_case';
  };
  transformation: {
    enabledTransformers: string[];
    componentThreshold: number;
    maxNestingDepth: number;
  };
  designTokens: {
    extract: boolean;
    format: TokenExportFormat;
    outputPath: string;
  };
  validation: {
    enabled: boolean;
    viewports: Array<{ name: string; width: number; height: number }>;
    threshold: number;
  };
  assets: {
    outputDir: string;
    imageFormat: 'png' | 'jpg' | 'webp' | 'svg';
    optimize: boolean;
  };
}
