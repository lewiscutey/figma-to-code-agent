import type { LLMProvider } from '../llm/types';
import type { Intent, FigmaInput, ConversationContext } from './types';

/**
 * 意图理解引擎
 * 解析用户输入并识别意图
 */
export class IntentUnderstandingEngine {
  constructor(private llm?: LLMProvider) {}

  /**
   * 分析用户输入并提取意图
   */
  async analyzeInput(input: string, context: ConversationContext): Promise<Intent> {
    // 首先尝试提取 Figma 输入
    const figmaInput = this.extractFigmaInput(input);

    // 如果有 LLM，使用 LLM 进行深度分析
    if (this.llm) {
      return this.analyzeWithLLM(input, figmaInput, context);
    }

    // 否则使用基于规则的分析
    return this.analyzeWithRules(input, figmaInput, context);
  }

  /**
   * 提取 Figma URL 中的文件 ID 和节点 ID
   */
  private extractFigmaInput(input: string): FigmaInput | null {
    // 匹配 Figma URL 格式
    // https://www.figma.com/file/{fileKey}/{title}?node-id={nodeId}
    // https://www.figma.com/design/{fileKey}/{title}?node-id={nodeId}
    const urlPattern = /https?:\/\/(?:www\.)?figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)(?:\/[^?]*)?(?:\?.*node-id=([^&]+))?/;
    const match = input.match(urlPattern);

    if (match) {
      const fileKey = match[1];
      const nodeId = match[2]?.replace(/-/g, ':'); // Convert node-id format

      return {
        type: 'url',
        url: match[0],
        fileKey,
        nodeIds: nodeId ? [nodeId] : undefined,
      };
    }

    // 检查是否直接提供了文件 ID
    const fileIdPattern = /\b([a-zA-Z0-9]{22,})\b/;
    const fileIdMatch = input.match(fileIdPattern);
    if (fileIdMatch) {
      return {
        type: 'file_id',
        fileKey: fileIdMatch[1],
      };
    }

    // 检查是否要求使用当前打开的文件（MCP）
    if (input.includes('当前') || input.includes('current') || input.includes('opened')) {
      return {
        type: 'mcp_current',
      };
    }

