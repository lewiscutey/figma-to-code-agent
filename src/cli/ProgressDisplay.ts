/**
 * 进度显示系统
 * 提供可视化的执行进度反馈
 */

export interface ProgressStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  progress: number; // 0-1
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

export interface ProgressConfig {
  showBar: boolean;
  showSteps: boolean;
  showReasoning: boolean;
  showTimings: boolean;
  colorOutput: boolean;
  verbosity: 'minimal' | 'normal' | 'detailed';
}

export interface DecisionReasoning {
  decision: string;
  reasoning: string;
  alternatives?: string[];
  confidence: number;
}

/**
 * 进度显示器
 */
export class ProgressDisplay {
  private config: ProgressConfig;
  private steps: Map<string, ProgressStep> = new Map();
  private currentStep: string | null = null;
  private overallProgress: number = 0;
  private startTime: Date | null = null;
  private lastUpdateTime: number = 0;
  private updateThrottleMs: number = 100; // 限制更新频率

  constructor(config: Partial<ProgressConfig> = {}) {
    this.config = {
      showBar: true,
      showSteps: true,
      showReasoning: true,
      showTimings: true,
      colorOutput: true,
      verbosity: 'normal',
      ...config,
    };
  }

  /**
   * 开始进度跟踪
   */
  start(totalSteps: ProgressStep[]): void {
    this.startTime = new Date();
    this.steps.clear();
    this.currentStep = null;
    this.overallProgress = 0;

    for (const step of totalSteps) {
      this.steps.set(step.id, { ...step, status: 'pending', progress: 0 });
    }

    if (this.config.verbosity !== 'minimal') {
      this.printHeader();
      if (this.config.showSteps) {
        this.printSteps();
      }
    }
  }

  /**
   * 更新步骤状态
   */
  updateStep(stepId: string, status: ProgressStep['status'], progress?: number, error?: string): void {
    const step = this.steps.get(stepId);
    if (!step) {
      return;
    }

    const now = Date.now();
    if (now - this.lastUpdateTime < this.updateThrottleMs && status === 'running') {
      // 限制更新频率（运行中状态）
      return;
    }
    this.lastUpdateTime = now;

    // 更新步骤
    step.status = status;
    if (progress !== undefined) {
      step.progress = Math.max(0, Math.min(1, progress));
    }
    if (error) {
      step.error = error;
    }

    if (status === 'running' && !step.startTime) {
      step.startTime = new Date();
      this.currentStep = stepId;
    }

    if ((status === 'completed' || status === 'failed' || status === 'skipped') && !step.endTime) {
      step.endTime = new Date();
      if (status === 'completed') {
        step.progress = 1;
      }
    }

    // 计算总体进度
    this.calculateOverallProgress();

    // 显示更新
    if (this.config.showBar) {
      this.renderProgressBar();
    }

    if (this.config.showSteps && this.config.verbosity !== 'minimal') {
      this.renderCurrentStep(step);
    }
  }

  /**
   * 显示决策理由
   */
  showReasoning(reasoning: DecisionReasoning): void {
    if (!this.config.showReasoning || this.config.verbosity === 'minimal') {
      return;
    }

    console.log('\n' + this.formatBox('决策说明'));
    console.log(this.colorize(`决策: ${reasoning.decision}`, 'cyan'));
    console.log(this.colorize(`理由: ${reasoning.reasoning}`, 'white'));

    if (reasoning.confidence !== undefined) {
      const confidencePercent = Math.round(reasoning.confidence * 100);
      const confidenceColor = confidencePercent >= 80 ? 'green' : confidencePercent >= 50 ? 'yellow' : 'red';
      console.log(this.colorize(`置信度: ${confidencePercent}%`, confidenceColor));
    }

    if (reasoning.alternatives && reasoning.alternatives.length > 0 && this.config.verbosity === 'detailed') {
      console.log(this.colorize('\n备选方案:', 'gray'));
      reasoning.alternatives.forEach((alt, idx) => {
        console.log(this.colorize(`  ${idx + 1}. ${alt}`, 'gray'));
      });
    }

    console.log('');
  }

