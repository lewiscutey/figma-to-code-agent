/**
 * MCP 工具适配器
 * 将 MCP 工具适配为标准 Tool 接口
 */

import type { Tool, ToolMetadata, ToolCategory } from '../tools/types';
import type { MCPService } from './MCPServiceManager';

/**
 * MCP 工具定义（来自 MCP 协议）
 */
export interface MCPToolDefinition {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, any>;
    required?: string[];
  };
}

/**
 * MCP 工具调用结果
 */
interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

/**
 * MCP 协议消息
 */
interface MCPMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * MCP 工具适配器
 * 将 MCP 工具包装为标准 Tool 接口
 */
export class MCPToolAdapter implements Tool {
  name: string;
  description: string;
  category: ToolCategory;
  capabilities: string[];

  private messageId = 0;

  constructor(
    private mcpTool: MCPToolDefinition,
    private service: MCPService,
    category: ToolCategory = 'extraction'
  ) {
    this.name = `mcp-${service.id}-${mcpTool.name}`;
    this.description = mcpTool.description || `MCP tool: ${mcpTool.name}`;
    this.category = category;
    this.capabilities = this.extractCapabilities(mcpTool);
  }

  /**
   * 检查工具是否可用
   */
  async isAvailable(): Promise<boolean> {
    return this.service.connected;
  }

  /**
   * 执行工具
   */
  async execute(inputs: Record<string, any>): Promise<any> {
    if (!this.service.connected) {
      throw new Error(`MCP service ${this.service.id} is not connected`);
    }

    // 验证输入
    this.validateInputs(inputs);

    try {
      const startTime = Date.now();

      // 调用 MCP 工具
      const result = await this.callMCPTool(this.mcpTool.name, inputs);

      const duration = Date.now() - startTime;

      // 处理结果
      if (result.isError) {
        throw new Error(`MCP tool execution failed: ${this.extractErrorMessage(result)}`);
      }

      return {
        success: true,
        data: this.extractData(result),
        metadata: {
          duration,
          toolName: this.name,
          serviceId: this.service.id,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to execute MCP tool ${this.mcpTool.name}: ${(error as Error).message}`
      );
    }
  }

  /**
   * 获取工具元数据
   */
  getMetadata(): ToolMetadata {
    return {
      version: '1.0.0',
      author: `MCP Service: ${this.service.name}`,
      performance: {
        avgDuration: 2000, // 估计值
        reliability: 0.9,
      },
      cost: {
        apiCallsPerExecution: 1,
      },
    };
  }

  /**
   * 调用 MCP 工具
   */
  private async callMCPTool(toolName: string, inputs: Record<string, any>): Promise<MCPToolResult> {
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id: ++this.messageId,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: inputs,
      },
    };

    // 发送请求（这里是简化实现）
    const response = await this.sendRequest(message);

    if (response.error) {
      return {
        content: [
          {
            type: 'text',
            text: response.error.message,
          },
        ],
        isError: true,
      };
    }

    return response.result as MCPToolResult;
  }

  /**
   * 发送 MCP 请求
   */
  private async sendRequest(message: MCPMessage, timeout = 30000): Promise<MCPMessage> {
    // 这里是简化实现，实际应该使用 WebSocket 或 stdio
    // 目前返回模拟响应
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, timeout);

      // 模拟异步响应
      setTimeout(() => {
        clearTimeout(timer);
        resolve({
          jsonrpc: '2.0',
          id: message.id,
          result: {
            content: [
              {
                type: 'text',
                text: 'Mock response',
              },
            ],
          },
        });
      }, 100);
    });
  }

  /**
   * 验证输入参数
   */
  private validateInputs(inputs: Record<string, any>): void {
    const schema = this.mcpTool.inputSchema;

    // 检查必需参数
    if (schema.required) {
      for (const requiredField of schema.required) {
        if (!(requiredField in inputs)) {
          throw new Error(`Missing required parameter: ${requiredField}`);
        }
      }
    }

    // 简单的类型检查
    if (schema.properties) {
      for (const key of Object.keys(inputs)) {
        if (!(key in schema.properties)) {
          console.warn(`Unknown parameter: ${key}`);
        }
      }
    }
  }

  /**
   * 从能力中提取工具能力
   */
  private extractCapabilities(tool: MCPToolDefinition): string[] {
    const capabilities: string[] = [];

    // 基于工具名称推断能力
    const name = tool.name.toLowerCase();

    if (name.includes('figma') || name.includes('design')) {
      capabilities.push('extract_design');
    }

    if (name.includes('file') || name.includes('get')) {
      capabilities.push('read_data');
    }

    if (name.includes('create') || name.includes('update')) {
      capabilities.push('write_data');
    }

    if (name.includes('analyze') || name.includes('inspect')) {
      capabilities.push('analyze');
    }

    // 如果没有推断出任何能力，添加通用能力
    if (capabilities.length === 0) {
      capabilities.push('mcp_tool');
    }

    return capabilities;
  }

  /**
   * 从 MCP 结果中提取数据
   */
  private extractData(result: MCPToolResult): any {
    if (!result.content || result.content.length === 0) {
      return null;
    }

    // 如果只有一个内容项，直接返回
    if (result.content.length === 1) {
      const item = result.content[0];
      if (item.type === 'text') {
        // 尝试解析 JSON
        try {
          return JSON.parse(item.text || '');
        } catch {
          return item.text;
        }
      }
      return item;
    }

    // 多个内容项，返回数组
    return result.content.map((item) => {
      if (item.type === 'text') {
        try {
          return JSON.parse(item.text || '');
        } catch {
          return item.text;
        }
      }
      return item;
    });
  }

  /**
   * 从 MCP 结果中提取错误消息
   */
  private extractErrorMessage(result: MCPToolResult): string {
    if (!result.content || result.content.length === 0) {
      return 'Unknown error';
    }

    const textContent = result.content.find((item) => item.type === 'text');
    return textContent?.text || 'Unknown error';
  }
}

/**
 * 从 MCP 服务创建工具适配器
 */
export function createMCPToolAdapters(
  service: MCPService,
  mcpTools: MCPToolDefinition[]
): MCPToolAdapter[] {
  return mcpTools.map((tool) => {
    // 根据工具名称推断类别
    let category: ToolCategory = 'extraction';

    const name = tool.name.toLowerCase();
    if (name.includes('transform') || name.includes('optimize')) {
      category = 'transformation';
    } else if (name.includes('generate') || name.includes('create')) {
      category = 'generation';
    } else if (name.includes('validate') || name.includes('test')) {
      category = 'validation';
    } else if (name.includes('analyze') || name.includes('inspect')) {
      category = 'analysis';
    }

    return new MCPToolAdapter(tool, service, category);
  });
}
