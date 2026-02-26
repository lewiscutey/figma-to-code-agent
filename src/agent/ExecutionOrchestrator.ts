import type {
  Strategy,
  StrategyStep,
  ExecutionResult,
  ExecutionError,
  ExecutionMetrics,
  ToolResult,
  ConversationContext,
  Artifact,
  Checkpoint,
} from './types';
import type { Tool } from './DecisionEngine';

/**
 * 执行编排器
 * 协调工具调用和处理结果
 */
export class ExecutionOrchestrator {
  private executionStartTime: number = 0;
  private totalTokensUsed: number = 0;
  private totalApiCalls: number = 0;
  private toolsInvoked: string[] = [];

  constructor(private tools: Map<string, Tool>) {}

  /**
   * 执行策略
   */
  async executeStrategy(
    strategy: Strategy,
    context: ConversationContext
  ): Promise<ExecutionResult> {
    this.executionStartTime = Date.now();
    this.totalTokensUsed = 0;
    this.totalApiCalls = 0;
    this.toolsInvoked = [];

    const artifacts: Artifact[] = [];
    const errors: ExecutionError[] = [];

    try {
      // 保存初始检查点
      this.saveCheckpoint(context, 'strategy_start', {
        strategyId: strategy.id,
        step: 0,
      });

      // 更新任务状态
      context.taskState.phase = 'executing';
      context.taskState.currentStep = strategy.name;
      context.taskState.progress = 0;

      // 执行每个步骤
      for (let i = 0; i < strategy.steps.length; i++) {
        const step = strategy.steps[i];
        
        // 更新进度
        context.taskState.progress = Math.floor(((i + 1) / strategy.steps.length) * 100);
        context.taskState.currentStep = `执行步骤 ${i + 1}/${strategy.steps.length}: ${step.action}`;

        try {
          // 调用工具
          const result = await this.invokeToolWithRetry(step, context);

          // 处理结果
          if (result.success) {
            // 如果结果包含生成的文件，添加到 artifacts
            if (result.data?.files) {
              for (const file of result.data.files) {
                artifacts.push({
                  id: `${Date.now()}-${file.path}`,
                  type: 'code',
                  path: file.path,
                  content: file.content,
                  version: 1,
                  timestamp: Date.now(),
                });
              }
            }

            // 累计指标
            this.totalApiCalls++;
            if (result.metadata.tokensUsed) {
              this.totalTokensUsed += result.metadata.tokensUsed;
            }
            this.toolsInvoked.push(result.metadata.toolName);

            // 保存检查点
            this.saveCheckpoint(context, `step_${i}_complete`, {
              step: i,
              result: result.data,
            });
          } else {
            // 工具执行失败
            errors.push({
              type: 'tool_execution_failed',
              message: `工具 ${step.tool} 执行失败: ${result.error?.message}`,
              context: { step: i, tool: step.tool },
              recoverable: !!step.fallbackTool,
            });

            // 如果错误不可恢复，停止执行
            if (!step.fallbackTool) {
              break;
            }
          }
        } catch (error) {
          // 捕获未预期的错误
          errors.push({
            type: 'unexpected_error',
            message: error instanceof Error ? error.message : String(error),
            context: { step: i, tool: step.tool },
            recoverable: false,
          });
          break;
        }
      }

      // 更新最终状态
      context.taskState.progress = 100;
      context.taskState.phase = errors.length > 0 ? 'reviewing' : 'completed';

      // 分析执行结果并决定下一步
      const nextAction = this.analyzeResults(artifacts, errors, context);

      return {
        success: errors.length === 0,
        artifacts,
        errors,
        metrics: this.getMetrics(),
        nextAction,
      };
    } catch (error) {
      // 顶层错误处理
      errors.push({
        type: 'orchestrator_error',
        message: error instanceof Error ? error.message : String(error),
        context: { strategy: strategy.id },
        recoverable: false,
      });

      return {
        success: false,
        artifacts,
        errors,
        metrics: this.getMetrics(),
        nextAction: 'ask_user',
      };
    }
  }

