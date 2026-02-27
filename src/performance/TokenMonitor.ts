/**
 * Token 使用量监控系统
 * 监控和管理 LLM Token 使用，控制成本
 */

export interface TokenUsage {
  id: string;
  timestamp: Date;
  model: string;
  operation: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  metadata?: {
    userId?: string;
    sessionId?: string;
    requestId?: string;
    [key: string]: any;
  };
}

export interface TokenBudget {
  daily?: number;
  weekly?: number;
  monthly?: number;
  perRequest?: number;
}

export interface TokenStats {
  totalTokens: number;
  totalCost: number;
  totalRequests: number;
  averageTokensPerRequest: number;
  averageCostPerRequest: number;
  byModel: Map<string, ModelStats>;
  byOperation: Map<string, OperationStats>;
  byPeriod: {
    today: PeriodStats;
    thisWeek: PeriodStats;
    thisMonth: PeriodStats;
  };
}

export interface ModelStats {
  model: string;
  requests: number;
  totalTokens: number;
  totalCost: number;
  averageTokens: number;
}

export interface OperationStats {
  operation: string;
  requests: number;
  totalTokens: number;
  totalCost: number;
  averageTokens: number;
}

export interface PeriodStats {
  tokens: number;
  cost: number;
  requests: number;
}

export interface CostConfig {
  [model: string]: {
    promptCost: number; // 每 1K tokens 的成本
    completionCost: number; // 每 1K tokens 的成本
  };
}

/**
 * Token 监控器
 */
export class TokenMonitor {
  private usages: TokenUsage[] = [];
  private budget: TokenBudget;
  private costConfig: CostConfig;
  private warningThreshold: number = 0.8; // 80% 预算时警告
  private onBudgetWarning?: (usage: number, budget: number) => void;
  private onBudgetExceeded?: (usage: number, budget: number) => void;

  constructor(budget: TokenBudget = {}, costConfig?: CostConfig) {
    this.budget = budget;
    this.costConfig = costConfig || this.getDefaultCostConfig();
  }

  /**
   * 记录 Token 使用
   */
  recordUsage(usage: Omit<TokenUsage, 'id' | 'timestamp' | 'estimatedCost'>): TokenUsage {
    const fullUsage: TokenUsage = {
      ...usage,
      id: this.generateId(),
      timestamp: new Date(),
      estimatedCost: this.calculateCost(usage.model, usage.promptTokens, usage.completionTokens),
    };

    this.usages.push(fullUsage);

    // 检查预算
    this.checkBudget();

    return fullUsage;
  }

  /**
   * 获取统计信息
   */
  getStats(): TokenStats {
    const totalTokens = this.usages.reduce((sum, u) => sum + u.totalTokens, 0);
    const totalCost = this.usages.reduce((sum, u) => sum + u.estimatedCost, 0);
    const totalRequests = this.usages.length;

    return {
      totalTokens,
      totalCost,
      totalRequests,
      averageTokensPerRequest: totalRequests > 0 ? totalTokens / totalRequests : 0,
      averageCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
      byModel: this.getStatsByModel(),
      byOperation: this.getStatsByOperation(),
      byPeriod: {
        today: this.getStatsForPeriod('day'),
        thisWeek: this.getStatsForPeriod('week'),
        thisMonth: this.getStatsForPeriod('month'),
      },
    };
  }

