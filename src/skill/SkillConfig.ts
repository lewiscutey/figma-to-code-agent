/**
 * Skill 配置管理器
 */

import * as fs from 'fs';
import * as path from 'path';
import type { SkillConfig, SkillMetadata, SkillCommand, SkillCapabilities } from './types';

/**
 * Skill 配置管理器
 */
export class SkillConfigManager {
  private config: SkillConfig;
  private metadata: SkillMetadata;
  private commands: SkillCommand[];
  private capabilities: SkillCapabilities;

  constructor(configPath?: string) {
    this.config = this.loadConfig(configPath);
    this.metadata = this.loadMetadata();
    this.commands = this.loadCommands();
    this.capabilities = this.loadCapabilities();
  }

  /**
   * 获取配置
   */
  getConfig(): SkillConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<SkillConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * 获取元数据
   */
  getMetadata(): SkillMetadata {
    return { ...this.metadata };
  }

  /**
   * 获取命令列表
   */
  getCommands(): SkillCommand[] {
    return [...this.commands];
  }

  /**
   * 获取能力
   */
  getCapabilities(): SkillCapabilities {
    return { ...this.capabilities };
  }

  /**
   * 获取命令
   */
  getCommand(name: string): SkillCommand | undefined {
    return this.commands.find((cmd) => cmd.name === name);
  }

  /**
   * 验证配置
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证 LLM 配置
    if (this.config.llmProvider && !['bedrock', 'openai', 'anthropic'].includes(this.config.llmProvider)) {
      errors.push(`Invalid LLM provider: ${this.config.llmProvider}`);
    }

    // 验证质量模式
    if (this.config.defaultQualityMode && !['fast', 'balanced', 'high'].includes(this.config.defaultQualityMode)) {
      errors.push(`Invalid quality mode: ${this.config.defaultQualityMode}`);
    }

    // 验证迭代次数
    if (this.config.maxIterations !== undefined) {
      if (this.config.maxIterations < 1 || this.config.maxIterations > 10) {
        errors.push(`Max iterations must be between 1 and 10, got: ${this.config.maxIterations}`);
      }
    }

    // 验证 Token 预算
    if (this.config.tokenBudget !== undefined && this.config.tokenBudget < 0) {
      errors.push(`Token budget must be non-negative, got: ${this.config.tokenBudget}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 保存配置
   */
  saveConfig(configPath: string): void {
    const configData = JSON.stringify(this.config, null, 2);
    fs.writeFileSync(configPath, configData, 'utf-8');
  }

  /**
   * 加载配置
   */
  private loadConfig(configPath?: string): SkillConfig {
    const defaultConfig: SkillConfig = {
      defaultFramework: 'auto',
      defaultStyleMode: 'auto',
      defaultQualityMode: 'balanced',
      enableAutoDetection: true,
      enableIterativeMode: true,
      showDecisionReasoning: true,
      maxIterations: 5,
      llmProvider: 'bedrock',
      llmModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
      tokenBudget: 100000,
      enableMCPIntegration: true,
      enableParallelProcessing: true,
      verbosity: 'normal',
    };

    if (!configPath) {
      return defaultConfig;
    }

    try {
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf-8');
        const loadedConfig = JSON.parse(configData);
        return { ...defaultConfig, ...loadedConfig };
      }
    } catch (error) {
      console.warn(`Failed to load config from ${configPath}:`, error);
    }

    return defaultConfig;
  }

  /**
   * 加载元数据
   */
  private loadMetadata(): SkillMetadata {
    try {
      const skillJsonPath = path.join(process.cwd(), 'skill.json');
      if (fs.existsSync(skillJsonPath)) {
        const skillData = JSON.parse(fs.readFileSync(skillJsonPath, 'utf-8'));
        return {
          name: skillData.name,
          displayName: skillData.displayName,
          version: skillData.version,
          description: skillData.description,
          author: skillData.author,
          icon: skillData.icon,
          category: skillData.category,
          tags: skillData.tags,
        };
      }
    } catch (error) {
      console.warn('Failed to load skill metadata:', error);
    }

    // 默认元数据
    return {
      name: 'figma-to-code-agent',
      displayName: 'Figma to Code Agent',
      version: '1.0.0',
      description: 'AI Agent for converting Figma designs to code',
      author: 'lewiscutey',
      icon: '🎨',
      category: 'development',
      tags: ['figma', 'code-generation'],
    };
  }

  /**
   * 加载命令
   */
  private loadCommands(): SkillCommand[] {
    try {
      const skillJsonPath = path.join(process.cwd(), 'skill.json');
      if (fs.existsSync(skillJsonPath)) {
        const skillData = JSON.parse(fs.readFileSync(skillJsonPath, 'utf-8'));
        return skillData.commands || [];
      }
    } catch (error) {
      console.warn('Failed to load skill commands:', error);
    }

    return [];
  }

  /**
   * 加载能力
   */
  private loadCapabilities(): SkillCapabilities {
    try {
      const skillJsonPath = path.join(process.cwd(), 'skill.json');
      if (fs.existsSync(skillJsonPath)) {
        const skillData = JSON.parse(fs.readFileSync(skillJsonPath, 'utf-8'));
        return skillData.capabilities || {};
      }
    } catch (error) {
      console.warn('Failed to load skill capabilities:', error);
    }

    return {
      conversational: true,
      contextAware: true,
      iterative: true,
      multiStep: true,
      fileGeneration: true,
      codeAnalysis: true,
    };
  }
}
