/**
 * MCP 服务器实现
 * 暴露 Agent 能力为 MCP 工具
 */

import * as readline from 'readline';
import { ConversationContextManager } from '../agent/ConversationContext';
import { IntentUnderstandingEngine } from '../agent/IntentUnderstandingEngine';
import { DecisionEngine } from '../agent/DecisionEngine';
import { ExecutionOrchestrator } from '../agent/ExecutionOrchestrator';
import { ToolRegistry } from '../tools/ToolRegistry';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface MCPServerConfig {
  transport: 'stdio' | 'websocket';
  name: string;
  version: string;
  port?: number;
  host?: string;
}

/**
 * MCP 服务器
 */
export class MCPServer {
  private config: MCPServerConfig;
  private tools: Map<string, MCPTool> = new Map();
  private contextManager: ConversationContextManager;
  private intentEngine: IntentUnderstandingEngine;
  private decisionEngine: DecisionEngine;
  private orchestrator: ExecutionOrchestrator;
  private toolRegistry: ToolRegistry;
  private isRunning: boolean = false;
  private rl: readline.Interface | null = null;

  constructor(
    contextManager: ConversationContextManager,
    intentEngine: IntentUnderstandingEngine,
    decisionEngine: DecisionEngine,
    orchestrator: ExecutionOrchestrator,
    toolRegistry: ToolRegistry,
    config: Partial<MCPServerConfig> = {}
  ) {
    this.contextManager = contextManager;
    this.intentEngine = intentEngine;
    this.decisionEngine = decisionEngine;
    this.orchestrator = orchestrator;
    this.toolRegistry = toolRegistry;
    this.config = {
      transport: 'stdio',
      name: 'figma-to-code-agent',
      version: '1.0.0',
      ...config,
    };
  }

  /**
   * 启动 MCP 服务器
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('MCP server is already running');
    }

    this.registerMCPTools();

    if (this.config.transport === 'stdio') {
      await this.startStdioTransport();
    } else if (this.config.transport === 'websocket') {
      await this.startWebSocketTransport();
    } else {
      throw new Error(`Unsupported transport: ${this.config.transport}`);
    }

    this.isRunning = true;
  }

  /**
   * 停止 MCP 服务器
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }

  /**
   * 注册 MCP 工具
   */
  registerMCPTools(): void {
    // 注册 figma_to_code 工具
    this.tools.set('figma_to_code', {
      name: 'figma_to_code',
      description: '将 Figma 设计转换为代码',
      inputSchema: {
        type: 'object',
        properties: {
          figmaUrl: {
            type: 'string',
            description: 'Figma 设计的 URL',
          },
          framework: {
            type: 'string',
            enum: ['react', 'vue'],
            description: '目标框架（react 或 vue）',
          },
          styleMode: {
            type: 'string',
            enum: ['css-modules', 'tailwind', 'css'],
            description: '样式方案',
          },
          outputPath: {
            type: 'string',
            description: '输出路径',
          },
        },
        required: ['figmaUrl'],
      },
    });

    // 注册 analyze_design 工具
    this.tools.set('analyze_design', {
      name: 'analyze_design',
      description: '分析 Figma 设计并提供建议',
      inputSchema: {
        type: 'object',
        properties: {
          figmaUrl: {
            type: 'string',
            description: 'Figma 设计的 URL',
          },
        },
        required: ['figmaUrl'],
      },
    });

    // 注册 update_component 工具
    this.tools.set('update_component', {
      name: 'update_component',
      description: '更新现有组件以匹配新设计',
      inputSchema: {
        type: 'object',
        properties: {
          figmaUrl: {
            type: 'string',
            description: 'Figma 设计的 URL',
          },
          componentPath: {
            type: 'string',
            description: '现有组件的文件路径',
          },
        },
        required: ['figmaUrl', 'componentPath'],
      },
    });
  }

  /**
   * 处理工具调用
   */
  async handleToolCall(toolName: string, inputs: any): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    // 验证输入
    this.validateInputs(tool, inputs);

