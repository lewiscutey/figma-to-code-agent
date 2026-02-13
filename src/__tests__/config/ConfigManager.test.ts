import { ConfigManager, ConfigError } from '../../config/ConfigManager';

describe('ConfigManager', () => {
  let manager: ConfigManager;

  beforeEach(() => {
    manager = new ConfigManager();
  });

  describe('getDefaults', () => {
    it('returns default configuration', () => {
      const defaults = manager.getDefaults();
      expect(defaults.generation.framework).toBe('react');
      expect(defaults.generation.styleMode).toBe('css-modules');
      expect(defaults.generation.typescript).toBe(false);
      expect(defaults.transformation.componentThreshold).toBe(50);
      expect(defaults.transformation.maxNestingDepth).toBe(4);
    });
  });

  describe('parse', () => {
    it('parses valid JSON config', () => {
      const json = JSON.stringify({
        figma: { accessToken: 'test-token' },
        generation: { framework: 'vue' },
      });
      const config = manager.parse(json);
      expect(config.figma.accessToken).toBe('test-token');
      expect(config.generation.framework).toBe('vue');
      // Defaults should be preserved
      expect(config.generation.styleMode).toBe('css-modules');
    });

    it('throws on invalid JSON', () => {
      expect(() => manager.parse('not json')).toThrow();
    });

    it('throws ConfigError for invalid framework', () => {
      const json = JSON.stringify({
        generation: { framework: 'angular' },
      });
      expect(() => manager.parse(json)).toThrow(ConfigError);
    });
  });

  describe('load', () => {
    it('merges partial config with defaults', () => {
      const config = manager.load({
        generation: {
          framework: 'vue',
          styleMode: 'tailwind',
          typescript: true,
          outputDir: './dist',
          namingConvention: 'kebab-case',
        },
      });
      expect(config.generation.framework).toBe('vue');
      expect(config.generation.styleMode).toBe('tailwind');
      expect(config.figma.accessToken).toBe(''); // default
    });
  });

  describe('validate', () => {
    it('accepts valid config', () => {
      const defaults = manager.getDefaults();
      expect(() => manager.validate(defaults)).not.toThrow();
    });

    it('rejects invalid style mode', () => {
      const config = manager.getDefaults();
      (config.generation as any).styleMode = 'invalid';
      expect(() => manager.validate(config)).toThrow(ConfigError);
    });

    it('rejects threshold out of range', () => {
      const config = manager.getDefaults();
      config.validation.threshold = 2;
      expect(() => manager.validate(config)).toThrow(ConfigError);
    });

    it('rejects invalid nesting depth', () => {
      const config = manager.getDefaults();
      config.transformation.maxNestingDepth = 0;
      expect(() => manager.validate(config)).toThrow(ConfigError);
    });

    it('rejects invalid token format', () => {
      const config = manager.getDefaults();
      (config.designTokens as any).format = 'yaml';
      expect(() => manager.validate(config)).toThrow(ConfigError);
    });
  });
});
