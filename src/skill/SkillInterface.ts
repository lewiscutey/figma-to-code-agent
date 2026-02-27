/**
 * Kiro Skill 接口实现
 * 处理 Skill 命令并格式化响应
 */

import { ConversationContextManager } from '../agent/ConversationContext';
import { IntentUnderstandingEngine } from '../agent/IntentUnderstandingEngine';
import { DecisionEngine } from '../agent/DecisionEngine';
import { ExecutionOrchestrator } from '../agent/ExecutionOrchestrator';
import { ToolRegistry } from '../tools/ToolRegistry';
import { ProgressDisplay } from '../cli/ProgressDisplay';
import { SkillConfigManager } from './SkillConfig';
import type {
  SkillContext,
  SkillResponse,
  SkillProgress,
  SkillMetadata,
  SkillCommand,
  SkillCapabilities,
  GeneratedFile,
  SkillAction,
} from './types';

/**
 * Skill 接口
 */
export class SkillInterface {
  private contextManager: ConversationContextManager;
  private intentEngine: IntentUnderstandingEngine;
  private decisionEngine: DecisionEngine;
  private orchestrator: ExecutionOrchestrator;
  private toolRegistry: ToolRegistry;
  private configManager: SkillConfigManager;
  private progressDisplay: ProgressDisplay;
  private progressCallback?: (progress: SkillProgress) => void;

  constructor(
    contextManager: ConversationContextManager,
    intentEngine: IntentUnderstandingEngine,
    decisionEngine: DecisionEngine,
    orchestrator: ExecutionOrchestrator,
    toolRegistry: ToolRegistry,
    configManager: SkillConfigManager
  ) {
    this.contextManager = contextManager;
    this.intentEngine = intentEngine;
    this.decisionEngine = decisionEngine;
    this.orchestrator = orchestrator;
    this.toolRegistry = toolRegistry;
    this.configManager = configManager;
    this.progressDisplay = new ProgressDisplay({
      showBar: false,
      showSteps: false,
      colorOutput: false,
      verbosity: 'minimal',
    });
  }

  /**
   * 获取 Skill 元数据
   */
  getMetadata(): SkillMetadata {
    return this.configManager.getMetadata();
  }

  /**
   * 获取命令列表
   */
  getCommands(): SkillCommand[] {
    return this.configManager.getCommands();
  }

  /**
   * 获取能力
   */
  getCapabilities(): SkillCapabilities {
    return this.configManager.getCapabilities();
  }

  /**
   * 设置进度回调
   */
  setProgressCallback(callback: (progress: SkillProgress) => void): void {
    this.progressCallback = callback;
  }

  /**
   * 处理用户输入
   */
  async handleUserInput(input: string, skillContext: SkillContext): Promise<SkillResponse> {
    try {
      // 更新上下文
      this.updateContextFromSkillContext(skillContext);

      const context = this.contextManager.getContext();

      // 理解意图
      this.reportProgress({
        phase: 'understanding',
        progress: 10,
        message: '理解您的需求...',
      });

      const intent = await this.intentEngine.analyzeInput(input, context);

      // 检查缺失信息
      const missingInfo = this.intentEngine.identifyMissingInfo(intent);
      if (missingInfo.length > 0) {
        const questions = this.intentEngine.generateClarificationQuestions(missingInfo);
        return this.formatQuestionResponse(questions[0], questions);
      }

      // 生成策略
      this.reportProgress({
        phase: 'planning',
        progress: 30,
        message: '规划执行策略...',
      });

      const strategies = this.decisionEngine.generateStrategies(
        intent,
        this.toolRegistry.listAll()
      );

      if (strategies.length === 0) {
        return this.formatErrorResponse('无法生成执行策略');
      }

      const bestStrategy = this.decisionEngine.selectBestStrategy(strategies, context);

      // 执行策略
      this.reportProgress({
        phase: 'executing',
        progress: 50,
        message: '执行中...',
        currentStep: 1,
        totalSteps: bestStrategy.steps.length,
      });

      const result = await this.orchestrator.executeStrategy(bestStrategy, context);

      this.reportProgress({
        phase: 'completed',
        progress: 100,
        message: '完成',
      });

      // 格式化响应
      if (result.success) {
        return this.formatSuccessResponse(result);
      } else {
        const errorMsg = result.errors.length > 0 ? result.errors[0].message : '执行失败';
        return this.formatErrorResponse(errorMsg);
      }
    } catch (error) {
      return this.formatErrorResponse((error as Error).message);
    }
  }

  /**
   * 处理命令
   */
  async handleCommand(
    commandName: string,
    parameters: Record<string, any>,
    skillContext: SkillContext
  ): Promise<SkillResponse> {
    const command = this.configManager.getCommand(commandName);
    if (!command) {
      return this.formatErrorResponse(`Unknown command: ${commandName}`);
    }

    try {
      switch (commandName) {
        case 'generate_from_figma':
          return await this.handleGenerateFromFigma(parameters, skillContext);
        case 'update_component':
          return await this.handleUpdateComponent(parameters, skillContext);
        case 'analyze_design':
          return await this.handleAnalyzeDesign(parameters, skillContext);
        default:
          return this.formatErrorResponse(`Unimplemented command: ${commandName}`);
      }
    } catch (error) {
      return this.formatErrorResponse((error as Error).message);
    }
  }

