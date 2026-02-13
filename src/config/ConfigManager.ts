import type { SystemConfig } from './types';

/**
 * Default configuration values.
 */
const DEFAULT_CONFIG: SystemConfig = {
  figma: {
    accessToken: '',
    useMCP: false,
  },
  generation: {
    framework: 'react',
    styleMode: 'css-modules',
    typescript: false,
    outputDir: './output',
    namingConvention: 'PascalCase',
  },
  transformation: {
    enabledTransformers: [
      'figma-structure-optimizer',
      'component-extractor',
      'layout-optimizer',
      'semantic-namer',
    ],
    componentThreshold: 50,
    maxNestingDepth: 4,
  },
  designTokens: {
    extract: false,
    format: 'css',
    outputPath: './output/design-tokens',
  },
  validation: {
    enabled: false,
    viewports: [{ name: 'desktop', width: 1440, height: 900 }],
    threshold: 0.95,
  },
  assets: {
    outputDir: './output/assets',
    imageFormat: 'png',
    optimize: false,
  },
};

/**
 * Manages system configuration: parsing, validation, and defaults.
 */
export class ConfigManager {
  private config: SystemConfig;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Parse a JSON string into a SystemConfig, merging with defaults.
   */
  parse(jsonString: string): SystemConfig {
    const parsed = JSON.parse(jsonString);
    this.config = this.deepMerge(DEFAULT_CONFIG, parsed);
    this.validate(this.config);
    return this.config;
  }

  /**
   * Load config from a plain object, merging with defaults.
   */
  load(partial: Partial<SystemConfig>): SystemConfig {
    this.config = this.deepMerge(DEFAULT_CONFIG, partial as any);
    this.validate(this.config);
    return this.config;
  }

  /**
   * Get the current configuration.
   */
  getConfig(): SystemConfig {
    return this.config;
  }

  /**
   * Get the default configuration.
   */
  getDefaults(): SystemConfig {
    return { ...DEFAULT_CONFIG };
  }

  /**
   * Validate configuration values.
   * Throws ConfigError for invalid values.
   */
  validate(config: SystemConfig): void {
    const errors: string[] = [];

    // Validate framework
    if (!['react', 'vue'].includes(config.generation.framework)) {
      errors.push(`Invalid framework: ${config.generation.framework}. Must be 'react' or 'vue'.`);
    }

    // Validate style mode
    if (!['css-modules', 'tailwind', 'css'].includes(config.generation.styleMode)) {
      errors.push(`Invalid style mode: ${config.generation.styleMode}.`);
    }

    // Validate naming convention
    if (!['camelCase', 'PascalCase', 'kebab-case', 'snake_case'].includes(config.generation.namingConvention)) {
      errors.push(`Invalid naming convention: ${config.generation.namingConvention}.`);
    }

    // Validate threshold
    if (config.validation.threshold < 0 || config.validation.threshold > 1) {
      errors.push(`Validation threshold must be between 0 and 1, got ${config.validation.threshold}.`);
    }

    // Validate component threshold
    if (config.transformation.componentThreshold < 1) {
      errors.push(`Component threshold must be >= 1, got ${config.transformation.componentThreshold}.`);
    }

    // Validate max nesting depth
    if (config.transformation.maxNestingDepth < 1 || config.transformation.maxNestingDepth > 10) {
      errors.push(`Max nesting depth must be 1-10, got ${config.transformation.maxNestingDepth}.`);
    }

    // Validate token format
    if (!['css', 'scss', 'json', 'js'].includes(config.designTokens.format)) {
      errors.push(`Invalid token format: ${config.designTokens.format}.`);
    }

    // Validate image format
    if (!['png', 'jpg', 'webp', 'svg'].includes(config.assets.imageFormat)) {
      errors.push(`Invalid image format: ${config.assets.imageFormat}.`);
    }

    if (errors.length > 0) {
      throw new ConfigError(errors);
    }
  }

  /**
   * Deep merge two objects, with source overriding target.
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        target[key] &&
        typeof target[key] === 'object'
      ) {
        result[key] = this.deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
}

/**
 * Configuration validation error.
 */
export class ConfigError extends Error {
  public errors: string[];

  constructor(errors: string[]) {
    super(`Configuration errors: ${errors.join('; ')}`);
    this.name = 'ConfigError';
    this.errors = errors;
  }
}
