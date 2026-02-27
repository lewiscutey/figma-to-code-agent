/**
 * 交互式 CLI 接口
 * 提供对话式用户体验
 */

import * as readline from 'readline';
import { ConversationContext } from '../agent/ConversationContext';
import { IntentUnderstandingEngine } from '../agent/IntentUnderstandingEngine';
import { DecisionEngine } from '../agent/DecisionEngine';
import { ExecutionOrchestrator } from '../agent/ExecutionOrchestrator';
import { ToolRegistry } from '../tools/ToolRegistry';
import type { Intent, Strategy } from '../agent/types';

export interface CLIConfig {
  interactive: boolean;
  colorOutput: boolean;
  verbosity: 'minimal' | 'normal' | 'detailed';
  autoSave: boolean;
  contextFile?: string;
}

export interface CLIResponse {
  type: 'message' | 'question' | 'result' | 'error' | 'progress';
  content: string;
  data?: any;
  options?: string[];
}

/**
 * 交互式 CLI 接口
 */
export class InteractiveCLI {
  private rl: readline.Interface | null = null;
  private context: ConversationContext;
  private intentEngine: IntentUnderstandingEngine;
  private decisionEngine: DecisionEngine;
  private orchestrator: ExecutionOrchestrator;
  private toolRegistry: ToolRegistry;
  private config: CLIConfig;
  private isRunning: boolean = false;

  constructor(
    context: ConversationContext,
    intentEngine: IntentUnderstandingEngine,
    decisionEngine: DecisionEngine,
    orchestrator: ExecutionOrchestrator,
    toolRegistry: ToolRegistry,
    config: Partial<CLIConfig> = {}
  ) {
    this.context = context;
    this.intentEngine = intentEngine;
    this.decisionEngine = decisionEngine;
    this.orchestrator = orchestrator;
    this.toolRegistry = toolRegistry;
    this.config = {
      interactive: true,
      colorOutput: true,
      verbosity: 'normal',
      autoSave: true,
      ...config,
    };
  }