  /**
   * 显示步骤说明
   */
  showStepDescription(stepId: string, description: string): void {
    if (!this.config.showSteps || this.config.verbosity === 'minimal') {
      return;
    }

    const step = this.steps.get(stepId);
    if (step) {
      step.description = description;
    }

    console.log(this.colorize(`\n→ ${description}`, 'cyan'));
  }

  /**
   * 完成进度跟踪
   */
  complete(success: boolean, message?: string): void {
    this.overallProgress = 1;

    if (this.config.showBar) {
      this.renderProgressBar();
      console.log(''); // 换行
    }

    if (this.config.verbosity !== 'minimal') {
      this.printSummary(success, message);
    }
  }

  /**
   * 获取执行统计
   */
  getStats(): {
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    skippedSteps: number;
    totalDuration: number;
    averageStepDuration: number;
  } {
    const steps = Array.from(this.steps.values());
    const completed = steps.filter((s) => s.status === 'completed');
    const failed = steps.filter((s) => s.status === 'failed');
    const skipped = steps.filter((s) => s.status === 'skipped');

    const totalDuration = this.startTime ? Date.now() - this.startTime.getTime() : 0;

    const stepsWithDuration = steps.filter((s) => s.startTime && s.endTime);
    const totalStepDuration = stepsWithDuration.reduce((sum, s) => {
      return sum + (s.endTime!.getTime() - s.startTime!.getTime());
    }, 0);
    const averageStepDuration = stepsWithDuration.length > 0 ? totalStepDuration / stepsWithDuration.length : 0;

    return {
      totalSteps: steps.length,
      completedSteps: completed.length,
      failedSteps: failed.length,
      skippedSteps: skipped.length,
      totalDuration,
      averageStepDuration,
    };
  }

  /**
   * 计算总体进度
   */
  private calculateOverallProgress(): void {
    const steps = Array.from(this.steps.values());
    if (steps.length === 0) {
      this.overallProgress = 0;
      return;
    }

    const totalProgress = steps.reduce((sum, step) => {
      if (step.status === 'completed') return sum + 1;
      if (step.status === 'running') return sum + step.progress;
      if (step.status === 'skipped') return sum + 1;
      return sum;
    }, 0);

    this.overallProgress = totalProgress / steps.length;
  }

  /**
   * 渲染进度条
   */
  private renderProgressBar(): void {
    const barLength = 40;
    const filled = Math.round(barLength * this.overallProgress);
    const empty = barLength - filled;

    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const percentage = Math.round(this.overallProgress * 100);

    // 计算预计剩余时间
    let eta = '';
    if (this.startTime && this.overallProgress > 0 && this.overallProgress < 1) {
      const elapsed = Date.now() - this.startTime.getTime();
      const estimated = elapsed / this.overallProgress;
      const remaining = estimated - elapsed;
      eta = ` ETA: ${this.formatDuration(remaining)}`;
    }

    const progressLine = `[${bar}] ${percentage}%${eta}`;

    // 清除当前行并输出
    process.stdout.write('\r' + ' '.repeat(100) + '\r');
    process.stdout.write(this.colorize(progressLine, 'cyan'));
  }

  /**
   * 渲染当前步骤
   */
  private renderCurrentStep(step: ProgressStep): void {
    const statusIcon = this.getStatusIcon(step.status);
    const statusColor = this.getStatusColor(step.status);

    let line = `${statusIcon} ${step.name}`;

    if (step.status === 'running' && step.progress > 0 && step.progress < 1) {
      line += ` (${Math.round(step.progress * 100)}%)`;
    }

    if (this.config.showTimings && step.startTime) {
      if (step.endTime) {
        const duration = step.endTime.getTime() - step.startTime.getTime();
        line += ` - ${this.formatDuration(duration)}`;
      } else if (step.status === 'running') {
        const elapsed = Date.now() - step.startTime.getTime();
        line += ` - ${this.formatDuration(elapsed)}`;
      }
    }

    if (step.error) {
      line += `\n  ${this.colorize('错误: ' + step.error, 'red')}`;
    }

    console.log(this.colorize(line, statusColor));
  }