  /**
   * 处理 generate_from_figma 命令
   */
  private async handleGenerateFromFigma(
    parameters: Record<string, any>,
    _skillContext: SkillContext
  ): Promise<SkillResponse> {
    const { figmaUrl, framework, styleMode, qualityMode } = parameters;

    this.reportProgress({
      phase: 'extracting',
      progress: 20,
      message: '提取 Figma 设计...',
    });

    const context = this.contextManager.getContext();

    // 构建意图
    const intent = await this.intentEngine.analyzeInput(
      `生成代码：${figmaUrl}`,
      context
    );

    // 覆盖参数
    if (framework !== 'auto') {
      intent.targetFramework = framework;
    }
    if (styleMode !== 'auto') {
      intent.styleMode = styleMode;
    }
    intent.qualityMode = qualityMode || this.configManager.getConfig().defaultQualityMode;

    // 生成和执行策略
    const strategies = this.decisionEngine.generateStrategies(
      intent,
      this.toolRegistry.listAll()
    );

    if (strategies.length === 0) {
      return this.formatErrorResponse('无法生成执行策略');
    }

    const bestStrategy = this.decisionEngine.selectBestStrategy(strategies, context);

    this.reportProgress({
      phase: 'generating',
      progress: 50,
      message: '生成代码...',
    });

    const result = await this.orchestrator.executeStrategy(bestStrategy, context);

    if (result.success) {
      const files = this.extractGeneratedFiles(result.artifacts);
      const actions = this.generateActions(files, _skillContext);

      return this.formatFilesResponse(
        '✓ 代码生成成功！',
        files,
        actions,
        {
          strategy: bestStrategy.name,
          duration: result.metrics?.totalDuration,
          tokensUsed: result.metrics?.tokensUsed,
        }
      );
    } else {
      const errorMsg = result.errors.length > 0 ? result.errors[0].message : '代码生成失败';
      return this.formatErrorResponse(errorMsg);
    }
  }

  /**
   * 处理 update_component 命令
   */
  private async handleUpdateComponent(
    parameters: Record<string, any>,
    _skillContext: SkillContext
  ): Promise<SkillResponse> {
    const { figmaUrl, componentPath, preserveLogic } = parameters;

    this.reportProgress({
      phase: 'analyzing',
      progress: 20,
      message: '分析现有组件...',
    });

    const context = this.contextManager.getContext();

    const intent = await this.intentEngine.analyzeInput(
      `更新组件：${componentPath}，使用设计：${figmaUrl}`,
      context
    );

    intent.type = 'update_existing';

    const strategies = this.decisionEngine.generateStrategies(
      intent,
      this.toolRegistry.listAll()
    );

    if (strategies.length === 0) {
      return this.formatErrorResponse('无法生成更新策略');
    }

    const bestStrategy = this.decisionEngine.selectBestStrategy(strategies, context);

    this.reportProgress({
      phase: 'updating',
      progress: 50,
      message: '更新组件...',
    });

    const result = await this.orchestrator.executeStrategy(bestStrategy, context);

    if (result.success) {
      const files = this.extractGeneratedFiles(result.artifacts);
      const actions: SkillAction[] = [
        {
          type: 'diff',
          data: { files },
          label: '查看变更',
          description: '查看更新前后的差异',
        },
        {
          type: 'open_file',
          data: { path: componentPath },
          label: '打开文件',
        },
      ];

      return this.formatFilesResponse(
        '✓ 组件更新成功！',
        files,
        actions,
        {
          preservedLogic: preserveLogic,
          changedFiles: files.length,
        }
      );
    } else {
      const errorMsg = result.errors.length > 0 ? result.errors[0].message : '组件更新失败';
      return this.formatErrorResponse(errorMsg);
    }
  }

