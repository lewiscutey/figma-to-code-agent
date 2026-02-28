/**
 * TokenMonitor 单元测试
 */

import { TokenMonitor } from '../../performance/TokenMonitor';

describe('TokenMonitor', () => {
  let monitor: TokenMonitor;

  beforeEach(() => {
    monitor = new TokenMonitor(
      {
        daily: 100000,
        weekly: 500000,
        monthly: 2000000,
      },
      {
        'gpt-4': {
          promptCost: 0.03,
          completionCost: 0.06,
        },
        'gpt-3.5-turbo': {
          promptCost: 0.0015,
          completionCost: 0.002,
        },
      }
    );
  });

  describe('recordUsage', () => {
    it('should record token usage with calculated cost', () => {
      const usage = monitor.recordUsage({
        model: 'gpt-4',
        operation: 'semantic-naming',
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      });

      expect(usage.id).toBeDefined();
      expect(usage.timestamp).toBeInstanceOf(Date);
      expect(usage.estimatedCost).toBeCloseTo(0.06); // (1000/1000)*0.03 + (500/1000)*0.06
    });

    it('should include metadata when provided', () => {
      const usage = monitor.recordUsage({
        model: 'gpt-4',
        operation: 'code-optimization',
        promptTokens: 2000,
        completionTokens: 1000,
        totalTokens: 3000,
        metadata: {
          userId: 'user123',
          sessionId: 'session456',
        },
      });

      expect(usage.metadata?.userId).toBe('user123');
      expect(usage.metadata?.sessionId).toBe('session456');
    });
  });

  describe('getStats', () => {
    it('should calculate overall statistics', () => {
      monitor.recordUsage({
        model: 'gpt-4',
        operation: 'naming',
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      });

      monitor.recordUsage({
        model: 'gpt-4',
        operation: 'optimization',
        promptTokens: 2000,
        completionTokens: 1000,
        totalTokens: 3000,
      });

      const stats = monitor.getStats();

      expect(stats.totalTokens).toBe(4500);
      expect(stats.totalRequests).toBe(2);
      expect(stats.averageTokensPerRequest).toBe(2250);
      expect(stats.totalCost).toBeGreaterThan(0);
    });

    it('should group statistics by model', () => {
      monitor.recordUsage({
        model: 'gpt-4',
        operation: 'naming',
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      });

      monitor.recordUsage({
        model: 'gpt-3.5-turbo',
        operation: 'naming',
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      });

      const stats = monitor.getStats();

      expect(stats.byModel.size).toBe(2);
      expect(stats.byModel.get('gpt-4')?.requests).toBe(1);
      expect(stats.byModel.get('gpt-3.5-turbo')?.requests).toBe(1);
    });

    it('should group statistics by operation', () => {
      monitor.recordUsage({
        model: 'gpt-4',
        operation: 'naming',
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      });

      monitor.recordUsage({
        model: 'gpt-4',
        operation: 'optimization',
        promptTokens: 2000,
        completionTokens: 1000,
        totalTokens: 3000,
      });

      const stats = monitor.getStats();

      expect(stats.byOperation.size).toBe(2);
      expect(stats.byOperation.get('naming')?.totalTokens).toBe(1500);
      expect(stats.byOperation.get('optimization')?.totalTokens).toBe(3000);
    });

    it('should calculate period statistics', () => {
      monitor.recordUsage({
        model: 'gpt-4',
        operation: 'naming',
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      });

      const stats = monitor.getStats();

      expect(stats.byPeriod.today.tokens).toBe(1500);
      expect(stats.byPeriod.today.requests).toBe(1);
      expect(stats.byPeriod.thisWeek.tokens).toBe(1500);
      expect(stats.byPeriod.thisMonth.tokens).toBe(1500);
    });
  });

  describe('checkBudget', () => {
    it('should detect when daily budget is exceeded', () => {
      const smallMonitor = new TokenMonitor({ daily: 1000 });

      smallMonitor.recordUsage({
        model: 'gpt-4',
        operation: 'test',
        promptTokens: 800,
        completionTokens: 400,
        totalTokens: 1200,
      });

      const budget = smallMonitor.checkBudget();

      expect(budget.daily.exceeded).toBe(true);
      expect(budget.daily.usage).toBe(1200);
    });

    it('should not exceed when within budget', () => {
      monitor.recordUsage({
        model: 'gpt-4',
        operation: 'test',
        promptTokens: 500,
        completionTokens: 250,
        totalTokens: 750,
      });

      const budget = monitor.checkBudget();

      expect(budget.daily.exceeded).toBe(false);
      expect(budget.weekly.exceeded).toBe(false);
      expect(budget.monthly.exceeded).toBe(false);
    });

    it('should call warning callback when approaching budget', () => {
      const warningCallback = jest.fn();
      const smallMonitor = new TokenMonitor({ daily: 1000 });
      smallMonitor.onWarning(warningCallback);

      // Use 85% of budget (above 80% threshold)
      smallMonitor.recordUsage({
        model: 'gpt-4',
        operation: 'test',
        promptTokens: 600,
        completionTokens: 250,
        totalTokens: 850,
      });

      expect(warningCallback).toHaveBeenCalledWith(850, 1000);
    });

    it('should call exceeded callback when budget exceeded', () => {
      const exceededCallback = jest.fn();
      const smallMonitor = new TokenMonitor({ daily: 1000 });
      smallMonitor.onExceeded(exceededCallback);

      smallMonitor.recordUsage({
        model: 'gpt-4',
        operation: 'test',
        promptTokens: 800,
        completionTokens: 400,
        totalTokens: 1200,
      });

      expect(exceededCallback).toHaveBeenCalledWith(1200, 1000);
    });
  });

  describe('estimateCost', () => {
    it('should estimate cost for a request', () => {
      const cost = monitor.estimateCost('gpt-4', 1000, 500);

      expect(cost).toBeCloseTo(0.06); // (1000/1000)*0.03 + (500/1000)*0.06
    });

    it('should use default cost for unknown models', () => {
      const cost = monitor.estimateCost('unknown-model', 1000, 500);

      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('getRemainingBudget', () => {
    it('should calculate remaining budget', () => {
      monitor.recordUsage({
        model: 'gpt-4',
        operation: 'test',
        promptTokens: 500,
        completionTokens: 250,
        totalTokens: 750,
      });

      const remaining = monitor.getRemainingBudget();

      expect(remaining.daily).toBe(99250); // 100000 - 750
      expect(remaining.weekly).toBe(499250);
      expect(remaining.monthly).toBe(1999250);
    });

    it('should return Infinity for unlimited budgets', () => {
      const unlimitedMonitor = new TokenMonitor({});

      const remaining = unlimitedMonitor.getRemainingBudget();

      expect(remaining.daily).toBe(Infinity);
      expect(remaining.weekly).toBe(Infinity);
      expect(remaining.monthly).toBe(Infinity);
    });
  });

  describe('updateBudget', () => {
    it('should update budget limits', () => {
      monitor.updateBudget({ daily: 50000 });

      monitor.recordUsage({
        model: 'gpt-4',
        operation: 'test',
        promptTokens: 30000,
        completionTokens: 15000,
        totalTokens: 45000,
      });

      const budget = monitor.checkBudget();

      expect(budget.daily.budget).toBe(50000);
      expect(budget.daily.exceeded).toBe(false);
    });
  });

  describe('clearHistory', () => {
    it('should clear all history', () => {
      monitor.recordUsage({
        model: 'gpt-4',
        operation: 'test',
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      });

      monitor.clearHistory();

      const stats = monitor.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.totalTokens).toBe(0);
    });

    it('should clear history before specific date', () => {
      const now = new Date();

      monitor.recordUsage({
        model: 'gpt-4',
        operation: 'old',
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      });

      // Wait a bit
      const cutoffDate = new Date(now.getTime() + 100);

      setTimeout(() => {
        monitor.recordUsage({
          model: 'gpt-4',
          operation: 'new',
          promptTokens: 1000,
          completionTokens: 500,
          totalTokens: 1500,
        });

        monitor.clearHistory(cutoffDate);

        const stats = monitor.getStats();
        expect(stats.totalRequests).toBe(1);
      }, 150);
    });
  });

  describe('exportUsage', () => {
    it('should export all usage records', () => {
      monitor.recordUsage({
        model: 'gpt-4',
        operation: 'test1',
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      });

      monitor.recordUsage({
        model: 'gpt-4',
        operation: 'test2',
        promptTokens: 2000,
        completionTokens: 1000,
        totalTokens: 3000,
      });

      const exported = monitor.exportUsage();

      expect(exported).toHaveLength(2);
      expect(exported[0].operation).toBe('test1');
      expect(exported[1].operation).toBe('test2');
    });

    it('should filter by date range', () => {
      const now = new Date();

      monitor.recordUsage({
        model: 'gpt-4',
        operation: 'test',
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      });

      const futureDate = new Date(now.getTime() + 10000);
      const exported = monitor.exportUsage(futureDate);

      expect(exported).toHaveLength(0);
    });
  });

  describe('generateReport', () => {
    it('should generate a comprehensive report', () => {
      monitor.recordUsage({
        model: 'gpt-4',
        operation: 'naming',
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      });

      monitor.recordUsage({
        model: 'gpt-3.5-turbo',
        operation: 'optimization',
        promptTokens: 2000,
        completionTokens: 1000,
        totalTokens: 3000,
      });

      const report = monitor.generateReport();

      expect(report).toContain('Token Usage Report');
      expect(report).toContain('Overall Statistics');
      expect(report).toContain('Budget Status');
      expect(report).toContain('Usage by Model');
      expect(report).toContain('Usage by Operation');
      expect(report).toContain('gpt-4');
      expect(report).toContain('gpt-3.5-turbo');
    });

    it('should indicate budget status in report', () => {
      const smallMonitor = new TokenMonitor({ daily: 1000 });

      smallMonitor.recordUsage({
        model: 'gpt-4',
        operation: 'test',
        promptTokens: 800,
        completionTokens: 400,
        totalTokens: 1200,
      });

      const report = smallMonitor.generateReport();

      expect(report).toContain('⚠️ EXCEEDED');
    });
  });
});