  /**
   * 检查是否超出预算
   */
  checkBudget(): {
    daily: { exceeded: boolean; usage: number; budget: number };
    weekly: { exceeded: boolean; usage: number; budget: number };
    monthly: { exceeded: boolean; usage: number; budget: number };
  } {
    const result = {
      daily: { exceeded: false, usage: 0, budget: this.budget.daily || Infinity },
      weekly: { exceeded: false, usage: 0, budget: this.budget.weekly || Infinity },
      monthly: { exceeded: false, usage: 0, budget: this.budget.monthly || Infinity },
    };

    // 检查每日预算
    if (this.budget.daily) {
      const dailyUsage = this.getStatsForPeriod('day').tokens;
      result.daily.usage = dailyUsage;
      result.daily.exceeded = dailyUsage > this.budget.daily;

      if (result.daily.exceeded && this.onBudgetExceeded) {
        this.onBudgetExceeded(dailyUsage, this.budget.daily);
      } else if (dailyUsage > this.budget.daily * this.warningThreshold && this.onBudgetWarning) {
        this.onBudgetWarning(dailyUsage, this.budget.daily);
      }
    }

    // 检查每周预算
    if (this.budget.weekly) {
      const weeklyUsage = this.getStatsForPeriod('week').tokens;
      result.weekly.usage = weeklyUsage;
      result.weekly.exceeded = weeklyUsage > this.budget.weekly;

      if (result.weekly.exceeded && this.onBudgetExceeded) {
        this.onBudgetExceeded(weeklyUsage, this.budget.weekly);
      }
    }

    // 检查每月预算
    if (this.budget.monthly) {
      const monthlyUsage = this.getStatsForPeriod('month').tokens;
      result.monthly.usage = monthlyUsage;
      result.monthly.exceeded = monthlyUsage > this.budget.monthly;

      if (result.monthly.exceeded && this.onBudgetExceeded) {
        this.onBudgetExceeded(monthlyUsage, this.budget.monthly);
      }
    }

    return result;
  }

  /**
   * 预估请求成本
   */
  estimateCost(model: string, promptTokens: number, completionTokens: number): number {
    return this.calculateCost(model, promptTokens, completionTokens);
  }

  /**
   * 获取剩余预算
   */
  getRemainingBudget(): {
    daily: number;
    weekly: number;
    monthly: number;
  } {
    const stats = this.getStats();

    return {
      daily: this.budget.daily ? this.budget.daily - stats.byPeriod.today.tokens : Infinity,
      weekly: this.budget.weekly ? this.budget.weekly - stats.byPeriod.thisWeek.tokens : Infinity,
      monthly: this.budget.monthly
        ? this.budget.monthly - stats.byPeriod.thisMonth.tokens
        : Infinity,
    };
  }

  /**
   * 设置预算警告回调
   */
  onWarning(callback: (usage: number, budget: number) => void): void {
    this.onBudgetWarning = callback;
  }

  /**
   * 设置预算超出回调
   */
  onExceeded(callback: (usage: number, budget: number) => void): void {
    this.onBudgetExceeded = callback;
  }

  /**
   * 更新预算
   */
  updateBudget(budget: Partial<TokenBudget>): void {
    this.budget = { ...this.budget, ...budget };
  }

  /**
   * 清除历史记录
   */
  clearHistory(beforeDate?: Date): void {
    if (beforeDate) {
      this.usages = this.usages.filter((u) => u.timestamp >= beforeDate);
    } else {
      this.usages = [];
    }
  }

