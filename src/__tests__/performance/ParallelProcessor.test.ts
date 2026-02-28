/**
 * ParallelProcessor 单元测试
 */

import { ParallelProcessor } from '../../performance/ParallelProcessor';
import type { ProcessingTask } from '../../performance/ParallelProcessor';
import type { ASTNode } from '../../transformation/types';

describe('ParallelProcessor', () => {
  let processor: ParallelProcessor;

  beforeEach(() => {
    processor = new ParallelProcessor({
      maxConcurrency: 2,
      timeout: 5000,
      retryOnFailure: true,
      maxRetries: 2,
    });
  });

  describe('executeParallel', () => {
    it('should execute tasks in parallel', async () => {
      const tasks: ProcessingTask<number>[] = [
        { id: '1', type: 'test', data: 1 },
        { id: '2', type: 'test', data: 2 },
        { id: '3', type: 'test', data: 3 },
      ];

      const processor = jest.fn(async (task) => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return task.data * 2;
      });

      const startTime = Date.now();
      const results = await processor.executeParallel(tasks, processor);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
      // Should take ~200ms (2 batches of 2 concurrent tasks) not 300ms (sequential)
      expect(duration).toBeLessThan(250);
    });

    it('should respect task dependencies', async () => {
      const executionOrder: string[] = [];

      const tasks: ProcessingTask<string>[] = [
        { id: 'task1', type: 'test', data: 'A', dependencies: [] },
        { id: 'task2', type: 'test', data: 'B', dependencies: ['task1'] },
        { id: 'task3', type: 'test', data: 'C', dependencies: ['task1', 'task2'] },
      ];

      const taskProcessor = jest.fn(async (task) => {
        executionOrder.push(task.id);
        await new Promise((resolve) => setTimeout(resolve, 50));
        return task.data;
      });

      await processor.executeParallel(tasks, taskProcessor);

      expect(executionOrder[0]).toBe('task1');
      expect(executionOrder[1]).toBe('task2');
      expect(executionOrder[2]).toBe('task3');
    });

    it('should handle task failures', async () => {
      const tasks: ProcessingTask<number>[] = [
        { id: '1', type: 'test', data: 1 },
        { id: '2', type: 'test', data: 2 },
      ];

      const taskProcessor = jest.fn(async (task) => {
        if (task.id === '2') {
          throw new Error('Task failed');
        }
        return task.data * 2;
      });

      const results = await processor.executeParallel(tasks, taskProcessor);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error?.message).toBe('Task failed');
    });

    it('should retry failed tasks', async () => {
      let attemptCount = 0;

      const tasks: ProcessingTask<number>[] = [{ id: '1', type: 'test', data: 1 }];

      const taskProcessor = jest.fn(async (task) => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Temporary failure');
        }
        return task.data * 2;
      });

      const results = await processor.executeParallel(tasks, taskProcessor);

      expect(results[0].success).toBe(true);
      expect(attemptCount).toBe(2);
    });

    it('should respect priority', async () => {
      const executionOrder: string[] = [];

      const tasks: ProcessingTask<string>[] = [
        { id: 'low', type: 'test', data: 'L', priority: 1 },
        { id: 'high', type: 'test', data: 'H', priority: 10 },
        { id: 'medium', type: 'test', data: 'M', priority: 5 },
      ];

      const taskProcessor = jest.fn(async (task) => {
        executionOrder.push(task.id);
        await new Promise((resolve) => setTimeout(resolve, 50));
        return task.data;
      });

      await processor.executeParallel(tasks, taskProcessor);

      // High priority should execute first
      expect(executionOrder[0]).toBe('high');
    });

    it('should handle timeout', async () => {
      const shortProcessor = new ParallelProcessor({
        maxConcurrency: 1,
        timeout: 100,
        retryOnFailure: false,
      });

      const tasks: ProcessingTask<number>[] = [{ id: '1', type: 'test', data: 1 }];

      const taskProcessor = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return 42;
      });

      const results = await shortProcessor.executeParallel(tasks, taskProcessor);

      expect(results[0].success).toBe(false);
      expect(results[0].error?.message).toContain('timeout');
    });
  });

  describe('analyzeComponentIndependence', () => {
    it('should detect independent components', () => {
      const nodes: ASTNode[] = [
        {
          id: '1',
          type: 'Container',
          name: 'Component1',
          children: [],
          styles: {},
          metadata: { componentName: 'Component1' },
        },
        {
          id: '2',
          type: 'Container',
          name: 'Component2',
          children: [],
          styles: {},
          metadata: { componentName: 'Component2' },
        },
      ];

      const dependencies = processor.analyzeComponentIndependence(nodes);

      expect(dependencies.get('1')).toEqual([]);
      expect(dependencies.get('2')).toEqual([]);
    });

    it('should detect component dependencies', () => {
      const nodes: ASTNode[] = [
        {
          id: '1',
          type: 'Container',
          name: 'Parent',
          children: [],
          styles: {},
          metadata: { componentName: 'Parent' },
        },
        {
          id: '2',
          type: 'Container',
          name: 'Child',
          children: [
            {
              id: '3',
              type: 'Container',
              name: 'Reference',
              children: [],
              styles: {},
              metadata: { componentName: 'Parent' },
            },
          ],
          styles: {},
          metadata: { componentName: 'Child' },
        },
      ];

      const dependencies = processor.analyzeComponentIndependence(nodes);

      expect(dependencies.get('2')).toContain('1');
    });
  });

  describe('processComponents', () => {
    it('should process independent components in parallel', async () => {
      const components: ASTNode[] = [
        {
          id: '1',
          type: 'Container',
          name: 'Component1',
          children: [],
          styles: {},
          metadata: { componentName: 'Component1', isComponent: true },
        },
        {
          id: '2',
          type: 'Container',
          name: 'Component2',
          children: [],
          styles: {},
          metadata: { componentName: 'Component2', isComponent: true },
        },
      ];

      const componentProcessor = jest.fn(async (component) => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return `Processed ${component.name}`;
      });

      const startTime = Date.now();
      const results = await processor.processComponents(components, componentProcessor);
      const duration = Date.now() - startTime;

      expect(results.size).toBe(2);
      expect(results.get('1')?.success).toBe(true);
      expect(results.get('2')?.success).toBe(true);
      // Should process in parallel
      expect(duration).toBeLessThan(150);
    });

    it('should respect component dependencies', async () => {
      const executionOrder: string[] = [];

      const components: ASTNode[] = [
        {
          id: '1',
          type: 'Container',
          name: 'Parent',
          children: [],
          styles: {},
          metadata: { componentName: 'Parent', isComponent: true },
        },
        {
          id: '2',
          type: 'Container',
          name: 'Child',
          children: [
            {
              id: '3',
              type: 'Container',
              name: 'Ref',
              children: [],
              styles: {},
              metadata: { componentName: 'Parent' },
            },
          ],
          styles: {},
          metadata: { componentName: 'Child', isComponent: true },
        },
      ];

      const componentProcessor = jest.fn(async (component) => {
        executionOrder.push(component.id);
        await new Promise((resolve) => setTimeout(resolve, 50));
        return `Processed ${component.name}`;
      });

      await processor.processComponents(components, componentProcessor);

      // Parent should be processed before Child
      expect(executionOrder.indexOf('1')).toBeLessThan(executionOrder.indexOf('2'));
    });
  });

  describe('mergeResults', () => {
    it('should merge successful results', () => {
      const results = [
        { taskId: '1', success: true, data: [1, 2], duration: 100 },
        { taskId: '2', success: true, data: [3, 4], duration: 150 },
        { taskId: '3', success: true, data: [5, 6], duration: 120 },
      ];

      const merged = processor.mergeResults(results, (data) => data.flat());

      expect(merged).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should ignore failed results', () => {
      const results = [
        { taskId: '1', success: true, data: [1, 2], duration: 100 },
        { taskId: '2', success: false, error: new Error('Failed'), duration: 50 },
        { taskId: '3', success: true, data: [3, 4], duration: 120 },
      ];

      const merged = processor.mergeResults(results, (data) => data.flat());

      expect(merged).toEqual([1, 2, 3, 4]);
    });

    it('should throw error when no successful results', () => {
      const results = [
        { taskId: '1', success: false, error: new Error('Failed'), duration: 50 },
        { taskId: '2', success: false, error: new Error('Failed'), duration: 50 },
      ];

      expect(() => {
        processor.mergeResults(results, (data) => data.flat());
      }).toThrow('No successful results to merge');
    });
  });

  describe('getStats', () => {
    it('should return execution statistics', async () => {
      const tasks: ProcessingTask<number>[] = [
        { id: '1', type: 'test', data: 1 },
        { id: '2', type: 'test', data: 2 },
        { id: '3', type: 'test', data: 3 },
      ];

      const taskProcessor = jest.fn(async (task) => {
        if (task.id === '2') {
          throw new Error('Failed');
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
        return task.data * 2;
      });

      await processor.executeParallel(tasks, taskProcessor);

      const stats = processor.getStats();

      expect(stats.totalTasks).toBe(3);
      expect(stats.successfulTasks).toBe(2);
      expect(stats.failedTasks).toBe(1);
      expect(stats.averageDuration).toBeGreaterThan(0);
      expect(stats.totalDuration).toBeGreaterThan(0);
    });

    it('should return zero stats initially', () => {
      const stats = processor.getStats();

      expect(stats.totalTasks).toBe(0);
      expect(stats.successfulTasks).toBe(0);
      expect(stats.failedTasks).toBe(0);
      expect(stats.averageDuration).toBe(0);
      expect(stats.totalDuration).toBe(0);
    });
  });

  describe('concurrency control', () => {
    it('should respect max concurrency limit', async () => {
      let activeTasks = 0;
      let maxActiveTasks = 0;

      const tasks: ProcessingTask<number>[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        type: 'test',
        data: i,
      }));

      const taskProcessor = jest.fn(async (task) => {
        activeTasks++;
        maxActiveTasks = Math.max(maxActiveTasks, activeTasks);
        await new Promise((resolve) => setTimeout(resolve, 50));
        activeTasks--;
        return task.data;
      });

      await processor.executeParallel(tasks, taskProcessor);

      expect(maxActiveTasks).toBeLessThanOrEqual(2); // maxConcurrency = 2
    });
  });
});
