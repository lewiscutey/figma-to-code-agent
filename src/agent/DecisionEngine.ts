import type { Intent, Strategy, StrategyScore, StrategyStep, ConversationContext } from './types';
import type { Tool } from '../tools/types';

/**
 * 决策引擎
 * 根据意图和可用工具生成、评估和选择执行策略
 */
export class DecisionEngine {
  /**
   * 生成可能的策略
   */
  generateStrategies(intent: Intent, availableTools: Tool[]): Strategy[] {
    const strategies: Strategy[] = [];

    // 根据意图类型生成不同的策略
    switch (intent.type) {
      case 'generate_new':
        strategies.push(...this.generateNewCodeStrategies(intent, availableTools));
        break;
      case 'update_existing':
        strategies.push(...this.generateUpdateStrategies(intent, availableTools));
        break;
      case 'optimize':
        strategies.push(...this.generateOptimizeStrategies(intent, availableTools));
        break;
      case 'analyze':
        strategies.push(...this.generateAnalyzeStrategies(intent, availableTools));
        break;
    }

    return strategies;
  }

  /**
   * 评估策略
   */
  evaluateStrategy(strategy: Strategy, context: ConversationContext): StrategyScore {
    // 评估可行性（基于工具可用性和步骤复杂度）
    const feasibility = this.calculateFeasibility(strategy);

    // 评估成本（基于预估的 token 使用和 API 调用）
    const cost = strategy.estimatedCost;

    // 评估质量（基于策略的预期质量和用户要求）
    const quality = this.calculateQuality(strategy, context);

    // 评估速度（基于预估时间和用户要求）
    const speed = this.calculateSpeed(strategy, context);

    // 计算加权总分
    const weights = this.getWeights(context);
    const total =
      feasibility * weights.feasibility +
      (1 - cost / 10000) * weights.cost + // 归一化成本
      quality * weights.quality +
      speed * weights.speed;

    return {
      feasibility,
      cost,
      quality,
      speed,
      total,
    };
  }

  /**
   * 选择最佳策略
   */
  selectBestStrategy(strategies: Strategy[], context: ConversationContext): Strategy {
    if (strategies.length === 0) {
      throw new Error('No strategies available');
    }

    // 评估所有策略
    const scoredStrategies = strategies.map((strategy) => ({
      strategy,
      score: this.evaluateStrategy(strategy, context),
    }));

    // 按总分排序
    scoredStrategies.sort((a, b) => b.score.total - a.score.total);

    return scoredStrategies[0].strategy;
  }

  /**
   * 分析设计复杂度
   */
  analyzeComplexity(figmaData: any): {
    nodeCount: number;
    depth: number;
    complexity: 'simple' | 'medium' | 'complex';
  } {
    const nodeCount = this.countNodes(figmaData);
    const depth = this.calculateDepth(figmaData);

    let complexity: 'simple' | 'medium' | 'complex';
    if (nodeCount < 20) {
      complexity = 'simple';
    } else if (nodeCount < 50) {
      complexity = 'medium';
    } else {
      complexity = 'complex';
    }

    return { nodeCount, depth, complexity };
  }

  // ========== 私有方法 ==========

  /**
   * 生成新代码的策略
   */
  private generateNewCodeStrategies(intent: Intent, _availableTools: Tool[]): Strategy[] {
    const strategies: Strategy[] = [];
    const qualityMode = intent.qualityMode || 'balanced';

    // 策略 1：快速规则策略（适合简单设计）
    if (qualityMode === 'fast' || qualityMode === 'balanced') {
      strategies.push({
        id: 'fast-rule-based',
        name: '快速规则策略',
        description: '使用规则引擎快速生成代码，适合简单设计',
        steps: this.buildFastRuleSteps(intent),
        estimatedTime: 30,
        estimatedCost: 1000,
        expectedQuality: qualityMode === 'fast' ? 'medium' : 'high',
      });
    }

    // 策略 2：AI 增强策略（适合复杂设计）
    if (qualityMode === 'balanced' || qualityMode === 'high') {
      strategies.push({
        id: 'ai-enhanced',
        name: 'AI 增强策略',
        description: '使用 AI 辅助生成高质量代码，适合复杂设计',
        steps: this.buildAIEnhancedSteps(intent),
        estimatedTime: 120,
        estimatedCost: 5000,
        expectedQuality: 'high',
      });
    }

    return strategies;
  }

  /**
   * 生成更新代码的策略
   */
  private generateUpdateStrategies(intent: Intent, _availableTools: Tool[]): Strategy[] {
    return [
      {
        id: 'incremental-update',
        name: '增量更新策略',
        description: '分析差异并选择性更新代码',
        steps: [
          {
            tool: 'project-analysis',
            action: 'analyze',
            inputs: { path: '.' },
          },
          {
            tool: 'figma-extraction',
            action: 'extract',
            inputs: { figmaInput: intent.figmaInput },
          },
          {
            tool: 'diff-analysis',
            action: 'compare',
            inputs: {},
          },
          {
            tool: 'code-generation',
            action: 'update',
            inputs: {
              framework: intent.targetFramework,
              styleMode: intent.styleMode,
              updateMode: 'selective',
            },
          },
        ],
        estimatedTime: 90,
        estimatedCost: 3000,
        expectedQuality: 'high',
      },
    ];
  }

  /**
   * 生成优化代码的策略
   */
  private generateOptimizeStrategies(_intent: Intent, _availableTools: Tool[]): Strategy[] {
    return [
      {
        id: 'optimization',
        name: '代码优化策略',
        description: '分析并优化现有代码',
        steps: [
          {
            tool: 'project-analysis',
            action: 'analyze',
            inputs: { path: '.' },
          },
          {
            tool: 'performance-optimizer',
            action: 'optimize',
            inputs: {},
          },
          {
            tool: 'accessibility-enhancer',
            action: 'enhance',
            inputs: {},
          },
        ],
        estimatedTime: 60,
        estimatedCost: 2000,
        expectedQuality: 'high',
      },
    ];
  }

