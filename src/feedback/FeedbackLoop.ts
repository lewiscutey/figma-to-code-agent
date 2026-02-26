/**
 * 反馈循环系统
 * 根据用户反馈迭代优化生成的代码
 */

export interface Feedback {
  id: string;
  timestamp: Date;
  type: 'style' | 'structure' | 'functionality' | 'performance' | 'other';
  content: string;
  severity: 'low' | 'medium' | 'high';
  targetFiles?: string[];
  suggestions?: string[];
}

export interface ImprovementPlan {
  id: string;
  feedbackIds: string[];
  changes: PlannedChange[];
  estimatedEffort: 'low' | 'medium' | 'high';
  priority: number;
}

export interface PlannedChange {
  type: 'modify' | 'add' | 'remove' | 'refactor';
  target: string;
  description: string;
  reason: string;
  autoApplicable: boolean;
}

export interface IterationResult {
  iterationNumber: number;
  feedbackProcessed: Feedback[];
  changesApplied: PlannedChange[];
  success: boolean;
  errors: string[];
  userSatisfied: boolean;
}

export interface IterationHistory {
  iterations: IterationResult[];
  totalFeedbacks: number;
  totalChanges: number;
  satisfactionReached: boolean;
  maxIterationsReached: boolean;
}

/**
 * 反馈循环管理器
 */
export class FeedbackLoop {
  private feedbacks: Map<string, Feedback> = new Map();
  private iterations: IterationResult[] = [];
  private maxIterations: number;
  private currentIteration: number = 0;

  constructor(maxIterations: number = 5) {
    this.maxIterations = maxIterations;
  }

  /**
   * 添加用户反馈
   */
  addFeedback(feedback: Omit<Feedback, 'id' | 'timestamp'>): Feedback {
    const fullFeedback: Feedback = {
      ...feedback,
      id: this.generateId(),
      timestamp: new Date(),
    };

    this.feedbacks.set(fullFeedback.id, fullFeedback);
    return fullFeedback;
  }

  /**
   * 分析反馈并生成改进计划
   */
  async analyzeFeedback(feedbacks: Feedback[]): Promise<ImprovementPlan> {
    const changes: PlannedChange[] = [];

    // 按类型分组反馈
    const feedbackByType = this.groupFeedbackByType(feedbacks);

    // 分析样式反馈
    if (feedbackByType.style.length > 0) {
      changes.push(...this.analyzeStyleFeedback(feedbackByType.style));
    }

    // 分析结构反馈
    if (feedbackByType.structure.length > 0) {
      changes.push(...this.analyzeStructureFeedback(feedbackByType.structure));
    }

    // 分析功能反馈
    if (feedbackByType.functionality.length > 0) {
      changes.push(...this.analyzeFunctionalityFeedback(feedbackByType.functionality));
    }

    // 分析性能反馈
    if (feedbackByType.performance.length > 0) {
      changes.push(...this.analyzePerformanceFeedback(feedbackByType.performance));
    }

    // 计算优先级
    const priority = this.calculatePriority(feedbacks);

    // 估算工作量
    const estimatedEffort = this.estimateEffort(changes);

    return {
      id: this.generateId(),
      feedbackIds: feedbacks.map((f) => f.id),
      changes,
      estimatedEffort,
      priority,
    };
  }

  /**
   * 执行迭代
   */
  async executeIteration(
    plan: ImprovementPlan,
    applyChanges: (changes: PlannedChange[]) => Promise<boolean>
  ): Promise<IterationResult> {
    this.currentIteration++;

    if (this.currentIteration > this.maxIterations) {
      throw new Error(`Maximum iterations (${this.maxIterations}) reached`);
    }

    const result: IterationResult = {
      iterationNumber: this.currentIteration,
      feedbackProcessed: plan.feedbackIds.map((id) => this.feedbacks.get(id)!).filter(Boolean),
      changesApplied: [],
      success: false,
      errors: [],
      userSatisfied: false,
    };

    try {
      // 应用变更
      const success = await applyChanges(plan.changes);

      if (success) {
        result.changesApplied = plan.changes;
        result.success = true;
      } else {
        result.errors.push('Failed to apply changes');
      }
    } catch (error) {
      result.errors.push((error as Error).message);
    }

    this.iterations.push(result);
    return result;
  }

  /**
   * 确认用户满意度
   */
  confirmSatisfaction(satisfied: boolean): void {
    if (this.iterations.length > 0) {
      this.iterations[this.iterations.length - 1].userSatisfied = satisfied;
    }
  }

  /**
   * 获取迭代历史
   */
  getHistory(): IterationHistory {
    const satisfactionReached = this.iterations.some((i) => i.userSatisfied);
    const maxIterationsReached = this.currentIteration >= this.maxIterations;

    return {
      iterations: this.iterations,
      totalFeedbacks: this.feedbacks.size,
      totalChanges: this.iterations.reduce((sum, i) => sum + i.changesApplied.length, 0),
      satisfactionReached,
      maxIterationsReached,
    };
  }

  /**
   * 重置反馈循环
   */
  reset(): void {
    this.feedbacks.clear();
    this.iterations = [];
    this.currentIteration = 0;
  }

