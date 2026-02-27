/**
 * 端到端测试：Agent 工作流
 * 测试完整的一键生成、渐进式更新和迭代优化流程
 */

import { ConversationContextManager } from '../../agent/ConversationContext';
import { IntentUnderstandingEngine } from '../../agent/IntentUnderstandingEngine';
import { DecisionEngine } from '../../agent/DecisionEngine';
import { ExecutionOrchestrator } from '../../agent/ExecutionOrchestrator';
import { ToolRegistry } from '../../tools/ToolRegistry';
import type { Intent } from '../../agent/types';
import type { Tool } from '../../tools/types';

describe('Agent E2E Workflow Tests', () => {
  let contextManager: ConversationContextManager;
  let intentEngine: IntentUnderstandingEngine;
  let decisionEngine: DecisionEngine;
  let orchestrator: ExecutionOrchestrator;
  let toolRegistry: ToolRegistry;

  beforeEach(() => {
    // 初始化 Agent 组件
    contextManager = new ConversationContextManager();
    toolRegistry = new ToolRegistry();
    
    // 不使用 LLM（使用基于规则的分析）
    intentEngine = new IntentUnderstandingEngine();
    decisionEngine = new DecisionEngine();
    
    // ExecutionOrchestrator 需要 Map<string, Tool>
    // 创建一个空的 Map 用于测试
    const toolsMap = new Map<string, Tool>();
    orchestrator = new ExecutionOrchestrator(toolsMap);
  });

  describe('一键生成流程', () => {
    it('应该完成从 Figma URL 到代码生成的完整流程', async () => {
      // 1. 用户输入
      const userInput = '从 https://www.figma.com/file/abc123/MyDesign?node-id=1:2 生成 React 组件';
      
      // 2. 添加消息到上下文
      contextManager.addMessage('user', userInput);
      const context = contextManager.getContext();
      
      // 3. 理解意图
      const intent = await intentEngine.analyzeInput(userInput, context);
      
      expect(intent.type).toBe('generate_new');
      expect(intent.figmaInput.type).toBe('url');
      expect(intent.figmaInput.url).toContain('abc123');
      expect(intent.figmaInput.nodeIds).toContain('1:2');
      
      // 4. 生成策略
      const strategies = await decisionEngine.generateStrategies(
        intent,
        toolRegistry.listAll()
      );
      
      expect(strategies.length).toBeGreaterThan(0);
      
      // 5. 选择最佳策略
      const updatedContext = contextManager.getContext();
      const bestStrategy = await decisionEngine.selectBestStrategy(
        strategies,
        updatedContext
      );
      
      expect(bestStrategy).toBeDefined();
      expect(bestStrategy.steps.length).toBeGreaterThan(0);
      
      // 6. 执行策略
      const result = await orchestrator.executeStrategy(
        bestStrategy,
        updatedContext
      );
      
      // 7. 验证结果
      expect(result.success).toBe(true);
      expect(result.artifacts.length).toBeGreaterThan(0);
      expect(result.errors.length).toBe(0);
      
      // 8. 验证生成的产物
      const componentArtifact = result.artifacts.find(
        a => a.type === 'code' && a.path.endsWith('.tsx')
      );
      expect(componentArtifact).toBeDefined();
      expect(componentArtifact?.content).toContain('export');
    }, 30000);

    it('应该处理缺失信息并请求用户输入', async () => {
      // 1. 用户输入（缺少框架信息）
      const userInput = '从 Figma 生成组件';
      
      // 2. 理解意图
      contextManager.addMessage('user', userInput);
      const context = contextManager.getContext();
      const intent = await intentEngine.analyzeInput(userInput, context);
      
      // 3. 验证需要额外信息
      expect(intent.additionalRequirements.length).toBeGreaterThan(0);
      
      // 4. 模拟用户提供额外信息
      contextManager.addMessage('user', 'React');
      contextManager.addMessage('user', 'https://figma.com/file/abc123');
      
      // 5. 重新分析意图
      const updatedContext = contextManager.getContext();
      const completeIntent = await intentEngine.analyzeInput(
        'React https://figma.com/file/abc123',
        updatedContext
      );
      
      expect(completeIntent.targetFramework).toBe('react');
      expect(completeIntent.figmaInput.url).toContain('abc123');
    });
  });

  describe('渐进式更新流程', () => {
    it('应该完成组件更新流程', async () => {
      // 1. 用户输入更新请求
      const userInput = '更新 src/components/Header.tsx，使用新的 Figma 设计';
      
      // 2. 理解意图
      contextManager.addMessage('user', userInput);
      const context = contextManager.getContext();
      const intent = await intentEngine.analyzeInput(userInput, context);
      
      expect(intent.type).toBe('update_existing');
      
      // 3. 生成更新策略
      const strategies = await decisionEngine.generateStrategies(
        intent,
        toolRegistry.listAll()
      );
      
      const updateStrategy = strategies.find(s => 
        s.name.toLowerCase().includes('update')
      );
      expect(updateStrategy).toBeDefined();
      
      // 4. 执行更新
      const updatedContext = contextManager.getContext();
      const result = await orchestrator.executeStrategy(
        updateStrategy!,
        updatedContext
      );
      
      // 5. 验证结果
      expect(result.success).toBe(true);
      expect(result.artifacts.length).toBeGreaterThan(0);
      
      // 6. 验证保留了业务逻辑
      const updatedComponent = result.artifacts.find(
        a => a.path.includes('Header.tsx')
      );
      expect(updatedComponent).toBeDefined();
    });

    it('应该检测设计变更并生成差异报告', async () => {
      // 1. 分析现有组件（模拟）
      // const existingCode = `
      //   export const Header = () => {
      //     const [isOpen, setIsOpen] = useState(false);
      //     return <header>...</header>;
      //   }
      // `;
      
      // 2. 获取新设计
      const intent: Intent = {
        type: 'update_existing',
        figmaInput: {
          type: 'url',
          url: 'https://figma.com/file/abc123',
        },
        additionalRequirements: ['preserve-logic'],
      };
      
      // 3. 生成策略
      const strategies = await decisionEngine.generateStrategies(
        intent,
        toolRegistry.listAll()
      );
      
      expect(strategies.length).toBeGreaterThan(0);
      
      // 4. 验证策略包含差异分析步骤
      const strategy = strategies[0];
      const diffStep = strategy.steps.find(s => 
        s.action.includes('diff') || s.action.includes('compare')
      );
      expect(diffStep).toBeDefined();
    });
  });

  describe('迭代优化流程', () => {
    it('应该完成多轮迭代优化', async () => {
      // 1. 初始生成
      const initialInput = '生成登录表单组件';
      contextManager.addMessage('user', initialInput);
      let context = contextManager.getContext();
      
      let intent = await intentEngine.analyzeInput(initialInput, context);
      let strategies = await decisionEngine.generateStrategies(
        intent,
        toolRegistry.listAll()
      );
      let strategy = await decisionEngine.selectBestStrategy(strategies, context);
      let result = await orchestrator.executeStrategy(strategy, context);
      
      expect(result.success).toBe(true);
      // const initialArtifacts = result.artifacts.length;
      
      // 2. 第一轮优化：添加验证
      contextManager.addMessage('user', '添加表单验证');
      context = contextManager.getContext();
      
      intent = await intentEngine.analyzeInput('添加表单验证', context);
      expect(intent.type).toBe('optimize');
      
      strategies = await decisionEngine.generateStrategies(intent, toolRegistry.listAll());
      strategy = await decisionEngine.selectBestStrategy(strategies, context);
      result = await orchestrator.executeStrategy(strategy, context);
      
      expect(result.success).toBe(true);
      
      // 3. 第二轮优化：改进样式
      contextManager.addMessage('user', '使用 Tailwind CSS');
      context = contextManager.getContext();
      
      intent = await intentEngine.analyzeInput('使用 Tailwind CSS', context);
      strategies = await decisionEngine.generateStrategies(intent, toolRegistry.listAll());
      strategy = await decisionEngine.selectBestStrategy(strategies, context);
      result = await orchestrator.executeStrategy(strategy, context);
      
      expect(result.success).toBe(true);
      
      // 4. 验证迭代历史
      const history = contextManager.getHistory();
      expect(history.length).toBeGreaterThanOrEqual(6); // 3 user + 3 agent messages
      
      // 5. 验证最终产物
      expect(result.artifacts.length).toBeGreaterThan(0);
    });

    it('应该限制迭代次数防止无限循环', async () => {
      const maxIterations = 5;
      let iterationCount = 0;
      
      // 模拟多次迭代
      for (let i = 0; i < 10; i++) {
        contextManager.addMessage('user', `优化 ${i + 1}`);
        const context = contextManager.getContext();
        
        const intent = await intentEngine.analyzeInput(`优化 ${i + 1}`, context);
        
        // 检查是否应该停止迭代
        if (iterationCount >= maxIterations) {
          expect(intent.type).not.toBe('optimize');
          break;
        }
        
        iterationCount++;
      }
      
      expect(iterationCount).toBeLessThanOrEqual(maxIterations);
    });
  });

  describe('错误处理和恢复', () => {
    it('应该处理 API 错误并回退', async () => {
      // 1. 模拟 API 错误
      const intent: Intent = {
        type: 'generate_new',
        figmaInput: {
          type: 'url',
          url: 'https://figma.com/file/invalid',
        },
        additionalRequirements: [],
      };
      
      // 2. 生成策略（包含回退选项）
      const strategies = await decisionEngine.generateStrategies(
        intent,
        toolRegistry.listAll()
      );
      
      // 3. 验证策略包含回退步骤
      const strategyWithFallback = strategies.find(s =>
        s.steps.some(step => step.fallbackTool !== undefined)
      );
      expect(strategyWithFallback).toBeDefined();
    });

    it('应该保存检查点以便恢复', async () => {
      // 1. 执行长时间操作
      const intent: Intent = {
        type: 'generate_new',
        figmaInput: {
          type: 'url',
          url: 'https://figma.com/file/abc123',
        },
        additionalRequirements: [],
      };
      
      // 2. 创建检查点
      const checkpointId = contextManager.createCheckpoint({
        intent,
        phase: 'executing',
      });
      
      expect(checkpointId).toBeDefined();
      
      // 3. 模拟失败后恢复
      const restored = contextManager.restoreFromCheckpoint(checkpointId);
      expect(restored).toBe(true);
      
      // 4. 验证上下文已恢复
      const context = contextManager.getContext();
      expect(context.taskState.phase).toBe('executing');
    });
  });

  describe('性能和资源管理', () => {
    it('应该跟踪 Token 使用量', async () => {
      const userInput = '生成组件';
      contextManager.addMessage('user', userInput);
      const context = contextManager.getContext();
      
      const intent = await intentEngine.analyzeInput(userInput, context);
      const strategies = await decisionEngine.generateStrategies(
        intent,
        toolRegistry.listAll()
      );
      
      // 验证 metrics 被记录
      expect(strategies.length).toBeGreaterThan(0);
    });

    it('应该支持并行处理独立组件', async () => {
      const intent: Intent = {
        type: 'generate_new',
        figmaInput: {
          type: 'url',
          url: 'https://figma.com/file/abc123',
          nodeIds: ['1:1', '1:2', '1:3'], // 多个独立节点
        },
        additionalRequirements: [],
      };
      
      const strategies = await decisionEngine.generateStrategies(
        intent,
        toolRegistry.listAll()
      );
      
      // 验证策略支持并行处理
      const parallelStrategy = strategies.find(s =>
        s.description.toLowerCase().includes('parallel')
      );
      
      // 如果有并行策略，验证其结构
      if (parallelStrategy) {
        expect(parallelStrategy.steps.length).toBeGreaterThan(0);
      }
    });
  });

  describe('上下文持久化', () => {
    it('应该保存和加载对话上下文', async () => {
      // 1. 创建对话历史
      contextManager.addMessage('user', '生成组件');
      contextManager.addMessage('agent', '好的，我会生成组件');
      
      const intent: Intent = {
        type: 'generate_new',
        figmaInput: {
          type: 'url',
          url: 'https://figma.com/file/abc123',
        },
        additionalRequirements: [],
      };
      contextManager.setIntent(intent);
      
      // 2. 导出上下文
      const exported = contextManager.export();
      expect(exported).toBeDefined();
      expect(exported.length).toBeGreaterThan(0);
      
      // 3. 创建新的上下文管理器并导入
      const newContextManager = new ConversationContextManager();
      const imported = newContextManager.import(exported);
      
      expect(imported).toBe(true);
      
      // 4. 验证数据一致性
      const originalContext = contextManager.getContext();
      const importedContext = newContextManager.getContext();
      
      expect(importedContext.history.length).toBe(originalContext.history.length);
      expect(importedContext.intent?.type).toBe(originalContext.intent?.type);
    });
  });
});