  /**
   * 生成分析设计的策略
   */
  private generateAnalyzeStrategies(intent: Intent, _availableTools: Tool[]): Strategy[] {
    return [
      {
        id: 'design-analysis',
        name: '设计分析策略',
        description: '分析设计并提供建议',
        steps: [
          {
            tool: 'figma-extraction',
            action: 'extract',
            inputs: { figmaInput: intent.figmaInput },
          },
          {
            tool: 'design-analyzer',
            action: 'analyze',
            inputs: {},
          },
        ],
        estimatedTime: 30,
        estimatedCost: 1500,
        expectedQuality: 'high',
      },
    ];
  }

  /**
   * 构建快速规则策略的步骤
   */
  private buildFastRuleSteps(intent: Intent): StrategyStep[] {
    const steps: StrategyStep[] = [
      {
        tool: 'figma-extraction',
        action: 'extract',
        inputs: { figmaInput: intent.figmaInput },
        fallbackTool: 'figma-api',
      },
      {
        tool: 'transformation',
        action: 'transform',
        inputs: { mode: 'fast' },
      },
      {
        tool: 'code-generation',
        action: 'generate',
        inputs: {
          framework: intent.targetFramework,
          styleMode: intent.styleMode,
          typescript: intent.additionalRequirements.includes('typescript'),
        },
      },
    ];

    return steps;
  }

  /**
   * 构建 AI 增强策略的步骤
   */
  private buildAIEnhancedSteps(intent: Intent): StrategyStep[] {
    const steps: StrategyStep[] = [
      {
        tool: 'figma-extraction',
        action: 'extract',
        inputs: { figmaInput: intent.figmaInput },
        fallbackTool: 'figma-api',
      },
      {
        tool: 'transformation',
        action: 'transform',
        inputs: { mode: 'enhanced' },
      },
      {
        tool: 'semantic-namer',
        action: 'name',
        inputs: {},
      },
      {
        tool: 'component-extractor',
        action: 'extract',
        inputs: {},
      },
      {
        tool: 'code-generation',
        action: 'generate',
        inputs: {
          framework: intent.targetFramework,
          styleMode: intent.styleMode,
          typescript: intent.additionalRequirements.includes('typescript'),
        },
      },
    ];

    // 添加可选的优化步骤
    if (intent.qualityMode === 'high') {
      steps.push(
        {
          tool: 'accessibility-enhancer',
          action: 'enhance',
          inputs: {},
        },
        {
          tool: 'performance-optimizer',
          action: 'optimize',
          inputs: {},
        }
      );
    }

    // 添加响应式支持
    if (intent.additionalRequirements.includes('responsive')) {
      steps.push({
        tool: 'responsive-merger',
        action: 'merge',
        inputs: {},
      });
    }

    return steps;
  }

  /**
   * 计算可行性分数
   */
  private calculateFeasibility(strategy: Strategy): number {
    // 基于步骤数量和复杂度
    const stepCount = strategy.steps.length;
    const hasFallbacks = strategy.steps.some((s) => s.fallbackTool);

    let score = 1.0;

    // 步骤越多，可行性略微降低
    score -= stepCount * 0.02;

    // 有回退选项增加可行性
    if (hasFallbacks) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * 计算质量分数
   */
  private calculateQuality(strategy: Strategy, context: ConversationContext): number {
    const qualityMap = {
      low: 0.5,
      medium: 0.75,
      high: 1.0,
    };

    let score = qualityMap[strategy.expectedQuality];

    // 如果用户要求高质量，提升高质量策略的分数
    if (context.intent?.qualityMode === 'high' && strategy.expectedQuality === 'high') {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  /**
   * 计算速度分数
   */
  private calculateSpeed(strategy: Strategy, context: ConversationContext): number {
    // 时间越短，速度分数越高
    const maxTime = 180; // 3 分钟
    let score = 1 - strategy.estimatedTime / maxTime;

    // 如果用户要求快速，提升快速策略的分数
    if (context.intent?.qualityMode === 'fast' && strategy.estimatedTime < 60) {
      score += 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * 获取评分权重
   */
  private getWeights(context: ConversationContext): {
    feasibility: number;
    cost: number;
    quality: number;
    speed: number;
  } {
    const qualityMode = context.intent?.qualityMode || 'balanced';

    switch (qualityMode) {
      case 'fast':
        return {
          feasibility: 0.3,
          cost: 0.1,
          quality: 0.2,
          speed: 0.4,
        };
      case 'high':
        return {
          feasibility: 0.2,
          cost: 0.1,
          quality: 0.5,
          speed: 0.2,
        };
      case 'balanced':
      default:
        return {
          feasibility: 0.25,
          cost: 0.15,
          quality: 0.35,
          speed: 0.25,
        };
    }
  }

  /**
   * 计算节点数量
   */
  private countNodes(data: any): number {
    if (!data) return 0;

    let count = 1;
    if (data.children && Array.isArray(data.children)) {
      for (const child of data.children) {
        count += this.countNodes(child);
      }
    }

    return count;
  }

  /**
   * 计算树深度
   */
  private calculateDepth(data: any): number {
    if (!data) {
      return 0;
    }

    if (!data.children || data.children.length === 0) {
      return 1;
    }

    const childDepths = data.children.map((child: any) => this.calculateDepth(child));
    return 1 + Math.max(...childDepths);
  }
}
