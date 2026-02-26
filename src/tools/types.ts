/**
 * 工具层类型定义
 */

/**
 * 工具类别
 */
export type ToolCategory = 
  | 'extraction'      // Figma 数据提取
  | 'transformation'  // AST 转换
  | 'generation'      // 代码生成
  | 'validation'      // 验证和测试
  | 'analysis';       // 项目分析

/**
 * 工具元数据
 */
export interface ToolMetadata {
  version: string;
  author: string;
  performance: {
    avgDuration: number;      // 平均执行时间（毫秒）
    reliability: number;       // 可靠性评分 0-1
  };
  cost: {
    tokensPerCall?: number;        // 每次调用的 token 消耗
    apiCallsPerExecution?: number; // 每次执行的 API 调用次数
  };
}

/**
 * 工具结果
 */
export interface ToolResult {
  success: boolean;
  data: any;
  error?: Error;
  metadata: {
    duration: number;
    tokensUsed?: number;
    toolName: string;
  };
}

/**
 * 标准工具接口
 * 所有工具必须实现此接口
 */
export interface Tool {
  /** 工具名称（唯一标识符） */
  name: string;
  
  /** 工具描述 */
  description: string;
  
  /** 工具类别 */
  category: ToolCategory;
  
  /** 工具能力列表 */
  capabilities: string[];
  
  /**
   * 执行工具
   * @param inputs 输入参数
   * @returns 执行结果
   */
  execute(inputs: Record<string, any>): Promise<any>;
  
  /**
   * 检查工具是否可用
   * @returns 是否可用
   */
  isAvailable(): Promise<boolean>;
  
  /**
   * 获取工具元数据
   * @returns 工具元数据
   */
  getMetadata?(): ToolMetadata;
}

/**
 * 工具查询选项
 */
export interface ToolQueryOptions {
  category?: ToolCategory;
  capability?: string;
  availableOnly?: boolean;
}
