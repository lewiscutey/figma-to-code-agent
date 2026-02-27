/**
 * 属性测试：工具调用的回退一致性
 * 
 * **属性 3：工具调用的回退一致性**
 * 验证：对于任意工具调用失败的情况，如果存在备用工具或策略，
 * 系统应该自动尝试备用方案，而不是直接失败
 * 
 * **验证需求：14.1, 14.2, 14.3, 5.5**
 * 
 * **属性 12：检查点恢复的等价性**
 * 验证：对于任意执行状态，保存检查点后中断，然后从检查点恢复，
 * 应该能够继续执行并产生与不中断情况下相同的最终结果
 * 
 * **验证需求：3.8, 14.5**
 */

import { ExecutionOrchestrator } from '../../agent/ExecutionOrchestrator';
import { ConversationContextManager } from '../../agent/ConversationContext';
import type { Strategy } from '../../agent/types';
import type { Tool } from '../../tools/types';

describe('ExecutionOrchestrator Property Tests', () => {
  describe('属性 3：工具调用的回退一致性', () => {
    it('应该在工具不存在时尝试回退工具', async () => {
      const toolsMap = new Map<string, Tool>();
      
      // 只注册回退工具
      const fallbackTool: Tool = {
        name: 'fallback-tool',
        description: 'Fallback tool',
        category: 'extraction',
        capabilities: ['extract'],
        execute: async () => ({ success: true, data: 'fallback result' }),
        isAvailable: async () => true,
      };
      
      toolsMap.set('fallback-tool', fallbackTool);
      
      const orchestrator = new ExecutionOrchestrator(toolsMap);
      const contextManager = new ConversationContextManager();
      
      const strategy: Strategy = {
        id: 'test-strategy',
        name: '测试策略',
        description: '测试回退',
        steps: [
          {
            tool: 'non-existent-tool',
            action: 'test',
            inputs: {},
            fallbackTool: 'fallback-tool',
          },
        ],
        estimatedTime: 30,
        estimatedCost: 100,
        expectedQuality: 'high',
      };
      
      const result = await orchestrator.executeStrategy(strategy, contextManager.getContext());
      
      // 验证：应该使用回退工具成功执行
      expect(result.success).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('应该在工具不可用时尝试回退工具', async () => {
      const toolsMap = new Map<string, Tool>();
      
      // 注册不可用的主工具
      const primaryTool: Tool = {
        name: 'primary-tool',
        description: 'Primary tool',
        category: 'extraction',
        capabilities: ['extract'],
        execute: async () => ({ success: false }),
        isAvailable: async () => false, // 不可用
      };
      
      // 注册可用的回退工具
      const fallbackTool: Tool = {
        name: 'fallback-tool',
        description: 'Fallback tool',
        category: 'extraction',
        capabilities: ['extract'],
        execute: async () => ({ success: true, data: 'fallback result' }),
        isAvailable: async () => true,
      };
      
      toolsMap.set('primary-tool', primaryTool);
      toolsMap.set('fallback-tool', fallbackTool);
      
      const orchestrator = new ExecutionOrchestrator(toolsMap);
      const contextManager = new ConversationContextManager();
      
      const strategy: Strategy = {
        id: 'test-strategy',
        name: '测试策略',
        description: '测试回退',
        steps: [
          {
            tool: 'primary-tool',
            action: 'test',
            inputs: {},
            fallbackTool: 'fallback-tool',
          },
        ],
        estimatedTime: 30,
        estimatedCost: 100,
        expectedQuality: 'high',
      };
      
      const result = await orchestrator.executeStrategy(strategy, contextManager.getContext());
      
      // 验证：应该使用回退工具
      expect(result.success).toBe(true);
    });

    it('应该在工具执行失败时尝试回退工具', async () => {
      const toolsMap = new Map<string, Tool>();
      
      // 注册会失败的主工具
      const primaryTool: Tool = {
        name: 'primary-tool',
        description: 'Primary tool',
        category: 'extraction',
        capabilities: ['extract'],
        execute: async () => {
          throw new Error('Primary tool failed');
        },
        isAvailable: async () => true,
      };
      
      // 注册成功的回退工具
      const fallbackTool: Tool = {
        name: 'fallback-tool',
        description: 'Fallback tool',
        category: 'extraction',
        capabilities: ['extract'],
        execute: async () => ({ success: true, data: 'fallback result' }),
        isAvailable: async () => true,
      };
      
      toolsMap.set('primary-tool', primaryTool);
      toolsMap.set('fallback-tool', fallbackTool);
      
      const orchestrator = new ExecutionOrchestrator(toolsMap);
      const contextManager = new ConversationContextManager();
      
      const strategy: Strategy = {
        id: 'test-strategy',
        name: '测试策略',
        description: '测试回退',
        steps: [
          {
            tool: 'primary-tool',
            action: 'test',
            inputs: {},
            fallbackTool: 'fallback-tool',
          },
        ],
        estimatedTime: 30,
        estimatedCost: 100,
        expectedQuality: 'high',
      };
      
      const result = await orchestrator.executeStrategy(strategy, contextManager.getContext());
      
      // 验证：应该使用回退工具成功
      expect(result.success).toBe(true);
    });

    it('应该在没有回退工具时报告错误', async () => {
      const toolsMap = new Map<string, Tool>();
      
      const orchestrator = new ExecutionOrchestrator(toolsMap);
      const contextManager = new ConversationContextManager();
      
      const strategy: Strategy = {
        id: 'test-strategy',
        name: '测试策略',
        description: '测试无回退',
        steps: [
          {
            tool: 'non-existent-tool',
            action: 'test',
            inputs: {},
            // 没有 fallbackTool
          },
        ],
        estimatedTime: 30,
        estimatedCost: 100,
        expectedQuality: 'high',
      };
      
      const result = await orchestrator.executeStrategy(strategy, contextManager.getContext());
      
      // 验证：应该失败并报告错误
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('属性 12：检查点恢复的等价性', () => {
    it('应该在执行过程中保存检查点', async () => {
      const toolsMap = new Map<string, Tool>();
      
      const tool: Tool = {
        name: 'test-tool',
        description: 'Test tool',
        category: 'extraction',
        capabilities: ['extract'],
        execute: async () => ({ success: true, data: 'result' }),
        isAvailable: async () => true,
      };
      
      toolsMap.set('test-tool', tool);
      
      const orchestrator = new ExecutionOrchestrator(toolsMap);
      const contextManager = new ConversationContextManager();
      
      const strategy: Strategy = {
        id: 'test-strategy',
        name: '测试策略',
        description: '测试检查点',
        steps: [
          {
            tool: 'test-tool',
            action: 'test',
            inputs: {},
          },
        ],
        estimatedTime: 30,
        estimatedCost: 100,
        expectedQuality: 'high',
      };
      
      await orchestrator.executeStrategy(strategy, contextManager.getContext());
      
      // 验证：应该创建了检查点
      const context = contextManager.getContext();
      expect(context.taskState.checkpoints.length).toBeGreaterThan(0);
    });

    it('应该能够从检查点恢复执行状态', async () => {
      const contextManager = new ConversationContextManager();
      
      // 创建初始状态
      const checkpointData = {
        phase: 'executing',
        step: 2,
        data: { test: 'value' },
      };
      
      const checkpointId = contextManager.createCheckpoint(checkpointData);
      
      // 修改状态
      contextManager.getContext().taskState.phase = 'completed';
      
      // 恢复检查点
      const toolsMap = new Map<string, Tool>();
      const orchestrator = new ExecutionOrchestrator(toolsMap);
      const restored = await orchestrator.restoreFromCheckpoint(
        contextManager.getContext(),
        checkpointId
      );
      
      // 验证：应该恢复到检查点状态
      expect(restored).toBe(true);
      expect(contextManager.getContext().taskState.phase).toBe('executing');
    });

    it('应该在多个步骤中保存多个检查点', async () => {
      const toolsMap = new Map<string, Tool>();
      
      const tool: Tool = {
        name: 'test-tool',
        description: 'Test tool',
        category: 'extraction',
        capabilities: ['extract'],
        execute: async () => ({ success: true, data: 'result' }),
        isAvailable: async () => true,
      };
      
      toolsMap.set('test-tool', tool);
      
      const orchestrator = new ExecutionOrchestrator(toolsMap);
      const contextManager = new ConversationContextManager();
      
      const strategy: Strategy = {
        id: 'test-strategy',
        name: '测试策略',
        description: '测试多检查点',
        steps: [
          {
            tool: 'test-tool',
            action: 'step1',
            inputs: {},
          },
          {
            tool: 'test-tool',
            action: 'step2',
            inputs: {},
          },
          {
            tool: 'test-tool',
            action: 'step3',
            inputs: {},
          },
        ],
        estimatedTime: 90,
        estimatedCost: 300,
        expectedQuality: 'high',
      };
      
      await orchestrator.executeStrategy(strategy, contextManager.getContext());
      
      // 验证：应该为每个步骤创建检查点
      const context = contextManager.getContext();
      expect(context.taskState.checkpoints.length).toBeGreaterThanOrEqual(strategy.steps.length);
    });

    it('应该在检查点中保存执行数据', async () => {
      const contextManager = new ConversationContextManager();
      
      const checkpointData = {
        phase: 'executing',
        strategyId: 'test-strategy',
        step: 1,
        result: { data: 'test' },
      };
      
      const checkpointId = contextManager.createCheckpoint(checkpointData);
      
      // 验证：检查点应该包含数据
      const context = contextManager.getContext();
      const checkpoint = context.taskState.checkpoints.find(cp => cp.id === checkpointId);
      
      expect(checkpoint).toBeDefined();
      expect(checkpoint?.data).toEqual(checkpointData);
    });
  });
});
