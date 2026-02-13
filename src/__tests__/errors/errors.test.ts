import {
  ErrorType,
  SystemError,
  Logger,
  getRecoveryStrategy,
  generateReport,
} from '../../errors';

describe('SystemError', () => {
  it('creates error with type and message', () => {
    const err = new SystemError(ErrorType.PARSE_ERROR, 'Failed to parse node');
    expect(err.type).toBe(ErrorType.PARSE_ERROR);
    expect(err.message).toBe('Failed to parse node');
    expect(err.recoverable).toBe(false);
  });

  it('supports recoverable flag', () => {
    const err = new SystemError(ErrorType.FIGMA_API_ERROR, 'Network timeout', null, true);
    expect(err.recoverable).toBe(true);
  });

  it('supports context', () => {
    const err = new SystemError(ErrorType.INVALID_NODE_TYPE, 'Unknown type', { nodeId: '1:1' });
    expect(err.context).toEqual({ nodeId: '1:1' });
  });
});

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
  });

  it('logs entries at different levels', () => {
    logger.debug('debug msg');
    logger.info('info msg');
    logger.warn('warn msg');
    logger.error('error msg');
    expect(logger.getEntries()).toHaveLength(4);
  });

  it('filters errors', () => {
    logger.info('ok');
    logger.error('bad');
    logger.error('worse');
    expect(logger.getErrors()).toHaveLength(2);
  });

  it('filters warnings', () => {
    logger.info('ok');
    logger.warn('caution');
    expect(logger.getWarnings()).toHaveLength(1);
  });

  it('clears entries', () => {
    logger.info('test');
    logger.clear();
    expect(logger.getEntries()).toHaveLength(0);
  });

  it('includes timestamps', () => {
    logger.info('test');
    const entry = logger.getEntries()[0];
    expect(entry.timestamp).toBeInstanceOf(Date);
  });
});

describe('getRecoveryStrategy', () => {
  it('returns fallback for auth errors', () => {
    expect(getRecoveryStrategy(ErrorType.AUTHENTICATION_ERROR)).toBe('fallback');
  });

  it('returns retry for network errors', () => {
    expect(getRecoveryStrategy(ErrorType.FIGMA_API_ERROR)).toBe('retry');
    expect(getRecoveryStrategy(ErrorType.ASSET_DOWNLOAD_ERROR)).toBe('retry');
  });

  it('returns skip for processing errors', () => {
    expect(getRecoveryStrategy(ErrorType.PARSE_ERROR)).toBe('skip');
    expect(getRecoveryStrategy(ErrorType.TRANSFORMATION_ERROR)).toBe('skip');
  });
});

describe('generateReport', () => {
  it('generates a processing report', () => {
    const logger = new Logger();
    logger.info('Started');
    logger.warn('Skipped node');
    logger.error('Failed node');
    const start = new Date(Date.now() - 1000);

    const report = generateReport(logger, start, {
      totalNodes: 100,
      processedNodes: 98,
      skippedNodes: 2,
      generatedComponents: 10,
      extractedAssets: 5,
    });

    expect(report.duration).toBeGreaterThan(0);
    expect(report.stats.totalNodes).toBe(100);
    expect(report.errors).toHaveLength(1);
    expect(report.warnings).toHaveLength(1);
    expect(report.warnings[0]).toBe('Skipped node');
  });
});