  /**
   * 调用工具（带重试和回退）
   */
  private async invokeToolWithRetry(
    step: StrategyStep,
    context: ConversationContext
  ): Promise<ToolResult> {
    const tool = this.tools.get(step.tool);

    if (!tool) {
      // 工具不存在，尝试回退
      if (step.fallbackTool) {
        return this.invokeFallbackTool(step, context);
      }

      return {
        success: false,
        data: null,
        error: new Error(`工具 ${step.tool} 不存在`),
        metadata: {
          duration: 0,
          toolName: step.tool,
        },
      };
    }

    try {
      // 检查工具是否可用
      const isAvailable = await tool.isAvailable();
      if (!isAvailable) {
        // 工具不可用，尝试回退
        if (step.fallbackTool) {
          return this.invokeFallbackTool(step, context);
        }

        return {
          success: false,
          data: null,
          error: new Error(`工具 ${step.tool} 不可用`),
          metadata: {
            duration: 0,
            toolName: step.tool,
          },
        };
      }

      // 执行工具
      return await this.invokeTool(tool, step.inputs);
    } catch (error) {
      // 工具执行失败，尝试回退
      if (step.fallbackTool) {
        return this.invokeFallbackTool(step, context);
      }

      return {
        success: false,
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          duration: 0,
          toolName: step.tool,
        },
      };
    }
  }

  /**
   * 调用回退工具
   */
  private async invokeFallbackTool(
    step: StrategyStep,
    _context: ConversationContext
  ): Promise<ToolResult> {
    if (!step.fallbackTool) {
      return {
        success: false,
        data: null,
        error: new Error('没有可用的回退工具'),
        metadata: {
          duration: 0,
          toolName: step.tool,
        },
      };
    }

    const fallbackTool = this.tools.get(step.fallbackTool);
    if (!fallbackTool) {
      return {
        success: false,
        data: null,
        error: new Error(`回退工具 ${step.fallbackTool} 不存在`),
        metadata: {
          duration: 0,
          toolName: step.fallbackTool,
        },
      };
    }

    try {
      return await this.invokeTool(fallbackTool, step.inputs);
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          duration: 0,
          toolName: step.fallbackTool,
        },
      };
    }
  }

  /**
   * 调用工具
   */
  async invokeTool(tool: Tool, inputs: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const result = await tool.execute(inputs);
      const duration = Date.now() - startTime;

      return {
        success: true,
        data: result,
        metadata: {
          duration,
          toolName: tool.name,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        success: false,
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          duration,
          toolName: tool.name,
        },
      };
    }
  }

  /**
   * 处理工具失败
   */
  async handleToolFailure(
    tool: Tool,
    error: Error,
    fallback?: Tool
  ): Promise<ToolResult> {
    // 记录错误
    console.error(`工具 ${tool.name} 执行失败:`, error);

    // 如果有回退工具，尝试使用
    if (fallback) {
      try {
        return await this.invokeTool(fallback, {});
      } catch (fallbackError) {
        return {
          success: false,
          data: null,
          error: fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)),
          metadata: {
            duration: 0,
            toolName: fallback.name,
          },
        };
      }
    }

    return {
      success: false,
      data: null,
      error,
      metadata: {
        duration: 0,
        toolName: tool.name,
      },
    };
  }

  /**
   * 保存检查点
   */
  private saveCheckpoint(
    context: ConversationContext,
    checkpointId: string,
    data: any
  ): void {
    const checkpoint: Checkpoint = {
      id: checkpointId,
      timestamp: Date.now(),
      phase: context.taskState.phase,
      data,
    };

    context.taskState.checkpoints.push(checkpoint);
  }

  /**
   * 从检查点恢复
   */
  async restoreFromCheckpoint(
    context: ConversationContext,
    checkpointId: string
  ): Promise<boolean> {
    const checkpoint = context.taskState.checkpoints.find((cp) => cp.id === checkpointId);

    if (!checkpoint) {
      return false;
    }

    // 恢复任务状态
    context.taskState.phase = checkpoint.phase;

    // 恢复执行数据
    // 这里可以根据 checkpoint.data 恢复具体的执行状态

    return true;
  }

  /**
   * 分析执行结果并决定下一步
   */
  private analyzeResults(
    artifacts: Artifact[],
    errors: ExecutionError[],
    context: ConversationContext
  ): 'complete' | 'iterate' | 'ask_user' {
    // 如果有不可恢复的错误，询问用户
    if (errors.some((e) => !e.recoverable)) {
      return 'ask_user';
    }

    // 如果没有生成任何产物，询问用户
    if (artifacts.length === 0) {
      return 'ask_user';
    }

    // 如果有可恢复的错误，建议迭代
    if (errors.length > 0) {
      return 'iterate';
    }

    // 如果用户偏好是详细模式，询问是否需要改进
    if (context.userPreferences.verbosity === 'detailed') {
      return 'ask_user';
    }

    // 否则完成
    return 'complete';
  }

  /**
   * 获取执行指标
   */
  private getMetrics(): ExecutionMetrics {
    return {
      totalDuration: Date.now() - this.executionStartTime,
      tokensUsed: this.totalTokensUsed,
      apiCalls: this.totalApiCalls,
      toolsInvoked: [...this.toolsInvoked],
    };
  }

  /**
   * 重置指标
   */
  resetMetrics(): void {
    this.executionStartTime = 0;
    this.totalTokensUsed = 0;
    this.totalApiCalls = 0;
    this.toolsInvoked = [];
  }
}
