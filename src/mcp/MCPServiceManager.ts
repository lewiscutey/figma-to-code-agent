/**
 * MCP 服务管理器
 * 负责管理 MCP 服务的连接、工具发现和健康检查
 */

import type { Tool } from '../tools/types';

export interface MCPService {
  id: string;
  name: string;
  url: string;
  connected: boolean;
  tools: Tool[];
  lastHealthCheck?: Date;
  reconnectAttempts: number;
}

export interface MCPServiceConfig {
  id: string;
  name: string;
  url: string;
  autoConnect?: boolean;
  healthCheckInterval?: number; // milliseconds
  maxReconnectAttempts?: number;
}

export interface MCPServiceManager {
  /**
   * 注册 MCP 服务
   */
  registerService(config: MCPServiceConfig): Promise<void>;

  /**
   * 连接到 MCP 服务
   */
  connectService(serviceId: string): Promise<boolean>;

  /**
   * 断开 MCP 服务
   */
  disconnectService(serviceId: string): Promise<void>;

  /**
   * 发现服务提供的工具
   */
  discoverTools(serviceId: string): Promise<Tool[]>;

  /**
   * 获取所有已注册的服务
   */
  getServices(): MCPService[];

  /**
   * 获取特定服务
   */
  getService(serviceId: string): MCPService | undefined;

  /**
   * 健康检查
   */
  healthCheck(serviceId: string): Promise<boolean>;

  /**
   * 获取所有可用的工具
   */
  getAllTools(): Tool[];
}

/**
 * MCP 协议消息类型
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
 * MCP 服务管理器实现
 */
export class MCPServiceManagerImpl implements MCPServiceManager {
  private services: Map<string, MCPService> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private messageId = 0;

  /**
   * 注册 MCP 服务
   */
  async registerService(config: MCPServiceConfig): Promise<void> {
    if (this.services.has(config.id)) {
      throw new Error(`Service ${config.id} is already registered`);
    }

    const service: MCPService = {
      id: config.id,
      name: config.name,
      url: config.url,
      connected: false,
      tools: [],
      reconnectAttempts: 0,
    };

    this.services.set(config.id, service);

    // 自动连接
    if (config.autoConnect !== false) {
      try {
        await this.connectService(config.id);
      } catch (error) {
        console.warn(`Failed to auto-connect to service ${config.id}:`, error);
      }
    }

    // 设置健康检查
    if (config.healthCheckInterval && config.healthCheckInterval > 0) {
      this.startHealthCheck(config.id, config.healthCheckInterval);
    }
  }

  /**
   * 连接到 MCP 服务
   */
  async connectService(serviceId: string): Promise<boolean> {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service ${serviceId} not found`);
    }

    try {
      // 发送初始化请求
      const response = await this.sendRequest(service, 'initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        clientInfo: {
          name: 'figma-to-code-agent',
          version: '1.0.0',
        },
      });

      if (response.error) {
        throw new Error(`Initialization failed: ${response.error.message}`);
      }

      service.connected = true;
      service.reconnectAttempts = 0;

      // 发现工具
      const tools = await this.discoverTools(serviceId);
      service.tools = tools;

      console.log(`✓ Connected to MCP service: ${service.name}`);
      console.log(`  Discovered ${tools.length} tools`);

      return true;
    } catch (error) {
      service.connected = false;
      console.error(`Failed to connect to service ${serviceId}:`, error);
      return false;
    }
  }

  /**
   * 断开 MCP 服务
   */
  async disconnectService(serviceId: string): Promise<void> {
    const service = this.services.get(serviceId);
    if (!service) {
      return;
    }

    // 停止健康检查
    const interval = this.healthCheckIntervals.get(serviceId);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(serviceId);
    }

    service.connected = false;
    service.tools = [];

    console.log(`Disconnected from MCP service: ${service.name}`);
  }

  /**
   * 发现服务提供的工具
   */
  async discoverTools(serviceId: string): Promise<Tool[]> {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service ${serviceId} not found`);
    }

    if (!service.connected) {
      throw new Error(`Service ${serviceId} is not connected`);
    }

    try {
      const response = await this.sendRequest(service, 'tools/list', {});

      if (response.error) {
        throw new Error(`Tool discovery failed: ${response.error.message}`);
      }

      // 将 MCP 工具转换为标准 Tool 接口
      // 这里返回空数组，实际的适配将在 MCPToolAdapter 中完成
      return [];
    } catch (error) {
      console.error(`Failed to discover tools from service ${serviceId}:`, error);
      return [];
    }
  }

  /**
   * 获取所有已注册的服务
   */
  getServices(): MCPService[] {
    return Array.from(this.services.values());
  }

  /**
   * 获取特定服务
   */
  getService(serviceId: string): MCPService | undefined {
    return this.services.get(serviceId);
  }

  /**
   * 健康检查
   */
  async healthCheck(serviceId: string): Promise<boolean> {
    const service = this.services.get(serviceId);
    if (!service) {
      return false;
    }

    if (!service.connected) {
      // 尝试重连
      return await this.reconnect(service);
    }

    try {
      // 发送 ping 请求
      const response = await this.sendRequest(
        service,
        'ping',
        {},
        5000 // 5 秒超时
      );

      const isHealthy = !response.error;
      service.lastHealthCheck = new Date();

      if (!isHealthy) {
        console.warn(`Health check failed for service ${serviceId}`);
        return await this.reconnect(service);
      }

      return true;
    } catch (error) {
      console.error(`Health check error for service ${serviceId}:`, error);
      return await this.reconnect(service);
    }
  }

  /**
   * 获取所有可用的工具
   */
  getAllTools(): Tool[] {
    const allTools: Tool[] = [];

    for (const service of this.services.values()) {
      if (service.connected) {
        allTools.push(...service.tools);
      }
    }

    return allTools;
  }

  /**
   * 发送 MCP 请求
   */
  private async sendRequest(
    service: MCPService,
    method: string,
    params: any,
    _timeout = 30000
  ): Promise<MCPMessage> {
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id: ++this.messageId,
      method,
      params,
    };

    // 这里是简化实现，实际应该使用 WebSocket 或 stdio
    // 目前返回模拟响应
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          jsonrpc: '2.0',
          id: message.id,
          result: {},
        });
      }, 100);
    });
  }

  /**
   * 重连服务
   */
  private async reconnect(service: MCPService): Promise<boolean> {
    const maxAttempts = 5;

    if (service.reconnectAttempts >= maxAttempts) {
      console.error(
        `Max reconnect attempts (${maxAttempts}) reached for service ${service.id}`
      );
      return false;
    }

    service.reconnectAttempts++;
    console.log(
      `Attempting to reconnect to service ${service.id} (${service.reconnectAttempts}/${maxAttempts})...`
    );

    const connected = await this.connectService(service.id);

    if (!connected) {
      // 指数退避
      const delay = Math.min(1000 * Math.pow(2, service.reconnectAttempts), 30000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    return connected;
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(serviceId: string, interval: number): void {
    const existingInterval = this.healthCheckIntervals.get(serviceId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    const intervalId = setInterval(async () => {
      await this.healthCheck(serviceId);
    }, interval);

    this.healthCheckIntervals.set(serviceId, intervalId);
  }
}
