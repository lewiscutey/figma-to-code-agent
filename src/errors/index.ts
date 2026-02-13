/**
 * Error types for the Figma-to-Code system.
 */
export enum ErrorType {
  // Extraction layer
  FIGMA_API_ERROR = 'FIGMA_API_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  MCP_CONNECTION_ERROR = 'MCP_CONNECTION_ERROR',

  // Transformation layer
  PARSE_ERROR = 'PARSE_ERROR',
  TRANSFORMATION_ERROR = 'TRANSFORMATION_ERROR',
  INVALID_NODE_TYPE = 'INVALID_NODE_TYPE',

  // Generation layer
  CODE_GENERATION_ERROR = 'CODE_GENERATION_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  TEMPLATE_ERROR = 'TEMPLATE_ERROR',

  // Validation layer
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RENDER_ERROR = 'RENDER_ERROR',

  // Asset layer
  ASSET_DOWNLOAD_ERROR = 'ASSET_DOWNLOAD_ERROR',
  IMAGE_OPTIMIZATION_ERROR = 'IMAGE_OPTIMIZATION_ERROR',

  // Config
  CONFIG_ERROR = 'CONFIG_ERROR',
  INVALID_FRAMEWORK = 'INVALID_FRAMEWORK',
}

/**
 * Custom error class with type, context, and recoverability info.
 */
export class SystemError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public context?: any,
    public recoverable: boolean = false,
  ) {
    super(message);
    this.name = 'SystemError';
  }
}

/**
 * Log levels for the logging system.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Log entry structure.
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: any;
}

/**
 * Logger that collects log entries for reporting.
 */
export class Logger {
  private entries: LogEntry[] = [];

  debug(message: string, context?: any): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: any): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: any): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: any): void {
    this.log('error', message, context);
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  getErrors(): LogEntry[] {
    return this.entries.filter((e) => e.level === 'error');
  }

  getWarnings(): LogEntry[] {
    return this.entries.filter((e) => e.level === 'warn');
  }

  clear(): void {
    this.entries = [];
  }

  private log(level: LogLevel, message: string, context?: any): void {
    this.entries.push({ level, message, timestamp: new Date(), context });
  }
}

/**
 * Processing report generated after a complete conversion.
 */
export interface ProcessingReport {
  startTime: Date;
  endTime: Date;
  duration: number;
  stats: {
    totalNodes: number;
    processedNodes: number;
    skippedNodes: number;
    generatedComponents: number;
    extractedAssets: number;
  };
  errors: SystemError[];
  warnings: string[];
}

/**
 * Error recovery strategies.
 */
export type RecoveryStrategy = 'retry' | 'skip' | 'fallback';

/**
 * Determines the recovery strategy for a given error type.
 */
export function getRecoveryStrategy(errorType: ErrorType): RecoveryStrategy {
  switch (errorType) {
    case ErrorType.AUTHENTICATION_ERROR:
    case ErrorType.INVALID_FRAMEWORK:
    case ErrorType.CONFIG_ERROR:
      // Non-recoverable: fail immediately
      return 'fallback';

    case ErrorType.FIGMA_API_ERROR:
    case ErrorType.MCP_CONNECTION_ERROR:
    case ErrorType.ASSET_DOWNLOAD_ERROR:
      // Network errors: retry
      return 'retry';

    case ErrorType.PARSE_ERROR:
    case ErrorType.TRANSFORMATION_ERROR:
    case ErrorType.INVALID_NODE_TYPE:
    case ErrorType.CODE_GENERATION_ERROR:
    case ErrorType.TEMPLATE_ERROR:
    case ErrorType.VALIDATION_ERROR:
    case ErrorType.RENDER_ERROR:
    case ErrorType.IMAGE_OPTIMIZATION_ERROR:
    case ErrorType.FILE_WRITE_ERROR:
    case ErrorType.FILE_NOT_FOUND:
      // Processing errors: skip and continue
      return 'skip';

    default:
      return 'skip';
  }
}

/**
 * Generate a processing report from logger entries and stats.
 */
export function generateReport(
  logger: Logger,
  startTime: Date,
  stats: ProcessingReport['stats'],
): ProcessingReport {
  const endTime = new Date();
  return {
    startTime,
    endTime,
    duration: endTime.getTime() - startTime.getTime(),
    stats,
    errors: logger.getErrors().map(
      (e) => new SystemError(ErrorType.TRANSFORMATION_ERROR, e.message, e.context, true),
    ),
    warnings: logger.getWarnings().map((w) => w.message),
  };
}
