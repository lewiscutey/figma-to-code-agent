/**
 * 属性测试：MCP 工具发现的完整性 & 工具能力查询的准确性
 * 
 * **属性 4：MCP 工具发现的完整性**
 * 验证：对于任意注册的 MCP 服务，系统应该能够发现该服务暴露的所有工具，
 * 并将它们添加到工具注册表中
 * 
 * **验证需求：5.1, 10.3, 10.4**
 * 
 * **属性 9：工具能力查询的准确性**
 * 验证：对于任意能力查询，返回的工具列表应该只包含声明了该能力的工具，
 * 且所有声明了该能力的工具都应该被返回
 * 
 * **验证需求：10.4, 10.5**
 */

import { ToolRegistry } from '../../tools/ToolRegistry';
import type { Tool, ToolCategory } from '../../tools/types';

describe('ToolRegistry Property Tests', () => {
  describe('属性 4：MCP 工具发现的完整性', () => {
    it('应该注册所有提供的工具', () => {
      const registry = new ToolRegistry();
      
      // 生成随机数量的工具（5-15个）
      const toolCount = Math.floor(Math.random() * 11) + 5;
      const tools: Tool[] = [];
      
      for (let i = 0; i < toolCount; i++) {
        const tool: Tool = {
          name: `tool-${i}`,
          description: `Tool ${i}`,
          category: 'extraction',
          capabilities: [`capability-${i}`],
          execute: async () => ({ success: true }),
          isAvailable: async () => true,
        };
        tools.push(tool);
        registry.register(tool);
      }
      
      // 验证：所有工具都应该被注册
      const allTools = registry.listAll();
      expect(allTools.length).toBe(toolCount);
      
      for (const tool of tools) {
        expect(registry.has(tool.name)).toBe(true);
        expect(registry.getTool(tool.name)).toBeDefined();
      }
    });

    it('应该为每个工具维护能力索引', () => {
      const registry = new ToolRegistry();
      
      // 注册具有不同能力的工具
      const capabilities = ['extract', 'transform', 'generate', 'validate'];
      const toolsPerCapability = 3;
      
      for (const capability of capabilities) {
        for (let i = 0; i < toolsPerCapability; i++) {
          const tool: Tool = {
            name: `${capability}-tool-${i}`,
            description: `Tool for ${capability}`,
            category: 'extraction',
            capabilities: [capability],
            execute: async () => ({ success: true }),
            isAvailable: async () => true,
          };
          registry.register(tool);
        }
      }
      
      // 验证：每个能力都应该有对应的工具
      const allCapabilities = registry.listCapabilities();
      expect(allCapabilities.length).toBe(capabilities.length);
      
      for (const capability of capabilities) {
        const toolsWithCapability = registry.findByCapability(capability);
        expect(toolsWithCapability.length).toBe(toolsPerCapability);
      }
    });

    it('应该为每个工具维护类别索引', () => {
      const registry = new ToolRegistry();
      
      const categories: ToolCategory[] = ['extraction', 'transformation', 'generation', 'validation', 'analysis'];
      const toolsPerCategory = 2;
      
      for (const category of categories) {
        for (let i = 0; i < toolsPerCategory; i++) {
          const tool: Tool = {
            name: `${category}-tool-${i}`,
            description: `Tool in ${category}`,
            category,
            capabilities: ['test'],
            execute: async () => ({ success: true }),
            isAvailable: async () => true,
          };
          registry.register(tool);
        }
      }
      
      // 验证：每个类别都应该有对应的工具
      const allCategories = registry.listCategories();
      expect(allCategories.length).toBe(categories.length);
      
      for (const category of categories) {
        const toolsInCategory = registry.findByCategory(category);
        expect(toolsInCategory.length).toBe(toolsPerCategory);
      }
    });

    it('应该在注销工具后更新索引', () => {
      const registry = new ToolRegistry();
      
      const tool: Tool = {
        name: 'test-tool',
        description: 'Test tool',
        category: 'extraction',
        capabilities: ['extract', 'parse'],
        execute: async () => ({ success: true }),
        isAvailable: async () => true,
      };
      
      registry.register(tool);
      
      // 验证注册成功
      expect(registry.has('test-tool')).toBe(true);
      expect(registry.findByCapability('extract').length).toBe(1);
      expect(registry.findByCapability('parse').length).toBe(1);
      
      // 注销工具
      const unregistered = registry.unregister('test-tool');
      expect(unregistered).toBe(true);
      
      // 验证：工具和索引都应该被移除
      expect(registry.has('test-tool')).toBe(false);
      expect(registry.findByCapability('extract').length).toBe(0);
      expect(registry.findByCapability('parse').length).toBe(0);
    });

    it('应该防止重复注册相同名称的工具', () => {
      const registry = new ToolRegistry();
      
      const tool1: Tool = {
        name: 'duplicate-tool',
        description: 'First tool',
        category: 'extraction',
        capabilities: ['test'],
        execute: async () => ({ success: true }),
        isAvailable: async () => true,
      };
      
      const tool2: Tool = {
        name: 'duplicate-tool',
        description: 'Second tool',
        category: 'generation',
        capabilities: ['test'],
        execute: async () => ({ success: true }),
        isAvailable: async () => true,
      };
      
      registry.register(tool1);
      
      // 验证：重复注册应该抛出错误
      expect(() => registry.register(tool2)).toThrow();
    });
  });

  describe('属性 9：工具能力查询的准确性', () => {
    it('应该只返回具有指定能力的工具', () => {
      const registry = new ToolRegistry();
      
      // 注册具有不同能力的工具
      const tools = [
        {
          name: 'tool-1',
          capabilities: ['extract', 'parse'],
        },
        {
          name: 'tool-2',
          capabilities: ['extract', 'transform'],
        },
        {
          name: 'tool-3',
          capabilities: ['generate', 'validate'],
        },
        {
          name: 'tool-4',
          capabilities: ['extract'],
        },
      ];
      
      for (const toolDef of tools) {
        const tool: Tool = {
          name: toolDef.name,
          description: `Tool ${toolDef.name}`,
          category: 'extraction',
          capabilities: toolDef.capabilities,
          execute: async () => ({ success: true }),
          isAvailable: async () => true,
        };
        registry.register(tool);
      }
      
      // 查询 'extract' 能力
      const extractTools = registry.findByCapability('extract');
      expect(extractTools.length).toBe(3);
      expect(extractTools.every(t => t.capabilities.includes('extract'))).toBe(true);
      
      // 查询 'generate' 能力
      const generateTools = registry.findByCapability('generate');
      expect(generateTools.length).toBe(1);
      expect(generateTools[0].name).toBe('tool-3');
    });

    it('应该返回所有声明了指定能力的工具', () => {
      const registry = new ToolRegistry();
      
      const targetCapability = 'test-capability';
      const toolsWithCapability = 5;
      const toolsWithoutCapability = 3;
      
      // 注册具有目标能力的工具
      for (let i = 0; i < toolsWithCapability; i++) {
        const tool: Tool = {
          name: `with-capability-${i}`,
          description: 'Tool with capability',
          category: 'extraction',
          capabilities: [targetCapability, 'other'],
          execute: async () => ({ success: true }),
          isAvailable: async () => true,
        };
        registry.register(tool);
      }
      
      // 注册没有目标能力的工具
      for (let i = 0; i < toolsWithoutCapability; i++) {
        const tool: Tool = {
          name: `without-capability-${i}`,
          description: 'Tool without capability',
          category: 'extraction',
          capabilities: ['other'],
          execute: async () => ({ success: true }),
          isAvailable: async () => true,
        };
        registry.register(tool);
      }
      
      // 验证：应该返回所有具有目标能力的工具
      const foundTools = registry.findByCapability(targetCapability);
      expect(foundTools.length).toBe(toolsWithCapability);
      expect(foundTools.every(t => t.capabilities.includes(targetCapability))).toBe(true);
    });

    it('应该支持按类别查询工具', () => {
      const registry = new ToolRegistry();
      
      const categories: ToolCategory[] = ['extraction', 'transformation', 'generation'];
      
      for (const category of categories) {
        for (let i = 0; i < 3; i++) {
          const tool: Tool = {
            name: `${category}-${i}`,
            description: `Tool in ${category}`,
            category,
            capabilities: ['test'],
            execute: async () => ({ success: true }),
            isAvailable: async () => true,
          };
          registry.register(tool);
        }
      }
      
      // 验证：每个类别查询应该返回正确数量的工具
      for (const category of categories) {
        const tools = registry.findByCategory(category);
        expect(tools.length).toBe(3);
        expect(tools.every(t => t.category === category)).toBe(true);
      }
    });

    it('应该支持复合查询（能力 + 可用性）', async () => {
      const registry = new ToolRegistry();
      
      // 注册可用和不可用的工具
      const tools = [
        {
          name: 'available-1',
          capability: 'test',
          available: true,
        },
        {
          name: 'available-2',
          capability: 'test',
          available: true,
        },
        {
          name: 'unavailable-1',
          capability: 'test',
          available: false,
        },
      ];
      
      for (const toolDef of tools) {
        const tool: Tool = {
          name: toolDef.name,
          description: `Tool ${toolDef.name}`,
          category: 'extraction',
          capabilities: [toolDef.capability],
          execute: async () => ({ success: true }),
          isAvailable: async () => toolDef.available,
        };
        registry.register(tool);
      }
      
      // 查询可用的工具
      const availableTools = await registry.query({
        capability: 'test',
        availableOnly: true,
      });
      
      // 验证：应该只返回可用的工具
      expect(availableTools.length).toBe(2);
      expect(availableTools.every(t => t.name.startsWith('available'))).toBe(true);
    });

    it('应该在工具具有多个能力时正确索引', () => {
      const registry = new ToolRegistry();
      
      const tool: Tool = {
        name: 'multi-capability-tool',
        description: 'Tool with multiple capabilities',
        category: 'extraction',
        capabilities: ['extract', 'parse', 'transform', 'validate'],
        execute: async () => ({ success: true }),
        isAvailable: async () => true,
      };
      
      registry.register(tool);
      
      // 验证：每个能力都应该能找到这个工具
      for (const capability of tool.capabilities) {
        const tools = registry.findByCapability(capability);
        expect(tools.length).toBe(1);
        expect(tools[0].name).toBe('multi-capability-tool');
      }
    });

    it('应该在清空注册表后移除所有工具和索引', () => {
      const registry = new ToolRegistry();
      
      // 注册多个工具
      for (let i = 0; i < 10; i++) {
        const tool: Tool = {
          name: `tool-${i}`,
          description: `Tool ${i}`,
          category: 'extraction',
          capabilities: [`capability-${i}`],
          execute: async () => ({ success: true }),
          isAvailable: async () => true,
        };
        registry.register(tool);
      }
      
      // 验证注册成功
      expect(registry.size()).toBe(10);
      expect(registry.listCapabilities().length).toBeGreaterThan(0);
      
      // 清空注册表
      registry.clear();
      
      // 验证：所有工具和索引都应该被清除
      expect(registry.size()).toBe(0);
      expect(registry.listAll().length).toBe(0);
      expect(registry.listCapabilities().length).toBe(0);
      expect(registry.listCategories().length).toBe(0);
    });

    it('应该正确处理不存在的能力查询', () => {
      const registry = new ToolRegistry();
      
      const tool: Tool = {
        name: 'test-tool',
        description: 'Test tool',
        category: 'extraction',
        capabilities: ['existing-capability'],
        execute: async () => ({ success: true }),
        isAvailable: async () => true,
      };
      
      registry.register(tool);
      
      // 查询不存在的能力
      const tools = registry.findByCapability('non-existent-capability');
      
      // 验证：应该返回空数组
      expect(tools).toEqual([]);
    });
  });
});