  /**
   * 启动交互式会话
   */
  async startInteractiveSession(): Promise<void> {
    if (!this.config.interactive) {
      throw new Error('Interactive mode is disabled');
    }

    this.isRunning = true;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: this.formatPrompt('> '),
    });

    this.printWelcome();

    // 恢复上下文（如果存在）
    if (this.config.contextFile) {
      try {
        await this.context.loadFromFile(this.config.contextFile);
        this.printMessage('已恢复之前的对话上下文');
      } catch (error) {
        // 忽略加载错误，从新会话开始
      }
    }

    this.rl.prompt();

    this.rl.on('line', async (input: string) => {
      const trimmed = input.trim();

      if (!trimmed) {
        this.rl!.prompt();
        return;
      }

      // 处理特殊命令
      if (await this.handleSpecialCommand(trimmed)) {
        this.rl!.prompt();
        return;
      }

      // 处理用户输入
      try {
        await this.processUserInput(trimmed);
      } catch (error) {
        this.printError(`处理输入时出错: ${(error as Error).message}`);
      }

      if (this.isRunning) {
        this.rl!.prompt();
      }
    });

    this.rl.on('close', () => {
      this.handleExit();
    });
  }

  /**
   * 执行批处理命令
   */
  async executeBatch(figmaUrl: string, options: Record<string, any> = {}): Promise<void> {
    this.printMessage(`批处理模式：处理 Figma URL ${figmaUrl}`);

    try {
      // 构建意图
      const intent: Intent = {
        type: 'generate',
        figmaUrl,
        framework: options.framework,
        styleMode: options.styleMode,
        outputPath: options.output,
        confidence: 1.0,
        missingInfo: [],
      };

      // 添加到上下文
      this.context.addMessage({
        role: 'user',
        content: `生成代码：${figmaUrl}`,
        timestamp: new Date(),
      });

      // 生成策略
      const strategies = await this.decisionEngine.generateStrategies(
        intent,
        this.toolRegistry.getAllTools()
      );

      if (strategies.length === 0) {
        throw new Error('无法生成执行策略');
      }

      // 选择最佳策略
      const bestStrategy = await this.decisionEngine.selectBestStrategy(strategies, intent);

      this.printMessage(`使用策略: ${bestStrategy.name}`);
      if (this.config.verbosity !== 'minimal') {
        this.printMessage(`理由: ${bestStrategy.reasoning}`);
      }

      // 执行策略
      const result = await this.orchestrator.executeStrategy(bestStrategy, this.context);

      if (result.success) {
        this.printSuccess('代码生成成功！');
        if (result.outputs) {
          this.printMessage(`输出文件: ${JSON.stringify(result.outputs, null, 2)}`);
        }
      } else {
        this.printError(`执行失败: ${result.error}`);
      }
    } catch (error) {
      this.printError(`批处理失败: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * 询问用户
   */
  async askUser(question: string, options?: string[]): Promise<string> {
    return new Promise((resolve) => {
      if (!this.rl) {
        throw new Error('Interactive session not started');
      }

      let prompt = this.formatQuestion(question);

      if (options && options.length > 0) {
        prompt += '\n';
        options.forEach((opt, idx) => {
          prompt += `  ${idx + 1}. ${opt}\n`;
        });
        prompt += '请选择 (输入数字或文本): ';
      }

      this.rl.question(prompt, (answer) => {
        const trimmed = answer.trim();

        // 如果提供了选项且用户输入了数字
        if (options && /^\d+$/.test(trimmed)) {
          const index = parseInt(trimmed, 10) - 1;
          if (index >= 0 && index < options.length) {
            resolve(options[index]);
            return;
          }
        }

        resolve(trimmed);
      });
    });
  }

  /**
   * 显示进度
   */
  showProgress(progress: number, message: string): void {
    if (this.config.verbosity === 'minimal') {
      return;
    }

    const percentage = Math.round(progress * 100);
    const barLength = 30;
    const filled = Math.round(barLength * progress);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

    const progressLine = `[${bar}] ${percentage}% - ${message}`;

    if (this.config.colorOutput) {
      process.stdout.write(`\r\x1b[36m${progressLine}\x1b[0m`);
    } else {
      process.stdout.write(`\r${progressLine}`);
    }

    if (progress >= 1.0) {
      process.stdout.write('\n');
    }
  }

  /**
   * 处理用户输入
   */
  private async processUserInput(input: string): Promise<void> {
    // 添加到对话历史
    this.context.addMessage({
      role: 'user',
      content: input,
      timestamp: new Date(),
    });

    // 理解意图
    this.showProgress(0.1, '理解您的需求...');
    const intent = await this.intentEngine.understandIntent(input, this.context);

    // 检查是否有缺失信息
    if (intent.missingInfo && intent.missingInfo.length > 0) {
      this.showProgress(1.0, '需要更多信息');
      this.printMessage('\n我需要一些额外信息：');

      for (const missing of intent.missingInfo) {
        const answer = await this.askUser(missing);
        this.context.addMessage({
          role: 'user',
          content: answer,
          timestamp: new Date(),
        });

        // 更新意图
        await this.updateIntentWithAnswer(intent, missing, answer);
      }
    }

    // 生成策略
    this.showProgress(0.3, '规划执行策略...');
    const strategies = await this.decisionEngine.generateStrategies(
      intent,
      this.toolRegistry.getAllTools()
    );

    if (strategies.length === 0) {
      this.printError('无法生成执行策略');
      return;
    }

    // 选择策略
    this.showProgress(0.4, '选择最佳策略...');
    const bestStrategy = await this.decisionEngine.selectBestStrategy(strategies, intent);

    // 显示决策理由
    if (this.config.verbosity === 'detailed') {
      this.printMessage(`\n选择策略: ${bestStrategy.name}`);
      this.printMessage(`理由: ${bestStrategy.reasoning}`);
      this.printMessage(`预计耗时: ${bestStrategy.estimatedDuration}ms`);
    }

    // 询问用户确认（如果策略复杂）
    if (bestStrategy.steps.length > 5) {
      const confirm = await this.askUser(
        `此操作将执行 ${bestStrategy.steps.length} 个步骤，是否继续？`,
        ['是', '否', '查看详情']
      );

      if (confirm === '否') {
        this.printMessage('已取消操作');
        return;
      }

      if (confirm === '查看详情') {
        this.printStrategyDetails(bestStrategy);
        const confirmAgain = await this.askUser('是否继续？', ['是', '否']);
        if (confirmAgain === '否') {
          this.printMessage('已取消操作');
          return;
        }
      }
    }

    // 执行策略
    this.showProgress(0.5, '执行中...');
    const result = await this.orchestrator.executeStrategy(bestStrategy, this.context);

    this.showProgress(1.0, '完成');

    // 显示结果
    if (result.success) {
      this.printSuccess('\n✓ 操作成功完成！');

      if (result.outputs) {
        this.printMessage('\n生成的文件:');
        for (const [path, content] of Object.entries(result.outputs)) {
          this.printMessage(`  - ${path} (${content.length} 字符)`);
        }
      }

      // 询问是否需要改进
      const feedback = await this.askUser('是否需要改进？', ['否', '是 - 修改样式', '是 - 重构组件', '是 - 其他']);

      if (feedback !== '否') {
        this.printMessage('请描述您希望如何改进：');
        // 等待下一轮输入
      } else {
        // 保存上下文
        if (this.config.autoSave && this.config.contextFile) {
          await this.context.saveToFile(this.config.contextFile);
        }
      }
    } else {
      this.printError(`\n✗ 操作失败: ${result.error}`);

      if (result.checkpoint) {
        this.printMessage('已保存检查点，可以稍后恢复');
      }
    }

    // 添加响应到历史
    this.context.addMessage({
      role: 'assistant',
      content: result.success ? '操作成功完成' : `操作失败: ${result.error}`,
      timestamp: new Date(),
    });
  }

  /**
   * 处理特殊命令
   */
  private async handleSpecialCommand(input: string): Promise<boolean> {
    const lower = input.toLowerCase();

    if (lower === 'exit' || lower === 'quit' || lower === 'q') {
      this.handleExit();
      return true;
    }

    if (lower === 'help' || lower === 'h' || lower === '帮助') {
      this.printHelp();
      return true;
    }

    if (lower === 'clear' || lower === 'cls') {
      console.clear();
      this.printWelcome();
      return true;
    }

    if (lower === 'history' || lower === '历史') {
      this.printHistory();
      return true;
    }

    if (lower === 'status' || lower === '状态') {
      this.printStatus();
      return true;
    }

    if (lower.startsWith('save ')) {
      const filename = lower.substring(5).trim();
      await this.context.saveToFile(filename);
      this.printSuccess(`已保存上下文到 ${filename}`);
      return true;
    }

    if (lower.startsWith('load ')) {
      const filename = lower.substring(5).trim();
      await this.context.loadFromFile(filename);
      this.printSuccess(`已加载上下文从 ${filename}`);
      return true;
    }

    return false;
  }

  /**
   * 更新意图（根据用户回答）
   */
  private async updateIntentWithAnswer(intent: Intent, question: string, answer: string): Promise<void> {
    // 简单的关键词匹配来更新意图
    if (question.includes('框架') || question.includes('framework')) {
      if (answer.toLowerCase().includes('react')) {
        intent.framework = 'react';
      } else if (answer.toLowerCase().includes('vue')) {
        intent.framework = 'vue';
      }
    }

    if (question.includes('样式') || question.includes('style')) {
      if (answer.includes('Tailwind') || answer.includes('tailwind')) {
        intent.styleMode = 'tailwind';
      } else if (answer.includes('CSS Modules') || answer.includes('modules')) {
        intent.styleMode = 'css-modules';
      } else if (answer.includes('CSS') || answer.includes('css')) {
        intent.styleMode = 'css';
      }
    }

    if (question.includes('输出') || question.includes('output')) {
      intent.outputPath = answer;
    }
  }

  /**
   * 打印欢迎信息
   */
  private printWelcome(): void {
    const welcome = `
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║        Figma to Code Agent - 交互式模式                    ║
║                                                            ║
║  输入 Figma URL 或描述您的需求，我会帮您生成代码           ║
║  输入 'help' 查看帮助，'exit' 退出                         ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`;

    if (this.config.colorOutput) {
      console.log(`\x1b[36m${welcome}\x1b[0m`);
    } else {
      console.log(welcome);
    }
  }

  /**
   * 打印帮助信息
   */
  private printHelp(): void {
    const help = `
可用命令:
  help, h, 帮助     - 显示此帮助信息
  exit, quit, q     - 退出程序
  clear, cls        - 清屏
  history, 历史     - 显示对话历史
  status, 状态      - 显示当前状态
  save <文件名>     - 保存对话上下文
  load <文件名>     - 加载对话上下文

使用示例:
  - 输入 Figma URL 直接生成代码
  - "生成 React 组件" - 使用自然语言描述
  - "保持现有风格" - 匹配项目代码风格
  - "优化性能" - 启用性能优化
`;

    this.printMessage(help);
  }

  /**
   * 打印对话历史
   */
  private printHistory(): void {
    const messages = this.context.getMessages();

    if (messages.length === 0) {
      this.printMessage('暂无对话历史');
      return;
    }

    this.printMessage('\n对话历史:');
    messages.forEach((msg, idx) => {
      const role = msg.role === 'user' ? '用户' : 'Agent';
      const time = msg.timestamp.toLocaleTimeString();
      this.printMessage(`[${idx + 1}] ${time} ${role}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
    });
  }

  /**
   * 打印状态信息
   */
  private printStatus(): void {
    const taskState = this.context.getTaskState();
    const preferences = this.context.getUserPreferences();

    this.printMessage('\n当前状态:');
    this.printMessage(`  阶段: ${taskState.phase}`);
    this.printMessage(`  进度: ${Math.round(taskState.progress * 100)}%`);
    this.printMessage(`  消息数: ${this.context.getMessages().length}`);

    if (Object.keys(preferences).length > 0) {
      this.printMessage('\n用户偏好:');
      for (const [key, value] of Object.entries(preferences)) {
        this.printMessage(`  ${key}: ${value}`);
      }
    }
  }

  /**
   * 打印策略详情
   */
  private printStrategyDetails(strategy: Strategy): void {
    this.printMessage(`\n策略详情: ${strategy.name}`);
    this.printMessage(`描述: ${strategy.description}`);
    this.printMessage(`预计耗时: ${strategy.estimatedDuration}ms`);
    this.printMessage(`\n执行步骤:`);

    strategy.steps.forEach((step, idx) => {
      this.printMessage(`  ${idx + 1}. ${step.tool} - ${step.description || '执行工具'}`);
    });
  }

  /**
   * 处理退出
   */
  private handleExit(): void {
    this.isRunning = false;

    if (this.config.autoSave && this.config.contextFile) {
      this.context.saveToFile(this.config.contextFile).catch(() => {
        // 忽略保存错误
      });
    }

    this.printMessage('\n再见！👋');

    if (this.rl) {
      this.rl.close();
    }

    process.exit(0);
  }

  /**
   * 格式化提示符
   */
  private formatPrompt(text: string): string {
    if (this.config.colorOutput) {
      return `\x1b[32m${text}\x1b[0m`;
    }
    return text;
  }

  /**
   * 格式化问题
   */
  private formatQuestion(text: string): string {
    if (this.config.colorOutput) {
      return `\x1b[33m${text}\x1b[0m`;
    }
    return text;
  }

  /**
   * 打印消息
   */
  private printMessage(message: string): void {
    console.log(message);
  }

  /**
   * 打印成功消息
   */
  private printSuccess(message: string): void {
    if (this.config.colorOutput) {
      console.log(`\x1b[32m${message}\x1b[0m`);
    } else {
      console.log(message);
    }
  }

  /**
   * 打印错误消息
   */
  private printError(message: string): void {
    if (this.config.colorOutput) {
      console.error(`\x1b[31m${message}\x1b[0m`);
    } else {
      console.error(message);
    }
  }
}