  /**
   * 获取所有反馈
   */
  getAllFeedbacks(): Feedback[] {
    return Array.from(this.feedbacks.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * 获取未处理的反馈
   */
  getUnprocessedFeedbacks(): Feedback[] {
    const processedIds = new Set(
      this.iterations.flatMap((i) => i.feedbackProcessed.map((f) => f.id))
    );

    return Array.from(this.feedbacks.values()).filter((f) => !processedIds.has(f.id));
  }

  /**
   * 是否可以继续迭代
   */
  canContinue(): boolean {
    return this.currentIteration < this.maxIterations && !this.isSatisfied();
  }

  /**
   * 是否已满意
   */
  isSatisfied(): boolean {
    return this.iterations.some((i) => i.userSatisfied);
  }

  /**
   * 按类型分组反馈
   */
  private groupFeedbackByType(feedbacks: Feedback[]): Record<string, Feedback[]> {
    const groups: Record<string, Feedback[]> = {
      style: [],
      structure: [],
      functionality: [],
      performance: [],
      other: [],
    };

    for (const feedback of feedbacks) {
      groups[feedback.type].push(feedback);
    }

    return groups;
  }

  /**
   * 分析样式反馈
   */
  private analyzeStyleFeedback(feedbacks: Feedback[]): PlannedChange[] {
    const changes: PlannedChange[] = [];

    for (const feedback of feedbacks) {
      // 检测常见的样式问题
      const content = feedback.content.toLowerCase();

      if (content.includes('color') || content.includes('颜色')) {
        changes.push({
          type: 'modify',
          target: feedback.targetFiles?.[0] || 'styles',
          description: 'Update color scheme',
          reason: feedback.content,
          autoApplicable: true,
        });
      }

      if (content.includes('spacing') || content.includes('间距') || content.includes('padding')) {
        changes.push({
          type: 'modify',
          target: feedback.targetFiles?.[0] || 'styles',
          description: 'Adjust spacing and padding',
          reason: feedback.content,
          autoApplicable: true,
        });
      }

      if (content.includes('font') || content.includes('字体') || content.includes('text')) {
        changes.push({
          type: 'modify',
          target: feedback.targetFiles?.[0] || 'styles',
          description: 'Update typography',
          reason: feedback.content,
          autoApplicable: true,
        });
      }
    }

    return changes;
  }

  /**
   * 分析结构反馈
   */
  private analyzeStructureFeedback(feedbacks: Feedback[]): PlannedChange[] {
    const changes: PlannedChange[] = [];

    for (const feedback of feedbacks) {
      const content = feedback.content.toLowerCase();

      if (content.includes('component') || content.includes('组件')) {
        changes.push({
          type: 'refactor',
          target: feedback.targetFiles?.[0] || 'components',
          description: 'Refactor component structure',
          reason: feedback.content,
          autoApplicable: false,
        });
      }

      if (content.includes('split') || content.includes('拆分')) {
        changes.push({
          type: 'refactor',
          target: feedback.targetFiles?.[0] || 'components',
          description: 'Split into smaller components',
          reason: feedback.content,
          autoApplicable: false,
        });
      }

      if (content.includes('merge') || content.includes('合并')) {
        changes.push({
          type: 'refactor',
          target: feedback.targetFiles?.[0] || 'components',
          description: 'Merge related components',
          reason: feedback.content,
          autoApplicable: false,
        });
      }
    }

    return changes;
  }

  /**
   * 分析功能反馈
   */
  private analyzeFunctionalityFeedback(feedbacks: Feedback[]): PlannedChange[] {
    const changes: PlannedChange[] = [];

    for (const feedback of feedbacks) {
      const content = feedback.content.toLowerCase();

      if (content.includes('add') || content.includes('添加') || content.includes('新增')) {
        changes.push({
          type: 'add',
          target: feedback.targetFiles?.[0] || 'features',
          description: 'Add new functionality',
          reason: feedback.content,
          autoApplicable: false,
        });
      }

      if (content.includes('remove') || content.includes('删除') || content.includes('移除')) {
        changes.push({
          type: 'remove',
          target: feedback.targetFiles?.[0] || 'features',
          description: 'Remove functionality',
          reason: feedback.content,
          autoApplicable: false,
        });
      }

      if (content.includes('fix') || content.includes('修复') || content.includes('bug')) {
        changes.push({
          type: 'modify',
          target: feedback.targetFiles?.[0] || 'code',
          description: 'Fix functionality issue',
          reason: feedback.content,
          autoApplicable: false,
        });
      }
    }

    return changes;
  }

  /**
   * 分析性能反馈
   */
  private analyzePerformanceFeedback(feedbacks: Feedback[]): PlannedChange[] {
    const changes: PlannedChange[] = [];

    for (const feedback of feedbacks) {
      const content = feedback.content.toLowerCase();

      if (content.includes('slow') || content.includes('慢') || content.includes('performance')) {
        changes.push({
          type: 'modify',
          target: feedback.targetFiles?.[0] || 'performance',
          description: 'Optimize performance',
          reason: feedback.content,
          autoApplicable: false,
        });
      }

      if (content.includes('memory') || content.includes('内存')) {
        changes.push({
          type: 'modify',
          target: feedback.targetFiles?.[0] || 'performance',
          description: 'Optimize memory usage',
          reason: feedback.content,
          autoApplicable: false,
        });
      }
    }

    return changes;
  }

  /**
   * 计算优先级
   */
  private calculatePriority(feedbacks: Feedback[]): number {
    let priority = 0;

    for (const feedback of feedbacks) {
      switch (feedback.severity) {
        case 'high':
          priority += 3;
          break;
        case 'medium':
          priority += 2;
          break;
        case 'low':
          priority += 1;
          break;
      }
    }

    return priority;
  }

  /**
   * 估算工作量
   */
  private estimateEffort(changes: PlannedChange[]): 'low' | 'medium' | 'high' {
    const autoApplicableCount = changes.filter((c) => c.autoApplicable).length;
    const manualCount = changes.length - autoApplicableCount;

    if (manualCount > 5 || changes.length > 10) {
      return 'high';
    } else if (manualCount > 2 || changes.length > 5) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
