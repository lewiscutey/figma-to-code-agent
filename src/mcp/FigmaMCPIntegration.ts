/**
 * Figma MCP 服务集成
 * 实现 MCP 优先、API 回退的策略
 */

import { FigmaAPIClient } from '../extraction/FigmaAPIClient';
import { MCPClient } from '../extraction/MCPClient';
import type { MCPServiceManager, MCPServiceConfig } from './MCPServiceManager';
import type { FigmaFile } from '../extraction/types';

export interface FigmaMCPConfig {
  // MCP 配置
  mcpUrl?: string;
  mcpEnabled?: boolean;

  // API 配置
  apiToken: string;
  apiEnabled?: boolean;

  // 策略配置
  preferMCP?: boolean; // 优先使用 MCP
  fallbackToAPI?: boolean; // MCP 失败时回退到 API
}

/**
 * Figma MCP 集成类
 * 提供统一的 Figma 数据访问接口，自动处理 MCP/API 切换
 */
export class FigmaMCPIntegration {
  private mcpClient?: MCPClient;
  private apiClient: FigmaAPIClient;
  private mcpAvailable = false;

  constructor(
    private config: FigmaMCPConfig,
    private serviceManager?: MCPServiceManager
  ) {
    // 初始化 API 客户端（始终可用作为回退）
    this.apiClient = new FigmaAPIClient(config.apiToken);

    // 初始化 MCP 客户端（如果启用）
    if (config.mcpEnabled !== false && config.mcpUrl) {
      this.mcpClient = new MCPClient(config.mcpUrl);
    }
  }

  /**
   * 初始化连接
   */
  async initialize(): Promise<void> {
    // 尝试连接 MCP
    if (this.mcpClient && this.config.mcpEnabled !== false) {
      try {
        await this.mcpClient.connect();
        this.mcpAvailable = true;
        console.log('✓ Figma MCP service connected');
      } catch (error) {
        console.warn('Figma MCP service not available, will use API fallback:', error);
        this.mcpAvailable = false;
      }
    }

    // 注册到服务管理器
    if (this.serviceManager && this.mcpClient && this.config.mcpUrl) {
      const serviceConfig: MCPServiceConfig = {
        id: 'figma-mcp',
        name: 'Figma MCP Service',
        url: this.config.mcpUrl,
        autoConnect: true,
        healthCheckInterval: 60000, // 每分钟检查一次
        maxReconnectAttempts: 5,
      };

      try {
        await this.serviceManager.registerService(serviceConfig);
      } catch (error) {
        console.warn('Failed to register Figma MCP service:', error);
      }
    }
  }

  /**
   * 获取 Figma 文件数据
   * 优先使用 MCP，失败时回退到 API
   */
  async getFile(fileKey: string): Promise<FigmaFile> {
    // 策略 1: 优先使用 MCP
    if (this.shouldUseMCP()) {
      try {
        console.log('Attempting to fetch via MCP...');
        const result = await this.getFileViaMCP();
        console.log('✓ Successfully fetched via MCP');
        return result;
      } catch (error) {
        console.warn('MCP fetch failed:', error);

        // 如果不允许回退，直接抛出错误
        if (this.config.fallbackToAPI === false) {
          throw error;
        }

        console.log('Falling back to API...');
      }
    }

    // 策略 2: 使用 API（回退或主要方式）
    if (this.config.apiEnabled !== false) {
      console.log('Fetching via Figma API...');
      return await this.apiClient.getFile(fileKey);
    }

    throw new Error('No available method to fetch Figma file');
  }

  /**
   * 获取图片资源
   */
  async getImages(
    fileKey: string,
    nodeIds: string[],
    format: 'png' | 'jpg' | 'svg' | 'pdf' = 'png'
  ): Promise<Record<string, string>> {
    // MCP 目前不支持图片导出，直接使用 API
    if (this.config.apiEnabled !== false) {
      const result = await this.apiClient.getImages(fileKey, nodeIds, format);
      return result.images || {};
    }

    throw new Error('Image export not available');
  }

  /**
   * 下载图片到本地
   */
  async downloadImage(imageUrl: string, outputPath: string): Promise<void> {
    return await this.apiClient.downloadImage(imageUrl, outputPath);
  }

  /**
   * 监听设计变更（仅 MCP 支持）
   */
  watchChanges(callback: (changes: any) => void): void {
    if (!this.mcpClient) {
      throw new Error('MCP client not available for watching changes');
    }

    if (!this.mcpAvailable) {
      throw new Error('MCP service not connected');
    }

    this.mcpClient.watchChanges(callback);
  }

  /**
   * 检查 MCP 是否可用
   */
  isMCPAvailable(): boolean {
    return this.mcpAvailable && this.mcpClient?.isConnected() === true;
  }

  /**
   * 检查 API 是否可用
   */
  isAPIAvailable(): boolean {
    return this.config.apiEnabled !== false;
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.mcpClient) {
      this.mcpClient.disconnect();
      this.mcpAvailable = false;
    }
  }

  /**
   * 判断是否应该使用 MCP
   */
  private shouldUseMCP(): boolean {
    // 检查 MCP 是否启用
    if (this.config.mcpEnabled === false) {
      return false;
    }

    // 检查是否优先使用 MCP
    if (this.config.preferMCP === false) {
      return false;
    }

    // 检查 MCP 是否可用
    return this.mcpAvailable && this.mcpClient?.isConnected() === true;
  }

  /**
   * 通过 MCP 获取文件
   */
  private async getFileViaMCP(): Promise<FigmaFile> {
    if (!this.mcpClient) {
      throw new Error('MCP client not initialized');
    }

    // 获取当前打开的文件
    return await this.mcpClient.getCurrentFile();
  }
}

/**
 * 创建 Figma MCP 集成实例
 */
export function createFigmaMCPIntegration(
  config: FigmaMCPConfig,
  serviceManager?: MCPServiceManager
): FigmaMCPIntegration {
  return new FigmaMCPIntegration(config, serviceManager);
}
