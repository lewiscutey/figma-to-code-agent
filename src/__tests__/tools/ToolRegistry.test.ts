import { ToolRegistry } from '../../tools/ToolRegistry';
import type { Tool } from '../../tools/types';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;
  let mockTool1: Tool;
  let mockTool2: Tool;
  let mockTool3: Tool;

  beforeEach(() => {
    registry = new ToolRegistry();

    mockTool1 = {
      name: 'figma-extraction',
      description: 'Extract design from Figma',
      category: 'extraction',
      capabilities: ['extract_design', 'parse_figma'],
      isAvailable: async () => true,
      execute: async () => ({}),
    };

    mockTool2 = {
      name: 'code-generation',
      description: 'Generate code',
      category: 'generation',
      capabilities: ['generate_react', 'generate_vue'],
      isAvailable: async () => true,
      execute: async () => ({}),
    };

    mockTool3 = {
      name: 'ast-transformation',
      description: 'Transform AST',
      category: 'transformation',
      capabilities: ['transform', 'optimize'],
      isAvailable: async () => false,
      execute: async () => ({}),
    };
  });

  describe('Tool Registration', () => {
    it('should register a tool', () => {
      registry.register(mockTool1);

      expect(registry.has('figma-extraction')).toBe(true);
      expect(registry.size()).toBe(1);
    });

    it('should throw error when registering duplicate tool', () => {
      registry.register(mockTool1);

      expect(() => registry.register(mockTool1)).toThrow(
        'Tool with name "figma-extraction" is already registered'
      );
    });

    it('should register multiple tools', () => {
      registry.register(mockTool1);
      registry.register(mockTool2);
      registry.register(mockTool3);

      expect(registry.size()).toBe(3);
    });
  });

  describe('Tool Unregistration', () => {
    it('should unregister a tool', () => {
      registry.register(mockTool1);
      const result = registry.unregister('figma-extraction');

      expect(result).toBe(true);
      expect(registry.has('figma-extraction')).toBe(false);
      expect(registry.size()).toBe(0);
    });

    it('should return false when unregistering non-existent tool', () => {
      const result = registry.unregister('non-existent');

      expect(result).toBe(false);
    });

    it('should clean up indexes when unregistering', () => {
      registry.register(mockTool1);
      registry.unregister('figma-extraction');

      expect(registry.findByCapability('extract_design')).toHaveLength(0);
      expect(registry.findByCategory('extraction')).toHaveLength(0);
    });
  });

  describe('Tool Retrieval', () => {
    beforeEach(() => {
      registry.register(mockTool1);
      registry.register(mockTool2);
      registry.register(mockTool3);
    });

    it('should get tool by name', () => {
      const tool = registry.getTool('figma-extraction');

      expect(tool).toBe(mockTool1);
    });

    it('should return null for non-existent tool', () => {
      const tool = registry.getTool('non-existent');

      expect(tool).toBeNull();
    });

    it('should list all tools', () => {
      const tools = registry.listAll();

      expect(tools).toHaveLength(3);
      expect(tools).toContain(mockTool1);
      expect(tools).toContain(mockTool2);
      expect(tools).toContain(mockTool3);
    });
  });

  describe('Capability-based Query', () => {
    beforeEach(() => {
      registry.register(mockTool1);
      registry.register(mockTool2);
      registry.register(mockTool3);
    });

    it('should find tools by capability', () => {
      const tools = registry.findByCapability('extract_design');

      expect(tools).toHaveLength(1);
      expect(tools[0]).toBe(mockTool1);
    });

    it('should return empty array for non-existent capability', () => {
      const tools = registry.findByCapability('non-existent');

      expect(tools).toHaveLength(0);
    });

    it('should find multiple tools with same capability', () => {
      const mockTool4: Tool = {
        name: 'another-extraction',
        description: 'Another extraction tool',
        category: 'extraction',
        capabilities: ['extract_design'],
        isAvailable: async () => true,
        execute: async () => ({}),
      };

      registry.register(mockTool4);
      const tools = registry.findByCapability('extract_design');

      expect(tools).toHaveLength(2);
    });

    it('should list all capabilities', () => {
      const capabilities = registry.listCapabilities();

      expect(capabilities).toContain('extract_design');
      expect(capabilities).toContain('parse_figma');
      expect(capabilities).toContain('generate_react');
      expect(capabilities).toContain('generate_vue');
      expect(capabilities).toContain('transform');
      expect(capabilities).toContain('optimize');
    });
  });

  describe('Category-based Query', () => {
    beforeEach(() => {
      registry.register(mockTool1);
      registry.register(mockTool2);
      registry.register(mockTool3);
    });

    it('should find tools by category', () => {
      const tools = registry.findByCategory('extraction');

      expect(tools).toHaveLength(1);
      expect(tools[0]).toBe(mockTool1);
    });

    it('should return empty array for non-existent category', () => {
      const tools = registry.findByCategory('validation');

      expect(tools).toHaveLength(0);
    });

    it('should list all categories', () => {
      const categories = registry.listCategories();

      expect(categories).toContain('extraction');
      expect(categories).toContain('generation');
      expect(categories).toContain('transformation');
    });
  });

  describe('Advanced Query', () => {
    beforeEach(() => {
      registry.register(mockTool1);
      registry.register(mockTool2);
      registry.register(mockTool3);
    });

    it('should query by category', async () => {
      const tools = await registry.query({ category: 'extraction' });

      expect(tools).toHaveLength(1);
      expect(tools[0]).toBe(mockTool1);
    });

    it('should query by capability', async () => {
      const tools = await registry.query({ capability: 'generate_react' });

      expect(tools).toHaveLength(1);
      expect(tools[0]).toBe(mockTool2);
    });

    it('should query by availability', async () => {
      const tools = await registry.query({ availableOnly: true });

      expect(tools).toHaveLength(2);
      expect(tools).toContain(mockTool1);
      expect(tools).toContain(mockTool2);
      expect(tools).not.toContain(mockTool3);
    });

    it('should query with multiple filters', async () => {
      const tools = await registry.query({
        category: 'extraction',
        availableOnly: true,
      });

      expect(tools).toHaveLength(1);
      expect(tools[0]).toBe(mockTool1);
    });

    it('should return empty array when no tools match', async () => {
      const tools = await registry.query({
        category: 'validation',
      });

      expect(tools).toHaveLength(0);
    });
  });

  describe('Registry Management', () => {
    it('should clear all tools', () => {
      registry.register(mockTool1);
      registry.register(mockTool2);
      registry.clear();

      expect(registry.size()).toBe(0);
      expect(registry.listAll()).toHaveLength(0);
      expect(registry.listCapabilities()).toHaveLength(0);
      expect(registry.listCategories()).toHaveLength(0);
    });

    it('should check if tool exists', () => {
      registry.register(mockTool1);

      expect(registry.has('figma-extraction')).toBe(true);
      expect(registry.has('non-existent')).toBe(false);
    });
  });

  describe('Index Maintenance', () => {
    it('should maintain capability index correctly', () => {
      registry.register(mockTool1);
      registry.register(mockTool2);

      expect(registry.findByCapability('extract_design')).toHaveLength(1);
      expect(registry.findByCapability('generate_react')).toHaveLength(1);

      registry.unregister('figma-extraction');

      expect(registry.findByCapability('extract_design')).toHaveLength(0);
      expect(registry.findByCapability('generate_react')).toHaveLength(1);
    });

    it('should maintain category index correctly', () => {
      registry.register(mockTool1);
      registry.register(mockTool2);

      expect(registry.findByCategory('extraction')).toHaveLength(1);
      expect(registry.findByCategory('generation')).toHaveLength(1);

      registry.unregister('figma-extraction');

      expect(registry.findByCategory('extraction')).toHaveLength(0);
      expect(registry.findByCategory('generation')).toHaveLength(1);
    });
  });
});
