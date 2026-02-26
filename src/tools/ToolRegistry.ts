import type { Tool, ToolCategory, ToolQueryOptions } from './types';

/**
 * 工具注册表
 * 管理所有可用工具
 */
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private capabilityIndex: Map<string, Set<string>> = new Map();
  private categoryIndex: Map<ToolCategory, Set<string>> = new Map();

  /**
   * 注册工具
   */
  register(tool: Tool): void {
    // 检查工具名称是否已存在
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool with name "${tool.name}" is already registered`);
    }

    // 注册工具
    this.tools.set(tool.name, tool);

    // 更新能力索引
    for (const capability of tool.capabilities) {
      if (!this.capabilityIndex.has(capability)) {
        this.capabilityIndex.set(capability, new Set());
      }
      this.capabilityIndex.get(capability)!.add(tool.name);
    }

    // 更新类别索引
    if (!this.categoryIndex.has(tool.category)) {
      this.categoryIndex.set(tool.category, new Set());
    }
    this.categoryIndex.get(tool.category)!.add(tool.name);
  }

  /**
   * 注销工具
   */
  unregister(toolName: string): boolean {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return false;
    }

    // 从工具列表中移除
    this.tools.delete(toolName);

    // 从能力索引中移除
    for (const capability of tool.capabilities) {
      const toolSet = this.capabilityIndex.get(capability);
      if (toolSet) {
        toolSet.delete(toolName);
        if (toolSet.size === 0) {
          this.capabilityIndex.delete(capability);
        }
      }
    }

    // 从类别索引中移除
    const categorySet = this.categoryIndex.get(tool.category);
    if (categorySet) {
      categorySet.delete(toolName);
      if (categorySet.size === 0) {
        this.categoryIndex.delete(tool.category);
      }
    }

    return true;
  }

  /**
   * 获取工具
   */
  getTool(name: string): Tool | null {
    return this.tools.get(name) || null;
  }

  /**
   * 按能力查询工具
   */
  findByCapability(capability: string): Tool[] {
    const toolNames = this.capabilityIndex.get(capability);
    if (!toolNames) {
      return [];
    }

    return Array.from(toolNames)
      .map((name) => this.tools.get(name)!)
      .filter((tool) => tool !== undefined);
  }

  /**
   * 按类别查询工具
   */
  findByCategory(category: ToolCategory): Tool[] {
    const toolNames = this.categoryIndex.get(category);
    if (!toolNames) {
      return [];
    }

    return Array.from(toolNames)
      .map((name) => this.tools.get(name)!)
      .filter((tool) => tool !== undefined);
  }

  /**
   * 查询工具
   */
  async query(options: ToolQueryOptions): Promise<Tool[]> {
    let results: Tool[] = Array.from(this.tools.values());

    // 按类别过滤
    if (options.category) {
      results = results.filter((tool) => tool.category === options.category);
    }

    // 按能力过滤
    if (options.capability) {
      results = results.filter((tool) => tool.capabilities.includes(options.capability!));
    }

    // 按可用性过滤
    if (options.availableOnly) {
      const availabilityChecks = await Promise.all(
        results.map(async (tool) => ({
          tool,
          available: await tool.isAvailable(),
        }))
      );
      results = availabilityChecks
        .filter((check) => check.available)
        .map((check) => check.tool);
    }

    return results;
  }

  /**
   * 列出所有工具
   */
  listAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * 列出所有能力
   */
  listCapabilities(): string[] {
    return Array.from(this.capabilityIndex.keys());
  }

  /**
   * 列出所有类别
   */
  listCategories(): ToolCategory[] {
    return Array.from(this.categoryIndex.keys());
  }

  /**
   * 获取工具数量
   */
  size(): number {
    return this.tools.size;
  }

  /**
   * 清空注册表
   */
  clear(): void {
    this.tools.clear();
    this.capabilityIndex.clear();
    this.categoryIndex.clear();
  }

  /**
   * 检查工具是否已注册
   */
  has(toolName: string): boolean {
    return this.tools.has(toolName);
  }
}