  /**
   * 打印标题
   */
  private printHeader(): void {
    console.log('\n' + this.formatBox('执行进度'));
  }

  /**
   * 打印步骤列表
   */
  private printSteps(): void {
    console.log(this.colorize('\n执行计划:', 'white'));
    let stepNum = 1;
    for (const step of this.steps.values()) {
      console.log(this.colorize(`  ${stepNum}. ${step.name}`, 'gray'));
      if (this.config.verbosity === 'detailed' && step.description) {
        console.log(this.colorize(`     ${step.description}`, 'gray'));
      }
      stepNum++;
    }
    console.log('');
  }

  /**
   * 打印摘要
   */
  private printSummary(success: boolean, message?: string): void {
    const stats = this.getStats();

    console.log('\n' + this.formatBox('执行摘要'));

    if (message) {
      const color = success ? 'green' : 'red';
      console.log(this.colorize(message, color));
    }

    console.log(this.colorize(`\n总步骤: ${stats.totalSteps}`, 'white'));
    console.log(this.colorize(`完成: ${stats.completedSteps}`, 'green'));

    if (stats.failedSteps > 0) {
      console.log(this.colorize(`失败: ${stats.failedSteps}`, 'red'));
    }

    if (stats.skippedSteps > 0) {
      console.log(this.colorize(`跳过: ${stats.skippedSteps}`, 'yellow'));
    }

    if (this.config.showTimings) {
      console.log(this.colorize(`\n总耗时: ${this.formatDuration(stats.totalDuration)}`, 'white'));
      if (stats.averageStepDuration > 0) {
        console.log(this.colorize(`平均步骤耗时: ${this.formatDuration(stats.averageStepDuration)}`, 'white'));
      }
    }

    // 显示失败的步骤详情
    if (stats.failedSteps > 0 && this.config.verbosity !== 'minimal') {
      console.log(this.colorize('\n失败的步骤:', 'red'));
      for (const step of this.steps.values()) {
        if (step.status === 'failed') {
          console.log(this.colorize(`  • ${step.name}`, 'red'));
          if (step.error) {
            console.log(this.colorize(`    ${step.error}`, 'red'));
          }
        }
      }
    }

    console.log('');
  }

  /**
   * 获取状态图标
   */
  private getStatusIcon(status: ProgressStep['status']): string {
    switch (status) {
      case 'pending':
        return '○';
      case 'running':
        return '◐';
      case 'completed':
        return '✓';
      case 'failed':
        return '✗';
      case 'skipped':
        return '⊘';
      default:
        return '?';
    }
  }

  /**
   * 获取状态颜色
   */
  private getStatusColor(status: ProgressStep['status']): string {
    switch (status) {
      case 'pending':
        return 'gray';
      case 'running':
        return 'cyan';
      case 'completed':
        return 'green';
      case 'failed':
        return 'red';
      case 'skipped':
        return 'yellow';
      default:
        return 'white';
    }
  }

  /**
   * 格式化持续时间
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${Math.round(ms)}ms`;
    }

    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  /**
   * 格式化边框
   */
  private formatBox(title: string): string {
    const width = 60;
    const padding = Math.floor((width - title.length - 2) / 2);
    const line = '═'.repeat(width);
    const titleLine = '║' + ' '.repeat(padding) + title + ' '.repeat(width - padding - title.length - 2) + '║';

    return this.colorize(`╔${line}╗\n${titleLine}\n╚${line}╝`, 'cyan');
  }

  /**
   * 着色文本
   */
  private colorize(text: string, color: string): string {
    if (!this.config.colorOutput) {
      return text;
    }

    const colors: Record<string, string> = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      gray: '\x1b[90m',
      reset: '\x1b[0m',
    };

    return `${colors[color] || ''}${text}${colors.reset}`;
  }
}
