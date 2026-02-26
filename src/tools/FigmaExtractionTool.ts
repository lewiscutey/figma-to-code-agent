import { FigmaAPIClient } from '../extraction/FigmaAPIClient';
import { MCPClient } from '../extraction/MCPClient';
import type { Tool, ToolMetadata } from './types';
import type { FigmaInput } from '../agent/types';

/**
 * Figma 数据提取工具
 * 封装 FigmaAPIClient 和 MCPClient
 */
export class FigmaExtractionTool implements Tool {
  name = 'figma-extraction';
  description = 'Extract design data from Figma';
  category = 'extraction' as const;
  capabilities = ['extract_design', 'parse_figma', 'download_images'];

  constructor(
    private figmaClient: FigmaAPIClient,
    private mcpClient?: MCPClient
  ) {}

  /**
   * 检查工具是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Figma API client is always available if constructed with a token
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 执行工具
   */
  async execute(inputs: {
    figmaInput: FigmaInput;
    includeImages?: boolean;
  }): Promise<any> {
    const { figmaInput, includeImages = true } = inputs;

    // 优先使用 MCP，如果可用
    if (this.mcpClient && await this.mcpClient.isConnected()) {
      try {
        return await this.extractViaMCP(figmaInput, includeImages);
      } catch (error) {
        console.warn('MCP extraction failed, falling back to API:', error);
        // 回退到 API
      }
    }

    // 使用 Figma API
    return await this.extractViaAPI(figmaInput, includeImages);
  }

  /**
   * 获取工具元数据
   */
  getMetadata(): ToolMetadata {
    return {
      version: '1.0.0',
      author: 'Figma-to-Code Agent',
      performance: {
        avgDuration: 2000, // 平均 2 秒
        reliability: 0.95,
      },
      cost: {
        apiCallsPerExecution: 1,
      },
    };
  }

  /**
   * 通过 MCP 提取
   */
  private async extractViaMCP(
    _figmaInput: FigmaInput,
    _includeImages: boolean
  ): Promise<any> {
    if (!this.mcpClient) {
      throw new Error('MCP client not available');
    }

    // MCP currently only supports getting the current file
    return await this.mcpClient.getCurrentFile();
  }

  /**
   * 通过 API 提取
   */
  private async extractViaAPI(
    figmaInput: FigmaInput,
    includeImages: boolean
  ): Promise<any> {
    const fileKey = figmaInput.fileKey || this.extractFileKeyFromUrl(figmaInput.url);
    if (!fileKey) {
      throw new Error('No file key provided');
    }

    // 获取文件数据
    const fileData = await this.figmaClient.getFile(fileKey);

    // 下载图片（如果需要）
    let images: Record<string, string> = {};
    if (includeImages && figmaInput.nodeIds && figmaInput.nodeIds.length > 0) {
      const imageMap = await this.figmaClient.getImages(fileKey, figmaInput.nodeIds);
      images = imageMap.images || {};
    }

    return {
      file: fileData,
      images,
    };
  }

  /**
   * 从 URL 提取文件 key
   */
  private extractFileKeyFromUrl(url?: string): string | null {
    if (!url) return null;

    const match = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }
}
