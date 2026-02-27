/**
 * 并行处理系统
 * 分析组件独立性并并行执行以提高性能
 */

import type { ASTNode } from '../transformation/types';

export interface ProcessingTask<T = any> {
  id: string;
  type: string;
  data: T;
  dependencies?: string[]; // 依赖的其他任务 ID
  priority?: number; // 优先级（数字越大优先级越高）
}

export interface ProcessingResult<T = any> {
  taskId: string;
  success: boolean;
  data?: T;
  error?: Error;
  duration: number;
}

export interface ParallelConfig {
  maxConcurrency?: number; // 最大并发数
  timeout?: number; // 单个任务超时时间（毫秒）
  retryOnFailure?: boolean; // 失败时是否重试
  maxRetries?: number; // 最大重试次数
}

/**
 * 并行处理器
 */
export class ParallelProcessor {
  private config: Required<ParallelConfig>;
  private activeTasks: Set<string> = new Set();
  private completedTasks: Map<string, ProcessingResult> = new Map();

  constructor(config: ParallelConfig = {}) {
    this.config = {
      maxConcurrency: config.maxConcurrency || 4,
      timeout: config.timeout || 30000,
      retryOnFailure: config.retryOnFailure ?? true,
      maxRetries: config.maxRetries || 2,
    };
  }

  /**
   * 分析组件独立性
   * 检查组件之间是否有依赖关系
   */
  analyzeComponentIndependence(nodes: ASTNode[]): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();

    for (const node of nodes) {
      const deps: string[] = [];

      // 检查是否引用了其他组件
      if (node.metadata.componentName) {
        for (const otherNode of nodes) {
          if (otherNode.id !== node.id && this.hasReference(node, otherNode)) {
            deps.push(otherNode.id);
          }
        }
      }

      dependencies.set(node.id, deps);
    }