  /**
   * 导出使用记录
   */
  exportUsage(startDate?: Date, endDate?: Date): TokenUsage[] {
    let filtered = this.usages;

    if (startDate) {
      filtered = filtered.filter((u) => u.timestamp >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter((u) => u.timestamp <= endDate);
    }

    return filtered;
  }

  /**
   * 生成报告
   */
  generateReport(): string {
    const stats = this.getStats();
    const budget = this.checkBudget();

    const lines: string[] = [];

    lines.push('# Token Usage Report\n');
    lines.push(`Generated: ${new Date().toISOString()}\n`);

    // 总体统计
    lines.push('## Overall Statistics\n');
    lines.push(`Total Requests: ${stats.totalRequests}`);
    lines.push(`Total Tokens: ${stats.totalTokens.toLocaleString()}`);
    lines.push(`Total Cost: $${stats.totalCost.toFixed(4)}`);
    lines.push(`Average Tokens/Request: ${stats.averageTokensPerRequest.toFixed(0)}`);
    lines.push(`Average Cost/Request: $${stats.averageCostPerRequest.toFixed(4)}\n`);

    // 预算状态
    lines.push('## Budget Status\n');
    lines.push(
      `Daily: ${budget.daily.usage.toLocaleString()} / ${budget.daily.budget.toLocaleString()} tokens ${budget.daily.exceeded ? '⚠️ EXCEEDED' : '✓'}`
    );
    lines.push(
      `Weekly: ${budget.weekly.usage.toLocaleString()} / ${budget.weekly.budget.toLocaleString()} tokens ${budget.weekly.exceeded ? '⚠️ EXCEEDED' : '✓'}`
    );
    lines.push(
      `Monthly: ${budget.monthly.usage.toLocaleString()} / ${budget.monthly.budget.toLocaleString()} tokens ${budget.monthly.exceeded ? '⚠️ EXCEEDED' : '✓'}\n`
    );

    // 按模型统计
    lines.push('## Usage by Model\n');
    for (const [model, modelStats] of stats.byModel) {
      lines.push(`### ${model}`);
      lines.push(`  Requests: ${modelStats.requests}`);
      lines.push(`  Tokens: ${modelStats.totalTokens.toLocaleString()}`);
      lines.push(`  Cost: $${modelStats.totalCost.toFixed(4)}`);
      lines.push(`  Avg Tokens: ${modelStats.averageTokens.toFixed(0)}\n`);
    }

    // 按操作统计
    lines.push('## Usage by Operation\n');
    for (const [operation, opStats] of stats.byOperation) {
      lines.push(`### ${operation}`);
      lines.push(`  Requests: ${opStats.requests}`);
      lines.push(`  Tokens: ${opStats.totalTokens.toLocaleString()}`);
      lines.push(`  Cost: $${opStats.totalCost.toFixed(4)}\n`);
    }

    return lines.join('\n');
  }

  /**
   * 计算成本
   */
  private calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const config = this.costConfig[model] || this.costConfig['default'];

    if (!config) {
      return 0;
    }

    const promptCost = (promptTokens / 1000) * config.promptCost;
    const completionCost = (completionTokens / 1000) * config.completionCost;

    return promptCost + completionCost;
  }

  /**
   * 按模型统计
   */
  private getStatsByModel(): Map<string, ModelStats> {
    const stats = new Map<string, ModelStats>();

    for (const usage of this.usages) {
      if (!stats.has(usage.model)) {
        stats.set(usage.model, {
          model: usage.model,
          requests: 0,
          totalTokens: 0,
          totalCost: 0,
          averageTokens: 0,
        });
      }

      const modelStats = stats.get(usage.model)!;
      modelStats.requests++;
      modelStats.totalTokens += usage.totalTokens;
      modelStats.totalCost += usage.estimatedCost;
      modelStats.averageTokens = modelStats.totalTokens / modelStats.requests;
    }

    return stats;
  }

  /**
   * 按操作统计
   */
  private getStatsByOperation(): Map<string, OperationStats> {
    const stats = new Map<string, OperationStats>();

    for (const usage of this.usages) {
      if (!stats.has(usage.operation)) {
        stats.set(usage.operation, {
          operation: usage.operation,
          requests: 0,
          totalTokens: 0,
          totalCost: 0,
          averageTokens: 0,
        });
      }

      const opStats = stats.get(usage.operation)!;
      opStats.requests++;
      opStats.totalTokens += usage.totalTokens;
      opStats.totalCost += usage.estimatedCost;
      opStats.averageTokens = opStats.totalTokens / opStats.requests;
    }

    return stats;
  }

  /**
   * 获取时间段统计
   */
  private getStatsForPeriod(period: 'day' | 'week' | 'month'): PeriodStats {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day': {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      }
      case 'week': {
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        break;
      }
      case 'month': {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      }
    }

    const filtered = this.usages.filter((u) => u.timestamp >= startDate);

    return {
      tokens: filtered.reduce((sum, u) => sum + u.totalTokens, 0),
      cost: filtered.reduce((sum, u) => sum + u.estimatedCost, 0),
      requests: filtered.length,
    };
  }

  /**
   * 获取默认成本配置
   */
  private getDefaultCostConfig(): CostConfig {
    return {
      'gpt-4': {
        promptCost: 0.03,
        completionCost: 0.06,
      },
      'gpt-4-turbo': {
        promptCost: 0.01,
        completionCost: 0.03,
      },
      'gpt-3.5-turbo': {
        promptCost: 0.0015,
        completionCost: 0.002,
      },
      default: {
        promptCost: 0.01,
        completionCost: 0.03,
      },
    };
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
