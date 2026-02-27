/**
 * 执行日志系统
 * 提供结构化日志记录和输出
 */

import * as fs from 'fs';
import * as path from 'path';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
  tags?: string[];
}

export interface LoggerConfig {
  level: LogLevel;
  outputs: LogOutput[];
  includeTimestamp: boolean;
  includeContext: boolean;
  colorOutput: boolean;
  maxFileSize?: number; // bytes
  maxFiles?: number;
}

export interface LogOutput {
  type: 'console' | 'file';
  path?: string;
  format?: 'text' | 'json';
}

/**
 * 日志记录器
 */
export class Logger {
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private fileHandles: Map<string, fs.WriteStream> = new Map();
  private readonly levelPriority: Record<LogLevel, number> = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  };

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: 'INFO',
      outputs: [{ type: 'console', format: 'text' }],
      includeTimestamp: true,
      includeContext: true,
      colorOutput: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      ...config,
    };

    // 初始化文件输出
    this.initializeFileOutputs();
  }

  /**
   * 记录 DEBUG 级别日志
   */
  debug(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log('DEBUG', message, context, undefined, tags);
  }

  /**
   * 记录 INFO 级别日志
   */
  info(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log('INFO', message, context, undefined, tags);
  }

  /**
   * 记录 WARN 级别日志
   */
  warn(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log('WARN', message, context, undefined, tags);
  }

  /**
   * 记录 ERROR 级别日志
   */
  error(message: string, error?: Error, context?: Record<string, any>, tags?: string[]): void {
    this.log('ERROR', message, context, error, tags);
  }

  /**
   * 记录日志
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error,
    tags?: string[]
  ): void {
    // 检查日志级别
    if (this.levelPriority[level] < this.levelPriority[this.config.level]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      error,
      tags,
    };

    // 添加到缓冲区
    this.logBuffer.push(entry);

    // 输出到各个目标
    for (const output of this.config.outputs) {
      this.writeToOutput(entry, output);
    }
  }

  /**
   * 获取日志历史
   */
  getHistory(filter?: {
    level?: LogLevel;
    tags?: string[];
    startTime?: Date;
    endTime?: Date;
  }): LogEntry[] {
    let filtered = this.logBuffer;

    if (filter) {
      if (filter.level) {
        const minPriority = this.levelPriority[filter.level];
        filtered = filtered.filter((entry) => this.levelPriority[entry.level] >= minPriority);
      }

      if (filter.tags && filter.tags.length > 0) {
        filtered = filtered.filter((entry) =>
          entry.tags?.some((tag) => filter.tags!.includes(tag))
        );
      }

      if (filter.startTime) {
        filtered = filtered.filter((entry) => entry.timestamp >= filter.startTime!);
      }

      if (filter.endTime) {
        filtered = filtered.filter((entry) => entry.timestamp <= filter.endTime!);
      }
    }

    return filtered;
  }

  /**
   * 清除日志历史
   */
  clearHistory(): void {
    this.logBuffer = [];
  }

  /**
   * 导出日志
   */
  exportLogs(outputPath: string, format: 'text' | 'json' = 'json'): void {
    const content =
      format === 'json'
        ? JSON.stringify(this.logBuffer, null, 2)
        : this.logBuffer.map((entry) => this.formatTextEntry(entry)).join('\n');

    fs.writeFileSync(outputPath, content, 'utf-8');
  }

  /**
   * 关闭日志记录器
   */
  close(): void {
    // 关闭所有文件句柄
    for (const handle of this.fileHandles.values()) {
      handle.end();
    }
    this.fileHandles.clear();
  }

  /**
   * 初始化文件输出
   */
  private initializeFileOutputs(): void {
    for (const output of this.config.outputs) {
      if (output.type === 'file' && output.path) {
        // 确保目录存在
        const dir = path.dirname(output.path);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // 检查文件大小并轮转
        this.rotateLogFileIfNeeded(output.path);

        // 创建写入流
        const stream = fs.createWriteStream(output.path, { flags: 'a' });
        this.fileHandles.set(output.path, stream);
      }
    }
  }

  /**
   * 写入到输出目标
   */
  private writeToOutput(entry: LogEntry, output: LogOutput): void {
    const format = output.format || 'text';

    if (output.type === 'console') {
      const formatted =
        format === 'json' ? this.formatJsonEntry(entry) : this.formatTextEntry(entry);

      const colorized = this.config.colorOutput ? this.colorizeEntry(formatted, entry.level) : formatted;

      console.log(colorized);
    } else if (output.type === 'file' && output.path) {
      const handle = this.fileHandles.get(output.path);
      if (handle) {
        const formatted =
          format === 'json'
            ? JSON.stringify(this.serializeEntry(entry)) + '\n'
            : this.formatTextEntry(entry) + '\n';

        handle.write(formatted);

        // 检查文件大小
        this.checkAndRotateLogFile(output.path);
      }
    }
  }

  /**
   * 格式化文本日志条目
   */
  private formatTextEntry(entry: LogEntry): string {
    const parts: string[] = [];

    // 时间戳
    if (this.config.includeTimestamp) {
      parts.push(`[${entry.timestamp.toISOString()}]`);
    }

    // 级别
    parts.push(`[${entry.level}]`);

    // 标签
    if (entry.tags && entry.tags.length > 0) {
      parts.push(`[${entry.tags.join(', ')}]`);
    }

    // 消息
    parts.push(entry.message);

    // 上下文
    if (this.config.includeContext && entry.context && Object.keys(entry.context).length > 0) {
      parts.push(`\n  Context: ${JSON.stringify(entry.context)}`);
    }

    // 错误
    if (entry.error) {
      parts.push(`\n  Error: ${entry.error.message}`);
      if (entry.error.stack) {
        parts.push(`\n  Stack: ${entry.error.stack}`);
      }
    }

    return parts.join(' ');
  }

  /**
   * 格式化 JSON 日志条目
   */
  private formatJsonEntry(entry: LogEntry): string {
    return JSON.stringify(this.serializeEntry(entry));
  }

  /**
   * 序列化日志条目
   */
  private serializeEntry(entry: LogEntry): any {
    return {
      timestamp: entry.timestamp.toISOString(),
      level: entry.level,
      message: entry.message,
      context: entry.context,
      error: entry.error
        ? {
            message: entry.error.message,
            stack: entry.error.stack,
            name: entry.error.name,
          }
        : undefined,
      tags: entry.tags,
    };
  }

  /**
   * 着色日志条目
   */
  private colorizeEntry(text: string, level: LogLevel): string {
    const colors: Record<LogLevel, string> = {
      DEBUG: '\x1b[90m', // 灰色
      INFO: '\x1b[36m', // 青色
      WARN: '\x1b[33m', // 黄色
      ERROR: '\x1b[31m', // 红色
    };

    const reset = '\x1b[0m';
    return `${colors[level]}${text}${reset}`;
  }

  /**
   * 检查并轮转日志文件
   */
  private checkAndRotateLogFile(filePath: string): void {
    try {
      const stats = fs.statSync(filePath);
      if (stats.size >= this.config.maxFileSize!) {
        this.rotateLogFile(filePath);
      }
    } catch (error) {
      // 文件不存在或无法访问，忽略
    }
  }

  /**
   * 轮转日志文件（如果需要）
   */
  private rotateLogFileIfNeeded(filePath: string): void {
    try {
      const stats = fs.statSync(filePath);
      if (stats.size >= this.config.maxFileSize!) {
        this.rotateLogFile(filePath);
      }
    } catch (error) {
      // 文件不存在，不需要轮转
    }
  }

  /**
   * 轮转日志文件
   */
  private rotateLogFile(filePath: string): void {
    // 关闭当前文件句柄
    const handle = this.fileHandles.get(filePath);
    if (handle) {
      handle.end();
      this.fileHandles.delete(filePath);
    }

    // 轮转文件
    const ext = path.extname(filePath);
    const base = filePath.slice(0, -ext.length);

    // 删除最旧的文件
    const oldestFile = `${base}.${this.config.maxFiles}${ext}`;
    if (fs.existsSync(oldestFile)) {
      fs.unlinkSync(oldestFile);
    }

    // 重命名现有文件
    for (let i = this.config.maxFiles! - 1; i >= 1; i--) {
      const oldFile = `${base}.${i}${ext}`;
      const newFile = `${base}.${i + 1}${ext}`;
      if (fs.existsSync(oldFile)) {
        fs.renameSync(oldFile, newFile);
      }
    }

    // 重命名当前文件
    if (fs.existsSync(filePath)) {
      fs.renameSync(filePath, `${base}.1${ext}`);
    }

    // 创建新的文件句柄
    const stream = fs.createWriteStream(filePath, { flags: 'a' });
    this.fileHandles.set(filePath, stream);
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalLogs: number;
    byLevel: Record<LogLevel, number>;
    byTag: Record<string, number>;
    errorCount: number;
  } {
    const byLevel: Record<LogLevel, number> = {
      DEBUG: 0,
      INFO: 0,
      WARN: 0,
      ERROR: 0,
    };

    const byTag: Record<string, number> = {};
    let errorCount = 0;

    for (const entry of this.logBuffer) {
      byLevel[entry.level]++;

      if (entry.error) {
        errorCount++;
      }

      if (entry.tags) {
        for (const tag of entry.tags) {
          byTag[tag] = (byTag[tag] || 0) + 1;
        }
      }
    }

    return {
      totalLogs: this.logBuffer.length,
      byLevel,
      byTag,
      errorCount,
    };
  }
}

/**
 * 全局日志记录器实例
 */
let globalLogger: Logger | null = null;

/**
 * 获取全局日志记录器
 */
export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new Logger();
  }
  return globalLogger;
}

/**
 * 设置全局日志记录器
 */
export function setLogger(logger: Logger): void {
  globalLogger = logger;
}

/**
 * 便捷日志函数
 */
export function debug(message: string, context?: Record<string, any>, tags?: string[]): void {
  getLogger().debug(message, context, tags);
}

export function info(message: string, context?: Record<string, any>, tags?: string[]): void {
  getLogger().info(message, context, tags);
}

export function warn(message: string, context?: Record<string, any>, tags?: string[]): void {
  getLogger().warn(message, context, tags);
}

export function error(message: string, err?: Error, context?: Record<string, any>, tags?: string[]): void {
  getLogger().error(message, err, context, tags);
}