    // 根据工具名称调用相应的处理器
    switch (toolName) {
      case 'figma_to_code':
        return this.handleFigmaToCode(inputs);
      case 'analyze_design':
        return this.handleAnalyzeDesign(inputs);
      case 'update_component':
        return this.handleUpdateComponent(inputs);
      default:
        throw new Error(`Unimplemented tool: ${toolName}`);
    }
  }

  /**
   * 启动 stdio 传输
   */
  private async startStdioTransport(): Promise<void> {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    this.rl.on('line', async (line: string) => {
      try {
        const request = JSON.parse(line) as MCPRequest;
        const response = await this.handleRequest(request);
        this.sendResponse(response);
      } catch (error) {
        this.sendError(null, -32700, 'Parse error', (error as Error).message);
      }
    });

    this.rl.on('close', () => {
      this.stop();
    });
  }

  /**
   * 启动 WebSocket 传输
   */
  private async startWebSocketTransport(): Promise<void> {
    // WebSocket 实现留待后续
    throw new Error('WebSocket transport not yet implemented');
  }

  /**
   * 处理 MCP 请求
   */
  private async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    try {
      switch (request.method) {
        case 'initialize':
          return this.handleInitialize(request);
        case 'tools/list':
          return this.handleListTools(request);
        case 'tools/call':
          return this.handleCallTool(request);
        default:
          return this.createErrorResponse(request.id, -32601, 'Method not found');
      }
    } catch (error) {
      return this.createErrorResponse(
        request.id,
        -32603,
        'Internal error',
        (error as Error).message
      );
    }
  }

  /**
   * 处理 initialize 请求
   */
  private handleInitialize(request: MCPRequest): MCPResponse {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        protocolVersion: '2024-11-05',
        serverInfo: {
          name: this.config.name,
          version: this.config.version,
        },
        capabilities: {
          tools: {},
        },
      },
    };
  }

  /**
   * 处理 list_tools 请求
   */
  private handleListTools(request: MCPRequest): MCPResponse {
    const tools = Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));

    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        tools,
      },
    };
  }

  /**
   * 处理 call_tool 请求
   */
  private async handleCallTool(request: MCPRequest): Promise<MCPResponse> {
    const { name, arguments: args } = request.params;

    try {
      const result = await this.handleToolCall(name, args);

      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        },
      };
    } catch (error) {
      return this.createErrorResponse(
        request.id,
        -32000,
        'Tool execution failed',
        (error as Error).message
      );
    }
  }

  /**
   * 处理 figma_to_code 工具调用
   */
  private async handleFigmaToCode(inputs: any): Promise<any> {
      const { figmaUrl, framework, styleMode } = inputs;

      const context = this.contextManager.getContext();

      // 构建意图
      const intent = await this.intentEngine.analyzeInput(
        `生成代码：${figmaUrl}`,
        context
      );

      // 覆盖参数
      if (framework) {
        intent.targetFramework = framework;
      }
      if (styleMode) {
        intent.styleMode = styleMode;
      }

      // 生成策略
      const strategies = this.decisionEngine.generateStrategies(
        intent,
        this.toolRegistry.listAll()
      );

      if (strategies.length === 0) {
        throw new Error('无法生成执行策略');
      }

      // 选择最佳策略
      const bestStrategy = this.decisionEngine.selectBestStrategy(strategies, context);

      // 执行策略
      const result = await this.orchestrator.executeStrategy(bestStrategy, context);

      if (!result.success) {
        const errorMsg = result.errors.length > 0 ? result.errors[0].message : '执行失败';
        throw new Error(errorMsg);
      }

      // 提取生成的文件
      const files: Record<string, string> = {};
      for (const artifact of result.artifacts) {
        if (artifact.type === 'code' || artifact.type === 'config') {
          files[artifact.path] = artifact.content;
        }
      }

      return {
        success: true,
        outputs: files,
        message: '代码生成成功',
      };
    }

  /**
   * 处理 analyze_design 工具调用
   */
  private async handleAnalyzeDesign(inputs: any): Promise<any> {
      const { figmaUrl } = inputs;

      const context = this.contextManager.getContext();

      // 构建意图
      const intent = await this.intentEngine.analyzeInput(
        `分析设计：${figmaUrl}`,
        context
      );

      intent.type = 'analyze';

      // 生成策略
      const strategies = this.decisionEngine.generateStrategies(
        intent,
        this.toolRegistry.listAll()
      );

      if (strategies.length === 0) {
        throw new Error('无法生成分析策略');
      }

      // 选择最佳策略
      const bestStrategy = this.decisionEngine.selectBestStrategy(strategies, context);

      // 执行策略
      const result = await this.orchestrator.executeStrategy(bestStrategy, context);

      if (!result.success) {
        const errorMsg = result.errors.length > 0 ? result.errors[0].message : '分析失败';
        throw new Error(errorMsg);
      }

      // 从 artifacts 中提取分析结果
      const analysis = result.artifacts.find((a) => a.type === 'documentation');
      const analysisData = analysis ? JSON.parse(analysis.content) : {};

      return {
        success: true,
        analysis: analysisData,
        suggestions: analysisData.suggestions || [],
        message: '设计分析完成',
      };
    }

  /**
   * 处理 update_component 工具调用
   */
  private async handleUpdateComponent(inputs: any): Promise<any> {
      const { figmaUrl, componentPath } = inputs;

      const context = this.contextManager.getContext();

      // 构建意图
      const intent = await this.intentEngine.analyzeInput(
        `更新组件：${componentPath}，使用设计：${figmaUrl}`,
        context
      );

      intent.type = 'update_existing';

      // 生成策略
      const strategies = this.decisionEngine.generateStrategies(
        intent,
        this.toolRegistry.listAll()
      );

      if (strategies.length === 0) {
        throw new Error('无法生成更新策略');
      }

      // 选择最佳策略
      const bestStrategy = this.decisionEngine.selectBestStrategy(strategies, context);

      // 执行策略
      const result = await this.orchestrator.executeStrategy(bestStrategy, context);

      if (!result.success) {
        const errorMsg = result.errors.length > 0 ? result.errors[0].message : '更新失败';
        throw new Error(errorMsg);
      }

      // 提取更新的文件
      const files: Record<string, string> = {};
      for (const artifact of result.artifacts) {
        if (artifact.type === 'code' || artifact.type === 'config') {
          files[artifact.path] = artifact.content;
        }
      }

      return {
        success: true,
        updatedFiles: files,
        diff: {}, // TODO: Implement diff calculation
        message: '组件更新成功',
      };
    }

  /**
   * 验证输入
   */
  private validateInputs(tool: MCPTool, inputs: any): void {
    const required = tool.inputSchema.required || [];

    for (const field of required) {
      if (!(field in inputs)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // 验证枚举值
    for (const [key, schema] of Object.entries(tool.inputSchema.properties)) {
      if (key in inputs && (schema as any).enum) {
        const value = inputs[key];
        const validValues = (schema as any).enum;
        if (!validValues.includes(value)) {
          throw new Error(`Invalid value for ${key}: ${value}. Must be one of: ${validValues.join(', ')}`);
        }
      }
    }
  }

  /**
   * 创建错误响应
   */
  private createErrorResponse(
    id: string | number | null,
    code: number,
    message: string,
    data?: any
  ): MCPResponse {
    return {
      jsonrpc: '2.0',
      id: id || 0,
      error: {
        code,
        message,
        data,
      },
    };
  }

  /**
   * 发送响应
   */
  private sendResponse(response: MCPResponse): void {
    console.log(JSON.stringify(response));
  }

  /**
   * 发送错误
   */
  private sendError(id: string | number | null, code: number, message: string, data?: any): void {
    this.sendResponse(this.createErrorResponse(id, code, message, data));
  }
}