    return dependencies;
  }

  /**
   * 并行执行任务
   */
  async executeParallel<T, R>(
    tasks: ProcessingTask<T>[],
    processor: (task: ProcessingTask<T>) => Promise<R>
  ): Promise<ProcessingResult<R>[]> {
    // 重置状态
    this.activeTasks.clear();
    this.completedTasks.clear();

    // 按优先级排序
    const sortedTasks = [...tasks].sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // 构建依赖图
    const dependencyGraph = this.buildDependencyGraph(sortedTasks);

    // 执行任务
    const results: ProcessingResult<R>[] = [];
    const pending = new Set(sortedTasks.map((t) => t.id));

    while (pending.size > 0 || this.activeTasks.size > 0) {
      // 找到可以执行的任务（没有未完成的依赖）
      const readyTasks = sortedTasks.filter(
        (task) =>
          pending.has(task.id) &&
          !this.activeTasks.has(task.id) &&
          this.areDependenciesMet(task, dependencyGraph)
      );

      // 启动新任务（不超过并发限制）
      const availableSlots = this.config.maxConcurrency - this.activeTasks.size;
      const tasksToStart = readyTasks.slice(0, availableSlots);

      const promises = tasksToStart.map((task) => this.executeTask(task, processor));

      if (promises.length > 0) {
        // 等待至少一个任务完成
        const result = await Promise.race(promises);
        results.push(result);
        pending.delete(result.taskId);
      } else if (this.activeTasks.size > 0) {
        // 等待任何活动任务完成
        await new Promise((resolve) => setTimeout(resolve, 100));
      } else {
        // 没有可执行的任务且没有活动任务，可能存在循环依赖
        break;
      }
    }

    // 检查是否有未完成的任务
    if (pending.size > 0) {
      throw new Error(
        `Failed to complete all tasks. Remaining: ${Array.from(pending).join(', ')}`
      );
    }

    return results;
  }

  /**
   * 并行处理组件
   * 自动分析独立性并并行执行
   */
  async processComponents<R>(
    components: ASTNode[],
    processor: (component: ASTNode) => Promise<R>
  ): Promise<Map<string, ProcessingResult<R>>> {
    // 分析依赖关系
    const dependencies = this.analyzeComponentIndependence(components);

    // 创建任务
    const tasks: ProcessingTask<ASTNode>[] = components.map((component) => ({
      id: component.id,
      type: 'component',
      data: component,
      dependencies: dependencies.get(component.id) || [],
      priority: this.calculatePriority(component),
    }));

    // 执行任务
    const results = await this.executeParallel(tasks, async (task) => {
      return processor(task.data);
    });

    // 转换为 Map
    const resultMap = new Map<string, ProcessingResult<R>>();
    for (const result of results) {
      resultMap.set(result.taskId, result);
    }

    return resultMap;
  }

  /**
   * 合并结果
   * 将并行处理的结果合并为单一结果
   */
  mergeResults<T>(results: ProcessingResult<T>[], merger: (data: T[]) => T): T {
    const successfulResults = results.filter((r) => r.success && r.data !== undefined);

    if (successfulResults.length === 0) {
      throw new Error('No successful results to merge');
    }

    const data = successfulResults.map((r) => r.data!);
    return merger(data);
  }

  /**
   * 获取执行统计
   */
  getStats(): {
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    averageDuration: number;
    totalDuration: number;
  } {
    const results = Array.from(this.completedTasks.values());
    const successful = results.filter((r) => r.success);
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    return {
      totalTasks: results.length,
      successfulTasks: successful.length,
      failedTasks: results.length - successful.length,
      averageDuration: results.length > 0 ? totalDuration / results.length : 0,
      totalDuration,
    };
  }

  /**
   * 执行单个任务
   */
  private async executeTask<T, R>(
    task: ProcessingTask<T>,
    processor: (task: ProcessingTask<T>) => Promise<R>
  ): Promise<ProcessingResult<R>> {
    this.activeTasks.add(task.id);
    const startTime = Date.now();

    let attempts = 0;
    let lastError: Error | undefined;

    while (attempts <= this.config.maxRetries) {
      try {
        // 设置超时
        const result = await Promise.race([
          processor(task),
          this.createTimeout(this.config.timeout),
        ]);

        const duration = Date.now() - startTime;
        const processingResult: ProcessingResult<R> = {
          taskId: task.id,
          success: true,
          data: result,
          duration,
        };

        this.completedTasks.set(task.id, processingResult);
        this.activeTasks.delete(task.id);

        return processingResult;
      } catch (error) {
        lastError = error as Error;
        attempts++;

        if (!this.config.retryOnFailure || attempts > this.config.maxRetries) {
          break;
        }

        // 等待一段时间后重试
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
      }
    }

    // 任务失败
    const duration = Date.now() - startTime;
    const processingResult: ProcessingResult<R> = {
      taskId: task.id,
      success: false,
      error: lastError,
      duration,
    };

    this.completedTasks.set(task.id, processingResult);
    this.activeTasks.delete(task.id);

    return processingResult;
  }

  /**
   * 创建超时 Promise
   */
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Task timeout after ${ms}ms`)), ms);
    });
  }

  /**
   * 构建依赖图
   */
  private buildDependencyGraph<T>(tasks: ProcessingTask<T>[]): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();

    for (const task of tasks) {
      graph.set(task.id, new Set(task.dependencies || []));
    }

    return graph;
  }

  /**
   * 检查任务的依赖是否都已完成
   */
  private areDependenciesMet<T>(
    task: ProcessingTask<T>,
    dependencyGraph: Map<string, Set<string>>
  ): boolean {
    const dependencies = dependencyGraph.get(task.id);

    if (!dependencies || dependencies.size === 0) {
      return true;
    }

    for (const depId of dependencies) {
      const result = this.completedTasks.get(depId);
      if (!result || !result.success) {
        return false;
      }
    }

    return true;
  }

  /**
   * 检查一个节点是否引用了另一个节点
   */
  private hasReference(node: ASTNode, otherNode: ASTNode): boolean {
    // 检查名称引用
    if (node.metadata.componentName === otherNode.metadata.componentName) {
      return true;
    }

    // 检查子节点
    for (const child of node.children) {
      if (this.hasReference(child, otherNode)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 计算组件优先级
   * 优先处理简单的、独立的组件
   */
  private calculatePriority(component: ASTNode): number {
    let priority = 0;

    // 子节点越少，优先级越高
    priority += Math.max(0, 100 - component.children.length);

    // 独立组件优先级更高
    if (component.metadata.isComponent) {
      priority += 50;
    }

    return priority;
  }
}
