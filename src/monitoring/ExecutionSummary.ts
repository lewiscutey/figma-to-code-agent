/**
 * 执行摘要生成系统
 * 收集和格式化执行过程的摘要信息
 */

export interface ExecutionEvent {
  id: string;
  timestamp: Date;
  type: 'decision' | 'tool_call' | 'result' | 'error' | 'checkpoint';
  data: any;
}

export interface DecisionEvent {
  intent: string;
  strategies: string[];
  selectedStrategy: string;
  reasoning: string;
  confidence: number;
}

export interface ToolCallEvent {
  toolName: string;
  inputs: any;
  duration: number;
  success: boolean;
  error?: string;
}

export interface ResultEvent {
  success: boolean;
  outputs?: any;
  error?: string;
  metrics: {
    totalDuration: number;
    tokensUsed: number;
    toolsInvoked: number;
  };
}

export interface ExecutionSummaryData {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  totalDuration: number;
  success: boolean;
  events: ExecutionEvent[];
  decisions: DecisionEvent[];
  toolCalls: ToolCallEvent[];
  results: ResultEvent[];
  metrics: {
    totalTokens: number;
    totalCost: number;
    toolCallCount: number;
    successRate: number;
  };
}

/**
 * 执行摘要生成器
 */
export class ExecutionSummary {
  private sessionId: string;
  private startTime: Date;
  private endTime?: Date;
  private events: ExecutionEvent[] = [];
  private decisions: DecisionEvent[] = [];
  private toolCalls: ToolCallEvent[] = [];
  private results: ResultEvent[] = [];

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.startTime = new Date();
  }

  /**
   * 记录决策事件
   */
  recordDecision(decision: DecisionEvent): void {
    this.decisions.push(decision);
    this.events.push({
      id: this.generateId(),
      timestamp: new Date(),
      type: 'decision',
      data: decision,
    });
  }

  /**
   * 记录工具调用事件
   */
  recordToolCall(toolCall: ToolCallEvent): void {
    this.toolCalls.push(toolCall);
    this.events.push({
      id: this.generateId(),
      timestamp: new Date(),
      type: 'tool_call',
      data: toolCall,
    });
  }

  /**
   * 记录结果事件
   */
  recordResult(result: ResultEvent): void {
    this.results.push(result);
    this.events.push({
      id: this.generateId(),
      timestamp: new Date(),
      type: 'result',
      data: result,
    });
  }

  /**
   * 记录错误事件
   */
  recordError(error: string, context?: any): void {
    this.events.push({
      id: this.generateId(),
      timestamp: new Date(),
      type: 'error',
      data: { error, context },
    });
  }

  /**
   * 记录检查点事件
   */
  recordCheckpoint(checkpoint: any): void {
    this.events.push({
      id: this.generateId(),
      timestamp: new Date(),
      type: 'checkpoint',
      data: checkpoint,
    });
  }

  /**
   * 完成执行
   */
  complete(): void {
    this.endTime = new Date();
  }

  /**
   * 获取摘要数据
   */
  getSummaryData(): ExecutionSummaryData {
    const totalDuration = this.endTime
      ? this.endTime.getTime() - this.startTime.getTime()
      : Date.now() - this.startTime.getTime();

    const successfulToolCalls = this.toolCalls.filter((tc) => tc.success).length;
    const successRate = this.toolCalls.length > 0 ? successfulToolCalls / this.toolCalls.length : 0;

    const totalTokens = this.results.reduce((sum, r) => sum + (r.metrics?.tokensUsed || 0), 0);
    const totalCost = totalTokens * 0.00001; // 简化的成本计算

    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime: this.endTime,
      totalDuration,
      success: this.results.length > 0 && this.results[this.results.length - 1].success,
      events: this.events,
      decisions: this.decisions,
      toolCalls: this.toolCalls,
      results: this.results,
      metrics: {
        totalTokens,
        totalCost,
        toolCallCount: this.toolCalls.length,
        successRate,
      },
    };
  }

  /**
   * 格式化摘要为文本
   */
  formatAsText(): string {
    const data = this.getSummaryData();
    const lines: string[] = [];

    lines.push('# 执行摘要\n');
    lines.push(`会话 ID: ${data.sessionId}`);
    lines.push(`开始时间: ${data.startTime.toISOString()}`);
    if (data.endTime) {
      lines.push(`结束时间: ${data.endTime.toISOString()}`);
    }
    lines.push(`总耗时: ${this.formatDuration(data.totalDuration)}`);
    lines.push(`状态: ${data.success ? '✓ 成功' : '✗ 失败'}\n`);

    // 指标
    lines.push('## 执行指标\n');
    lines.push(`工具调用次数: ${data.metrics.toolCallCount}`);
    lines.push(`成功率: ${(data.metrics.successRate * 100).toFixed(1)}%`);
    lines.push(`Token 使用量: ${data.metrics.totalTokens.toLocaleString()}`);
    lines.push(`预估成本: $${data.metrics.totalCost.toFixed(4)}\n`);

    // 决策
    if (data.decisions.length > 0) {
      lines.push('## 决策记录\n');
      data.decisions.forEach((decision, idx) => {
        lines.push(`### 决策 ${idx + 1}`);
        lines.push(`意图: ${decision.intent}`);
        lines.push(`选择策略: ${decision.selectedStrategy}`);
        lines.push(`理由: ${decision.reasoning}`);
        lines.push(`置信度: ${(decision.confidence * 100).toFixed(1)}%`);
        if (decision.strategies.length > 1) {
          lines.push(`备选策略: ${decision.strategies.filter((s) => s !== decision.selectedStrategy).join(', ')}`);
        }
        lines.push('');
      });
    }

    // 工具调用
    if (data.toolCalls.length > 0) {
      lines.push('## 工具调用记录\n');
      data.toolCalls.forEach((call, idx) => {
        const status = call.success ? '✓' : '✗';
        lines.push(`${idx + 1}. ${status} ${call.toolName} (${this.formatDuration(call.duration)})`);
        if (call.error) {
          lines.push(`   错误: ${call.error}`);
        }
      });
      lines.push('');
    }

    // 结果
    if (data.results.length > 0) {
      lines.push('## 执行结果\n');
      const lastResult = data.results[data.results.length - 1];
      lines.push(`状态: ${lastResult.success ? '成功' : '失败'}`);
      if (lastResult.error) {
        lines.push(`错误: ${lastResult.error}`);
      }
      if (lastResult.outputs) {
        lines.push(`输出: ${JSON.stringify(lastResult.outputs, null, 2)}`);
      }
      lines.push('');
    }

    // 时间线
    lines.push('## 执行时间线\n');
    data.events.forEach((event) => {
      const time = event.timestamp.toISOString().split('T')[1].split('.')[0];
      const type = this.getEventTypeLabel(event.type);
      lines.push(`[${time}] ${type}`);
    });

    return lines.join('\n');
  }

  /**
   * 格式化摘要为 JSON
   */
  formatAsJson(): string {
    return JSON.stringify(this.getSummaryData(), null, 2);
  }

  /**
   * 生成执行流程图（Mermaid 格式）
   */
  generateFlowchart(): string {
    const data = this.getSummaryData();
    const lines: string[] = [];

    lines.push('```mermaid');
    lines.push('graph TD');
    lines.push('    Start([开始]) --> Intent[理解意图]');

    // 决策节点
    data.decisions.forEach((decision, idx) => {
      const decisionId = `Decision${idx}`;
      const strategyId = `Strategy${idx}`;

      if (idx === 0) {
        lines.push(`    Intent --> ${decisionId}{决策 ${idx + 1}}`);
      } else {
        lines.push(`    Tool${idx - 1} --> ${decisionId}{决策 ${idx + 1}}`);
      }

      lines.push(`    ${decisionId} --> ${strategyId}[${decision.selectedStrategy}]`);
    });

    // 工具调用节点
    data.toolCalls.forEach((call, idx) => {
      const toolId = `Tool${idx}`;
      const prevNode = idx === 0 ? 'Strategy0' : `Tool${idx - 1}`;

      const style = call.success ? '' : ':::error';
      lines.push(`    ${prevNode} --> ${toolId}[${call.toolName}]${style}`);
    });

    // 结果节点
    const lastToolId = data.toolCalls.length > 0 ? `Tool${data.toolCalls.length - 1}` : 'Strategy0';
    const resultStyle = data.success ? ':::success' : ':::error';
    lines.push(`    ${lastToolId} --> Result([${data.success ? '成功' : '失败'}])${resultStyle}`);

    // 样式定义
    lines.push('');
    lines.push('    classDef success fill:#90EE90');
    lines.push('    classDef error fill:#FFB6C1');
    lines.push('```');

    return lines.join('\n');
  }

  /**
   * 生成简短摘要
   */
  generateBriefSummary(): string {
    const data = this.getSummaryData();
    const duration = this.formatDuration(data.totalDuration);
    const status = data.success ? '成功' : '失败';

    return `执行${status}，耗时 ${duration}，调用 ${data.metrics.toolCallCount} 个工具，使用 ${data.metrics.totalTokens} tokens`;
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
   * 获取事件类型标签
   */
  private getEventTypeLabel(type: ExecutionEvent['type']): string {
    const labels: Record<ExecutionEvent['type'], string> = {
      decision: '决策',
      tool_call: '工具调用',
      result: '结果',
      error: '错误',
      checkpoint: '检查点',
    };
    return labels[type] || type;
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 执行摘要管理器
 */
export class ExecutionSummaryManager {
  private summaries: Map<string, ExecutionSummary> = new Map();
  private currentSessionId: string | null = null;

  /**
   * 开始新会话
   */
  startSession(sessionId?: string): ExecutionSummary {
    const id = sessionId || this.generateSessionId();
    const summary = new ExecutionSummary(id);
    this.summaries.set(id, summary);
    this.currentSessionId = id;
    return summary;
  }

  /**
   * 获取当前会话摘要
   */
  getCurrentSummary(): ExecutionSummary | null {
    if (!this.currentSessionId) {
      return null;
    }
    return this.summaries.get(this.currentSessionId) || null;
  }

  /**
   * 获取会话摘要
   */
  getSummary(sessionId: string): ExecutionSummary | null {
    return this.summaries.get(sessionId) || null;
  }

  /**
   * 完成当前会话
   */
  completeCurrentSession(): void {
    const summary = this.getCurrentSummary();
    if (summary) {
      summary.complete();
    }
    this.currentSessionId = null;
  }

  /**
   * 列出所有会话
   */
  listSessions(): string[] {
    return Array.from(this.summaries.keys());
  }

  /**
   * 清除会话
   */
  clearSession(sessionId: string): void {
    this.summaries.delete(sessionId);
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }
  }

  /**
   * 清除所有会话
   */
  clearAllSessions(): void {
    this.summaries.clear();
    this.currentSessionId = null;
  }

  /**
   * 生成会话 ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