    return null;
  }

  /**
   * 使用 LLM 分析意图
   */
  private async analyzeWithLLM(
    input: string,
    figmaInput: FigmaInput | null,
    context: ConversationContext
  ): Promise<Intent> {
    const prompt = this.buildLLMPrompt(input, figmaInput, context);

    try {
      const response = await this.llm!.chat([
        {
          role: 'user',
          content: prompt,
        },
      ]);

      // 解析 LLM 响应
      return this.parseLLMResponse(response.content, figmaInput);
    } catch (error) {
      console.warn('LLM analysis failed, falling back to rules:', error);
      return this.analyzeWithRules(input, figmaInput, context);
    }
  }

  /**
   * 构建 LLM prompt
   */
  private buildLLMPrompt(
    input: string,
    figmaInput: FigmaInput | null,
    context: ConversationContext
  ): string {
    const historyContext = context.history
      .slice(-5) // 最近 5 条消息
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    return `你是一个 Figma 设计转代码的 AI Agent。分析用户的意图并提取关键信息。

用户输入：${input}

${figmaInput ? `检测到 Figma 输入：${JSON.stringify(figmaInput)}` : ''}

${historyContext ? `对话历史：\n${historyContext}` : ''}

请分析用户意图并以 JSON 格式返回：
{
  "type": "generate_new" | "update_existing" | "optimize" | "analyze",
  "targetFramework": "react" | "vue" | null,
  "styleMode": "css-modules" | "tailwind" | "css" | null,
  "qualityMode": "fast" | "balanced" | "high" | null,
  "additionalRequirements": ["requirement1", "requirement2"]
}

规则：
- 如果用户说"生成"、"创建"、"转换"，type 为 "generate_new"
- 如果用户说"更新"、"修改"、"改进"，type 为 "update_existing"
- 如果用户说"优化"、"提升性能"，type 为 "optimize"
- 如果用户说"分析"、"检查"、"查看"，type 为 "analyze"
- 如果提到 React/Vue，设置 targetFramework
- 如果提到 Tailwind/CSS Modules/CSS，设置 styleMode
- 如果提到"快速"、"原型"，qualityMode 为 "fast"
- 如果提到"高质量"、"生产"，qualityMode 为 "high"
- 提取其他特殊要求到 additionalRequirements

只返回 JSON，不要其他解释。`;
  }

  /**
   * 解析 LLM 响应
   */
  private parseLLMResponse(response: string, figmaInput: FigmaInput | null): Intent {
    try {
      // 提取 JSON 部分
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        type: parsed.type || 'generate_new',
        figmaInput: figmaInput || { type: 'url' },
        targetFramework: parsed.targetFramework || undefined,
        styleMode: parsed.styleMode || undefined,
        qualityMode: parsed.qualityMode || 'balanced',
        additionalRequirements: parsed.additionalRequirements || [],
      };
    } catch (error) {
      console.warn('Failed to parse LLM response:', error);
      // 返回默认意图
      return {
        type: 'generate_new',
        figmaInput: figmaInput || { type: 'url' },
        additionalRequirements: [],
      };
    }
  }

  /**
   * 使用基于规则的分析
   */
  private analyzeWithRules(
    input: string,
    figmaInput: FigmaInput | null,
    context: ConversationContext
  ): Intent {
    const lowerInput = input.toLowerCase();

    // 确定意图类型
    let type: Intent['type'] = 'generate_new';
    if (lowerInput.includes('更新') || lowerInput.includes('修改') || lowerInput.includes('update') || lowerInput.includes('modify')) {
      type = 'update_existing';
    } else if (lowerInput.includes('优化') || lowerInput.includes('optimize') || lowerInput.includes('improve')) {
      type = 'optimize';
    } else if (lowerInput.includes('分析') || lowerInput.includes('analyze') || lowerInput.includes('check')) {
      type = 'analyze';
    }

    // 提取框架
    let targetFramework: Intent['targetFramework'];
    if (lowerInput.includes('react')) {
      targetFramework = 'react';
    } else if (lowerInput.includes('vue')) {
      targetFramework = 'vue';
    } else if (context.userPreferences.defaultFramework) {
      targetFramework = context.userPreferences.defaultFramework;
    }

    // 提取样式模式
    let styleMode: Intent['styleMode'];
    if (lowerInput.includes('tailwind')) {
      styleMode = 'tailwind';
    } else if (lowerInput.includes('css module') || lowerInput.includes('css-module')) {
      styleMode = 'css-modules';
    } else if (lowerInput.includes('css')) {
      styleMode = 'css';
    } else if (context.userPreferences.defaultStyleMode) {
      styleMode = context.userPreferences.defaultStyleMode;
    }

    // 提取质量模式
    let qualityMode: Intent['qualityMode'] = 'balanced';
    if (lowerInput.includes('快速') || lowerInput.includes('fast') || lowerInput.includes('quick') || lowerInput.includes('原型') || lowerInput.includes('prototype')) {
      qualityMode = 'fast';
    } else if (lowerInput.includes('高质量') || lowerInput.includes('high quality') || lowerInput.includes('生产') || lowerInput.includes('production')) {
      qualityMode = 'high';
    }

    // 提取额外要求
    const additionalRequirements: string[] = [];
    if (lowerInput.includes('typescript') || lowerInput.includes('ts')) {
      additionalRequirements.push('typescript');
    }
    if (lowerInput.includes('响应式') || lowerInput.includes('responsive')) {
      additionalRequirements.push('responsive');
    }
    if (lowerInput.includes('暗色模式') || lowerInput.includes('dark mode')) {
      additionalRequirements.push('dark_mode');
    }
    if (lowerInput.includes('无障碍') || lowerInput.includes('accessibility') || lowerInput.includes('a11y')) {
      additionalRequirements.push('accessibility');
    }

    return {
      type,
      figmaInput: figmaInput || { type: 'url' },
      targetFramework,
      styleMode,
      qualityMode,
      additionalRequirements,
    };
  }

  /**
   * 识别缺失的信息
   */
  identifyMissingInfo(intent: Intent): string[] {
    const missing: string[] = [];

    if (!intent.figmaInput || (!intent.figmaInput.url && !intent.figmaInput.fileKey)) {
      missing.push('figma_input');
    }

    if (!intent.targetFramework) {
      missing.push('target_framework');
    }

    if (!intent.styleMode) {
      missing.push('style_mode');
    }

    return missing;
  }

  /**
   * 生成澄清问题
   */
  generateClarificationQuestions(missingInfo: string[]): string[] {
    const questions: string[] = [];

    for (const info of missingInfo) {
      switch (info) {
        case 'figma_input':
          questions.push('请提供 Figma 设计链接或文件 ID');
          break;
        case 'target_framework':
          questions.push('您希望生成 React 还是 Vue 组件？');
          break;
        case 'style_mode':
          questions.push('您希望使用哪种样式方案？(CSS Modules / Tailwind / 纯 CSS)');
          break;
        default:
          questions.push(`请提供 ${info}`);
      }
    }

    return questions;
  }
}