  /**
   * 处理 analyze_design 命令
   */
  private async handleAnalyzeDesign(
    parameters: Record<string, any>,
    _skillContext: SkillContext
  ): Promise<SkillResponse> {
    const { figmaUrl } = parameters;

    this.reportProgress({
      phase: 'analyzing',
      progress: 30,
      message: '分析设计...',
    });

    const context = this.contextManager.getContext();

    const intent = await this.intentEngine.analyzeInput(
      `分析设计：${figmaUrl}`,
      context
    );

    intent.type = 'analyze';

    const strategies = this.decisionEngine.generateStrategies(
      intent,
      this.toolRegistry.listAll()
    );

    if (strategies.length === 0) {
      return this.formatErrorResponse('无法生成分析策略');
    }

    const bestStrategy = this.decisionEngine.selectBestStrategy(strategies, context);

    this.reportProgress({
      phase: 'analyzing',
      progress: 70,
      message: '生成分析报告...',
    });

    const result = await this.orchestrator.executeStrategy(bestStrategy, context);

    if (result.success) {
      // 从 artifacts 中提取分析结果
      const analysis = result.artifacts.find((a) => a.type === 'documentation');
      const analysisData = analysis ? JSON.parse(analysis.content) : {};

      let message = '# 设计分析报告\n\n';
      message += `## 设计概览\n`;
      message += `- 组件数量: ${analysisData.componentCount || 0}\n`;
      message += `- 复杂度: ${analysisData.complexity || 'N/A'}\n`;
      message += `- 推荐框架: ${analysisData.recommendedFramework || 'N/A'}\n\n`;

      if (analysisData.suggestions && analysisData.suggestions.length > 0) {
        message += `## 建议\n`;
        analysisData.suggestions.forEach((suggestion: string, idx: number) => {
          message += `${idx + 1}. ${suggestion}\n`;
        });
      }

      return this.formatMessageResponse(message, { analysis: analysisData });
    } else {
      const errorMsg = result.errors.length > 0 ? result.errors[0].message : '设计分析失败';
      return this.formatErrorResponse(errorMsg);
    }
  }

  /**
   * 格式化消息响应
   */
  private formatMessageResponse(content: string, metadata?: Record<string, any>): SkillResponse {
    return {
      type: 'message',
      content,
      metadata,
    };
  }

  /**
   * 格式化文件响应
   */
  private formatFilesResponse(
    message: string,
    files: GeneratedFile[],
    actions?: SkillAction[],
    metadata?: Record<string, any>
  ): SkillResponse {
    return {
      type: 'files',
      content: message,
      files,
      actions,
      metadata,
    };
  }

  /**
   * 格式化问题响应
   */
  private formatQuestionResponse(question: string, options?: string[]): SkillResponse {
    return {
      type: 'question',
      content: question,
      question: {
        text: question,
        options,
      },
    };
  }

  /**
   * 格式化错误响应
   */
  private formatErrorResponse(error: string): SkillResponse {
    return {
      type: 'error',
      content: `❌ ${error}`,
      metadata: { error },
    };
  }

  /**
   * 格式化成功响应
   */
  private formatSuccessResponse(result: any): SkillResponse {
    if (result.artifacts && result.artifacts.length > 0) {
      const files = this.extractGeneratedFiles(result.artifacts);
      if (files.length > 0) {
        return this.formatFilesResponse('✓ 执行成功！', files);
      }
    }

    return this.formatMessageResponse('✓ 执行成功！', result);
  }

  /**
   * 提取生成的文件
   */
  private extractGeneratedFiles(artifacts: any[]): GeneratedFile[] {
    if (!artifacts || !Array.isArray(artifacts)) {
      return [];
    }

    const files: GeneratedFile[] = [];

    for (const artifact of artifacts) {
      if (artifact.type === 'code' || artifact.type === 'config') {
        files.push({
          path: artifact.path,
          content: artifact.content,
          language: this.detectLanguage(artifact.path),
        });
      }
    }

    return files;
  }

  /**
   * 检测文件语言
   */
  private detectLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescriptreact',
      js: 'javascript',
      jsx: 'javascriptreact',
      vue: 'vue',
      css: 'css',
      scss: 'scss',
      json: 'json',
      md: 'markdown',
    };
    return languageMap[ext || ''] || 'plaintext';
  }

  /**
   * 生成操作建议
   */
  private generateActions(files: GeneratedFile[], _skillContext: SkillContext): SkillAction[] {
    const actions: SkillAction[] = [];

    if (files.length > 0) {
      actions.push({
        type: 'open_file',
        data: { path: files[0].path },
        label: '打开主文件',
      });

      actions.push({
        type: 'preview',
        data: { files },
        label: '预览所有文件',
      });
    }

    // 检查是否需要安装依赖
    const hasPackageJson = files.some((f) => f.path.includes('package.json'));
    if (hasPackageJson) {
      actions.push({
        type: 'install_deps',
        data: { command: 'npm install' },
        label: '安装依赖',
        description: '安装项目依赖包',
      });
    }

    return actions;
  }

  /**
   * 更新上下文
   */
  private updateContextFromSkillContext(skillContext: SkillContext): void {
    // 更新用户偏好
    if (skillContext.projectInfo) {
      const preferences = this.contextManager.getUserPreferences();
      if (skillContext.projectInfo.framework) {
        preferences.defaultFramework = skillContext.projectInfo.framework as any;
      }
      if (skillContext.projectInfo.hasTypeScript !== undefined) {
        // TypeScript preference can be stored in additional requirements
      }
      this.contextManager.updateUserPreferences(preferences);
    }
  }

  /**
   * 报告进度
   */
  private reportProgress(progress: SkillProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }
}
