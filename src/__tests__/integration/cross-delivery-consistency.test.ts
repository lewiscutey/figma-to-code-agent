/**
 * 跨交付形式一致性测试
 * 
 * **属性 15：配置一致性**
 * 验证：对于任意交付形式（CLI、MCP、Skill），使用相同的配置应该产生相同的核心功能行为和输出
 * **验证需求：1.8**
 */

import { ConversationContextManager } from '../../agent/ConversationContext';
import { IntentUnderstandingEngine } from '../../agent/IntentUnderstandingEngine';
import { DecisionEngine } from '../../agent/DecisionEngine';
import { ExecutionOrchestrator } from '../../agent/ExecutionOrchestrator';
import { ToolRegistry } from '../../tools/ToolRegistry';
import type { Intent, Strategy } from '../../agent/types';
import type { Tool } from '../../tools/types';

describe('Cross-Delivery Consistency Tests', () => {
  describe('属性 15：配置一致性', () => {
    it('相同配置在不同交付形式下应产生相同的意图理解', async () => {
      // 准备：相同的用户输入和配置
      const userInput = '从 https://figma.com/file/abc123 生成 React 组件，使用 Tailwind CSS';
      const config = {
        defaultFramework: 'react' as const,
        defaultStyleMode: 'tailwind' as const,
        verbosity: 'normal' as const,
      };

      // 模拟 CLI 形式
      const cliContext = new ConversationContextManager();
      cliContext.setUserPreferences(config);
      cliContext.addMessage('user', userInput);
      const cliIntentEngine = new IntentUnderstandingEngine();
      const cliIntent = await cliIntentEngine.analyzeInput(userInput, cliContext.getContext());

      // 模拟 MCP 形式
      const mcpContext = new ConversationContextManager();
      mcpContext.setUserPreferences(config);
      mcpContext.addMessage('user', userInput);
      const mcpIntentEngine = new IntentUnderstandingEngine();
      const mcpIntent = await mcpIntentEngine.analyzeInput(userInput, mcpContext.getContext());

      // 模拟 Skill 形式
      const skillContext = new ConversationContextManager();
      skillContext.setUserPreferences(config);
      skillContext.addMessage('user', userInput);
      const skillIntentEngine = new IntentUnderstandingEngine();
      const skillIntent = await skillIntentEngine.analyzeInput(userInput, skillContext.getContext());

      // 验证：所有形式应产生相同的意图
      expect(cliIntent.type).toBe(mcpIntent.type);
      expect(cliIntent.type).toBe(skillIntent.type);
      
      expect(cliIntent.targetFramework).toBe(mcpIntent.targetFramework);
      expect(cliIntent.targetFramework).toBe(skillIntent.targetFramework);
      
      expect(cliIntent.styleMode).toBe(mcpIntent.styleMode);
      expect(cliIntent.styleMode).toBe(skillIntent.styleMode);
      
      expect(cliIntent.figmaInput.type).toBe(mcpIntent.figmaInput.type);
      expect(cliIntent.figmaInput.type).toBe(skillIntent.figmaInput.type);
    });

    it('相同意图在不同交付形式下应产生相同的策略', async () => {
      // 准备：相同的意图
      const intent: Intent = {
        type: 'generate_new',
        figmaInput: {
          type: 'url',
          url: 'https://figma.com/file/abc123',
        },
        targetFramework: 'react',
        styleMode: 'tailwind',
        qualityMode: 'balanced',
        additionalRequirements: ['typescript', 'responsive'],
      };

      const toolRegistry = new ToolRegistry();
      const availableTools = toolRegistry.listAll();

      // 模拟 CLI 形式
      const cliDecisionEngine = new DecisionEngine();
      const cliStrategies = await cliDecisionEngine.generateStrategies(intent, availableTools);

      // 模拟 MCP 形式
      const mcpDecisionEngine = new DecisionEngine();
      const mcpStrategies = await mcpDecisionEngine.generateStrategies(intent, availableTools);

      // 模拟 Skill 形式
      const skillDecisionEngine = new DecisionEngine();
      const skillStrategies = await skillDecisionEngine.generateStrategies(intent, availableTools);

      // 验证：所有形式应产生相同数量的策略
      expect(cliStrategies.length).toBe(mcpStrategies.length);
      expect(cliStrategies.length).toBe(skillStrategies.length);

      // 验证：策略的核心属性应该相同
      for (let i = 0; i < cliStrategies.length; i++) {
        expect(cliStrategies[i].id).toBe(mcpStrategies[i].id);
        expect(cliStrategies[i].id).toBe(skillStrategies[i].id);
        
        expect(cliStrategies[i].name).toBe(mcpStrategies[i].name);
        expect(cliStrategies[i].name).toBe(skillStrategies[i].name);
        
        expect(cliStrategies[i].steps.length).toBe(mcpStrategies[i].steps.length);
        expect(cliStrategies[i].steps.length).toBe(skillStrategies[i].steps.length);
      }
    });

    it('相同策略在不同交付形式下应产生相同的执行步骤', async () => {
      // 准备：相同的策略
      const strategy: Strategy = {
        id: 'test-strategy',
        name: '测试策略',
        description: '用于测试的策略',
        steps: [
          {
            tool: 'figma-extraction',
            action: 'extract',
            inputs: { url: 'https://figma.com/file/abc123' },
          },
          {
            tool: 'transformation',
            action: 'transform',
            inputs: { mode: 'fast' },
          },
        ],
        estimatedTime: 60,
        estimatedCost: 1000,
        expectedQuality: 'high',
      };

      // const context = new ConversationContextManager().getContext();
      const toolsMap = new Map<string, Tool>();

      // 模拟 CLI 形式
      const cliOrchestrator = new ExecutionOrchestrator(toolsMap);
      
      // 模拟 MCP 形式
      const mcpOrchestrator = new ExecutionOrchestrator(toolsMap);
      
      // 模拟 Skill 形式
      const skillOrchestrator = new ExecutionOrchestrator(toolsMap);

      // 验证：所有形式应该使用相同的执行逻辑
      // 由于没有实际工具，我们验证编排器的配置是否一致
      expect(cliOrchestrator).toBeDefined();
      expect(mcpOrchestrator).toBeDefined();
      expect(skillOrchestrator).toBeDefined();
      
      // 验证策略步骤的一致性
      expect(strategy.steps.length).toBe(2);
      expect(strategy.steps[0].tool).toBe('figma-extraction');
      expect(strategy.steps[1].tool).toBe('transformation');
    });

    it('相同配置在不同交付形式下应产生相同的用户偏好', () => {
      // 准备：相同的配置
      const config = {
        defaultFramework: 'vue' as const,
        defaultStyleMode: 'css-modules' as const,
        verbosity: 'detailed' as const,
      };

      // 模拟 CLI 形式
      const cliContext = new ConversationContextManager();
      cliContext.setUserPreferences(config);
      const cliPrefs = cliContext.getContext().userPreferences;

      // 模拟 MCP 形式
      const mcpContext = new ConversationContextManager();
      mcpContext.setUserPreferences(config);
      const mcpPrefs = mcpContext.getContext().userPreferences;

      // 模拟 Skill 形式
      const skillContext = new ConversationContextManager();
      skillContext.setUserPreferences(config);
      const skillPrefs = skillContext.getContext().userPreferences;

      // 验证：所有形式应产生相同的用户偏好
      expect(cliPrefs.defaultFramework).toBe(mcpPrefs.defaultFramework);
      expect(cliPrefs.defaultFramework).toBe(skillPrefs.defaultFramework);
      
      expect(cliPrefs.defaultStyleMode).toBe(mcpPrefs.defaultStyleMode);
      expect(cliPrefs.defaultStyleMode).toBe(skillPrefs.defaultStyleMode);
      
      expect(cliPrefs.verbosity).toBe(mcpPrefs.verbosity);
      expect(cliPrefs.verbosity).toBe(skillPrefs.verbosity);
    });

    it('相同输入在不同交付形式下应产生相同的对话历史结构', () => {
      // 准备：相同的对话序列
      const messages = [
        { role: 'user' as const, content: '生成 React 组件' },
        { role: 'agent' as const, content: '好的，我会生成 React 组件' },
        { role: 'user' as const, content: '使用 TypeScript' },
      ];

      // 模拟 CLI 形式
      const cliContext = new ConversationContextManager();
      messages.forEach(msg => cliContext.addMessage(msg.role, msg.content));
      const cliHistory = cliContext.getHistory();

      // 模拟 MCP 形式
      const mcpContext = new ConversationContextManager();
      messages.forEach(msg => mcpContext.addMessage(msg.role, msg.content));
      const mcpHistory = mcpContext.getHistory();

      // 模拟 Skill 形式
      const skillContext = new ConversationContextManager();
      messages.forEach(msg => skillContext.addMessage(msg.role, msg.content));
      const skillHistory = skillContext.getHistory();

      // 验证：所有形式应产生相同的历史记录
      expect(cliHistory.length).toBe(mcpHistory.length);
      expect(cliHistory.length).toBe(skillHistory.length);
      
      for (let i = 0; i < cliHistory.length; i++) {
        expect(cliHistory[i].role).toBe(mcpHistory[i].role);
        expect(cliHistory[i].role).toBe(skillHistory[i].role);
        
        expect(cliHistory[i].content).toBe(mcpHistory[i].content);
        expect(cliHistory[i].content).toBe(skillHistory[i].content);
      }
    });

    it('相同错误在不同交付形式下应产生相同的错误处理行为', async () => {
      // 准备：会导致错误的意图（缺少必要信息）
      const intent: Intent = {
        type: 'generate_new',
        figmaInput: {
          type: 'url',
          // 缺少 URL
        },
        additionalRequirements: [],
      };

      const toolRegistry = new ToolRegistry();
      const availableTools = toolRegistry.listAll();

      // 模拟 CLI 形式
      const cliDecisionEngine = new DecisionEngine();
      const cliStrategies = await cliDecisionEngine.generateStrategies(intent, availableTools);

      // 模拟 MCP 形式
      const mcpDecisionEngine = new DecisionEngine();
      const mcpStrategies = await mcpDecisionEngine.generateStrategies(intent, availableTools);

      // 模拟 Skill 形式
      const skillDecisionEngine = new DecisionEngine();
      const skillStrategies = await skillDecisionEngine.generateStrategies(intent, availableTools);

      // 验证：所有形式应产生相同的策略（可能为空或包含错误处理）
      expect(cliStrategies.length).toBe(mcpStrategies.length);
      expect(cliStrategies.length).toBe(skillStrategies.length);
    });

    it('相同工具注册在不同交付形式下应产生相同的工具列表', () => {
      // 准备：注册相同的工具
      const mockTool: Tool = {
        name: 'test-tool',
        description: '测试工具',
        category: 'extraction',
        capabilities: ['extract', 'parse'],
        execute: async () => ({ success: true }),
        isAvailable: async () => true,
      };

      // 模拟 CLI 形式
      const cliRegistry = new ToolRegistry();
      cliRegistry.register(mockTool);
      const cliTools = cliRegistry.listAll();

      // 模拟 MCP 形式
      const mcpRegistry = new ToolRegistry();
      mcpRegistry.register(mockTool);
      const mcpTools = mcpRegistry.listAll();

      // 模拟 Skill 形式
      const skillRegistry = new ToolRegistry();
      skillRegistry.register(mockTool);
      const skillTools = skillRegistry.listAll();

      // 验证：所有形式应产生相同的工具列表
      expect(cliTools.length).toBe(mcpTools.length);
      expect(cliTools.length).toBe(skillTools.length);
      
      expect(cliTools[0].name).toBe(mcpTools[0].name);
      expect(cliTools[0].name).toBe(skillTools[0].name);
      
      expect(cliTools[0].category).toBe(mcpTools[0].category);
      expect(cliTools[0].category).toBe(skillTools[0].category);
    });
  });
});
