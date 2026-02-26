import { ExecutionOrchestrator } from '../../agent/ExecutionOrchestrator';
import type { Tool } from '../../agent/DecisionEngine';
import type { Strategy, ConversationContext } from '../../agent/types';

describe('ExecutionOrchestrator', () => {
  let orchestrator: ExecutionOrchestrator;
  let mockTools: Map<string, Tool>;
  let mockContext: ConversationContext;

  beforeEach(() => {
    mockTools = new Map();
    orchestrator = new ExecutionOrchestrator(mockTools);

    mockContext = {
      sessionId: 'test',
      intent: null,
      history: [],
      taskState: {
        phase: 'planning',
        currentStep: 'test',
        progress: 0,
        checkpoints: [],
      },
      userPreferences: {
        language: 'zh',
        verbosity: 'normal',
        autoApprove: false,
      },
      generatedArtifacts: [],
    };
  });

  describe('Tool Invocation', () => {
    it('should invoke tool successfully', async () => {
      const mockTool: Tool = {
        name: 'test-tool',
        description: 'Test tool',
        category: 'generation',
        capabilities: ['test'],
        isAvailable: async () => true,
        execute: async (inputs) => ({ result: 'success', inputs }),
      };

      const result = await orchestrator.invokeTool(mockTool, { param: 'value' });

      expect(result.success).toBe(true);
      expect(result.data.result).toBe('success');
      expect(result.metadata.toolName).toBe('test-tool');
      expect(result.metadata.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle tool execution failure', async () => {
      const mockTool: Tool = {
        name: 'failing-tool',
        description: 'Failing tool',
        category: 'generation',
        capabilities: ['test'],
        isAvailable: async () => true,
        execute: async () => {
          throw new Error('Tool failed');
        },
      };

      const result = await orchestrator.invokeTool(mockTool, {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Tool failed');
    });

    it('should measure execution duration', async () => {
      const mockTool: Tool = {
        name: 'slow-tool',
        description: 'Slow tool',
        category: 'generation',
        capabilities: ['test'],
        isAvailable: async () => true,
        execute: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return { result: 'done' };
        },
      };

      const result = await orchestrator.invokeTool(mockTool, {});

      expect(result.success).toBe(true);
      expect(result.metadata.duration).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Tool Failure Handling', () => {
    it('should use fallback tool when primary fails', async () => {
      const primaryTool: Tool = {
        name: 'primary',
        description: 'Primary tool',
        category: 'generation',
        capabilities: ['test'],
        isAvailable: async () => true,
        execute: async () => {
          throw new Error('Primary failed');
        },
      };

      const fallbackTool: Tool = {
        name: 'fallback',
        description: 'Fallback tool',
        category: 'generation',
        capabilities: ['test'],
        isAvailable: async () => true,
        execute: async () => ({ result: 'fallback success' }),
      };

      const result = await orchestrator.handleToolFailure(
        primaryTool,
        new Error('Primary failed'),
        fallbackTool
      );

      expect(result.success).toBe(true);
      expect(result.data.result).toBe('fallback success');
      expect(result.metadata.toolName).toBe('fallback');
    });

    it('should return error when no fallback available', async () => {
      const primaryTool: Tool = {
        name: 'primary',
        description: 'Primary tool',
        category: 'generation',
        capabilities: ['test'],
        isAvailable: async () => true,
        execute: async () => {
          throw new Error('Primary failed');
        },
      };

      const result = await orchestrator.handleToolFailure(
        primaryTool,
        new Error('Primary failed')
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Primary failed');
    });

    it('should handle fallback tool failure', async () => {
      const primaryTool: Tool = {
        name: 'primary',
        description: 'Primary tool',
        category: 'generation',
        capabilities: ['test'],
        isAvailable: async () => true,
        execute: async () => {
          throw new Error('Primary failed');
        },
      };

      const fallbackTool: Tool = {
        name: 'fallback',
        description: 'Fallback tool',
        category: 'generation',
        capabilities: ['test'],
        isAvailable: async () => true,
        execute: async () => {
          throw new Error('Fallback also failed');
        },
      };

      const result = await orchestrator.handleToolFailure(
        primaryTool,
        new Error('Primary failed'),
        fallbackTool
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Fallback also failed');
    });
  });

  describe('Strategy Execution', () => {
    it('should execute simple strategy successfully', async () => {
      const mockTool: Tool = {
        name: 'test-tool',
        description: 'Test tool',
        category: 'generation',
        capabilities: ['test'],
        isAvailable: async () => true,
        execute: async () => ({
          files: [
            { path: 'test.ts', content: 'export const test = 1;' },
          ],
        }),
      };

      mockTools.set('test-tool', mockTool);

      const strategy: Strategy = {
        id: 'test-strategy',
        name: 'Test Strategy',
        description: 'Test',
        steps: [
          {
            tool: 'test-tool',
            action: 'generate',
            inputs: {},
          },
        ],
        estimatedTime: 30,
        estimatedCost: 1000,
        expectedQuality: 'high',
      };

      const result = await orchestrator.executeStrategy(strategy, mockContext);

      expect(result.success).toBe(true);
      expect(result.artifacts.length).toBe(1);
      expect(result.artifacts[0].path).toBe('test.ts');
      expect(result.errors.length).toBe(0);
      expect(result.metrics.toolsInvoked).toContain('test-tool');
    });

    it('should update progress during execution', async () => {
      const mockTool: Tool = {
        name: 'test-tool',
        description: 'Test tool',
        category: 'generation',
        capabilities: ['test'],
        isAvailable: async () => true,
        execute: async () => ({ result: 'done' }),
      };

      mockTools.set('test-tool', mockTool);

      const strategy: Strategy = {
        id: 'test-strategy',
        name: 'Test Strategy',
        description: 'Test',
        steps: [
          { tool: 'test-tool', action: 'step1', inputs: {} },
          { tool: 'test-tool', action: 'step2', inputs: {} },
        ],
        estimatedTime: 60,
        estimatedCost: 2000,
        expectedQuality: 'high',
      };

      await orchestrator.executeStrategy(strategy, mockContext);

      expect(mockContext.taskState.progress).toBe(100);
      expect(mockContext.taskState.phase).toBe('completed');
    });

    it('should create checkpoints during execution', async () => {
      const mockTool: Tool = {
        name: 'test-tool',
        description: 'Test tool',
        category: 'generation',
        capabilities: ['test'],
        isAvailable: async () => true,
        execute: async () => ({ result: 'done' }),
      };

      mockTools.set('test-tool', mockTool);

      const strategy: Strategy = {
        id: 'test-strategy',
        name: 'Test Strategy',
        description: 'Test',
        steps: [
          { tool: 'test-tool', action: 'generate', inputs: {} },
        ],
        estimatedTime: 30,
        estimatedCost: 1000,
        expectedQuality: 'high',
      };

      await orchestrator.executeStrategy(strategy, mockContext);

      expect(mockContext.taskState.checkpoints.length).toBeGreaterThan(0);
      expect(mockContext.taskState.checkpoints[0].id).toBe('strategy_start');
    });

    it('should handle tool not found', async () => {
      const strategy: Strategy = {
        id: 'test-strategy',
        name: 'Test Strategy',
        description: 'Test',
        steps: [
          { tool: 'non-existent-tool', action: 'generate', inputs: {} },
        ],
        estimatedTime: 30,
        estimatedCost: 1000,
        expectedQuality: 'high',
      };

      const result = await orchestrator.executeStrategy(strategy, mockContext);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].type).toBe('tool_execution_failed');
    });

    it('should use fallback tool when primary is unavailable', async () => {
      const primaryTool: Tool = {
        name: 'primary-tool',
        description: 'Primary tool',
        category: 'generation',
        capabilities: ['test'],
        isAvailable: async () => false,
        execute: async () => ({ result: 'primary' }),
      };

      const fallbackTool: Tool = {
        name: 'fallback-tool',
        description: 'Fallback tool',
        category: 'generation',
        capabilities: ['test'],
        isAvailable: async () => true,
        execute: async () => ({
          files: [{ path: 'fallback.ts', content: 'fallback' }],
        }),
      };

      mockTools.set('primary-tool', primaryTool);
      mockTools.set('fallback-tool', fallbackTool);

      const strategy: Strategy = {
        id: 'test-strategy',
        name: 'Test Strategy',
        description: 'Test',
        steps: [
          {
            tool: 'primary-tool',
            action: 'generate',
            inputs: {},
            fallbackTool: 'fallback-tool',
          },
        ],
        estimatedTime: 30,
        estimatedCost: 1000,
        expectedQuality: 'high',
      };

      const result = await orchestrator.executeStrategy(strategy, mockContext);

      expect(result.success).toBe(true);
      expect(result.metrics.toolsInvoked).toContain('fallback-tool');
    });

    it('should stop execution on unrecoverable error', async () => {
      const tool1: Tool = {
        name: 'tool1',
        description: 'Tool 1',
        category: 'generation',
        capabilities: ['test'],
        isAvailable: async () => true,
        execute: async () => {
          throw new Error('Unrecoverable error');
        },
      };

      const tool2: Tool = {
        name: 'tool2',
        description: 'Tool 2',
        category: 'generation',
        capabilities: ['test'],
        isAvailable: async () => true,
        execute: async () => ({ result: 'should not execute' }),
      };

      mockTools.set('tool1', tool1);
      mockTools.set('tool2', tool2);

      const strategy: Strategy = {
        id: 'test-strategy',
        name: 'Test Strategy',
        description: 'Test',
        steps: [
          { tool: 'tool1', action: 'step1', inputs: {} },
          { tool: 'tool2', action: 'step2', inputs: {} },
        ],
        estimatedTime: 60,
        estimatedCost: 2000,
        expectedQuality: 'high',
      };

      const result = await orchestrator.executeStrategy(strategy, mockContext);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.metrics.toolsInvoked).not.toContain('tool2');
    });
  });

  describe('Execution Metrics', () => {
    it('should track execution metrics', async () => {
      const mockTool: Tool = {
        name: 'test-tool',
        description: 'Test tool',
        category: 'generation',
        capabilities: ['test'],
        isAvailable: async () => true,
        execute: async () => ({ result: 'done' }),
      };

      mockTools.set('test-tool', mockTool);

      const strategy: Strategy = {
        id: 'test-strategy',
        name: 'Test Strategy',
        description: 'Test',
        steps: [
          { tool: 'test-tool', action: 'step1', inputs: {} },
          { tool: 'test-tool', action: 'step2', inputs: {} },
        ],
        estimatedTime: 60,
        estimatedCost: 2000,
        expectedQuality: 'high',
      };

      const result = await orchestrator.executeStrategy(strategy, mockContext);

      expect(result.metrics.totalDuration).toBeGreaterThanOrEqual(0);
      expect(result.metrics.apiCalls).toBe(2);
      expect(result.metrics.toolsInvoked.length).toBe(2);
    });

    it('should reset metrics', () => {
      orchestrator.resetMetrics();
      // Metrics should be reset (tested indirectly through next execution)
    });
  });

  describe('Result Analysis', () => {
    it('should return complete when successful', async () => {
      const mockTool: Tool = {
        name: 'test-tool',
        description: 'Test tool',
        category: 'generation',
        capabilities: ['test'],
        isAvailable: async () => true,
        execute: async () => ({
          files: [{ path: 'test.ts', content: 'test' }],
        }),
      };

      mockTools.set('test-tool', mockTool);

      const strategy: Strategy = {
        id: 'test-strategy',
        name: 'Test Strategy',
        description: 'Test',
        steps: [{ tool: 'test-tool', action: 'generate', inputs: {} }],
        estimatedTime: 30,
        estimatedCost: 1000,
        expectedQuality: 'high',
      };

      const result = await orchestrator.executeStrategy(strategy, mockContext);

      expect(result.nextAction).toBe('complete');
    });

    it('should return ask_user when no artifacts generated', async () => {
      const mockTool: Tool = {
        name: 'test-tool',
        description: 'Test tool',
        category: 'generation',
        capabilities: ['test'],
        isAvailable: async () => true,
        execute: async () => ({ result: 'done' }), // No files
      };

      mockTools.set('test-tool', mockTool);

      const strategy: Strategy = {
        id: 'test-strategy',
        name: 'Test Strategy',
        description: 'Test',
        steps: [{ tool: 'test-tool', action: 'generate', inputs: {} }],
        estimatedTime: 30,
        estimatedCost: 1000,
        expectedQuality: 'high',
      };

      const result = await orchestrator.executeStrategy(strategy, mockContext);

      expect(result.nextAction).toBe('ask_user');
    });

    it('should return ask_user in detailed verbosity mode', async () => {
      mockContext.userPreferences.verbosity = 'detailed';

      const mockTool: Tool = {
        name: 'test-tool',
        description: 'Test tool',
        category: 'generation',
        capabilities: ['test'],
        isAvailable: async () => true,
        execute: async () => ({
          files: [{ path: 'test.ts', content: 'test' }],
        }),
      };

      mockTools.set('test-tool', mockTool);

      const strategy: Strategy = {
        id: 'test-strategy',
        name: 'Test Strategy',
        description: 'Test',
        steps: [{ tool: 'test-tool', action: 'generate', inputs: {} }],
        estimatedTime: 30,
        estimatedCost: 1000,
        expectedQuality: 'high',
      };

      const result = await orchestrator.executeStrategy(strategy, mockContext);

      expect(result.nextAction).toBe('ask_user');
    });
  });

  describe('Checkpoint Management', () => {
    it('should restore from checkpoint', async () => {
      // Create a checkpoint
      mockContext.taskState.checkpoints.push({
        id: 'test-checkpoint',
        timestamp: Date.now(),
        phase: 'executing',
        data: { step: 1 },
      });

      const restored = await orchestrator.restoreFromCheckpoint(
        mockContext,
        'test-checkpoint'
      );

      expect(restored).toBe(true);
      expect(mockContext.taskState.phase).toBe('executing');
    });

    it('should return false for non-existent checkpoint', async () => {
      const restored = await orchestrator.restoreFromCheckpoint(
        mockContext,
        'non-existent'
      );

      expect(restored).toBe(false);
    });
  });
});
