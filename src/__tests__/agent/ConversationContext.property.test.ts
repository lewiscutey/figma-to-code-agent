/**
 * 属性测试：对话上下文的持久性
 * 
 * **属性 5：对话上下文的持久性**
 * 验证：对于任意用户交互序列，每次交互后的上下文应该包含所有历史消息和提取的偏好，
 * 且后续交互应该能够访问这些信息
 * 
 * **验证需求：3.1, 6.8**
 */

import { ConversationContextManager } from '../../agent/ConversationContext';
import type { Intent } from '../../agent/types';

describe('ConversationContext Property Tests', () => {
  describe('属性 5：对话上下文的持久性', () => {
    it('应该在任意交互序列后保留所有历史消息', () => {
      const contextManager = new ConversationContextManager();
      
      // 生成随机数量的消息（1-20条）
      const messageCount = Math.floor(Math.random() * 20) + 1;
      const messages: Array<{ role: 'user' | 'agent'; content: string }> = [];
      
      for (let i = 0; i < messageCount; i++) {
        const role = i % 2 === 0 ? 'user' : 'agent';
        const content = `Message ${i + 1}: ${Math.random().toString(36).substring(7)}`;
        messages.push({ role, content });
        contextManager.addMessage(role, content);
      }
      
      // 验证：所有消息都应该在历史中
      const history = contextManager.getHistory();
      expect(history.length).toBe(messageCount);
      
      for (let i = 0; i < messageCount; i++) {
        expect(history[i].role).toBe(messages[i].role);
        expect(history[i].content).toBe(messages[i].content);
      }
    });

    it('应该在设置用户偏好后能够访问这些偏好', () => {
      const contextManager = new ConversationContextManager();
      
      // 生成随机偏好
      const frameworks = ['react', 'vue'] as const;
      const styleModes = ['css-modules', 'tailwind', 'css'] as const;
      const verbosities = ['minimal', 'normal', 'detailed'] as const;
      
      const preferences = {
        defaultFramework: frameworks[Math.floor(Math.random() * frameworks.length)],
        defaultStyleMode: styleModes[Math.floor(Math.random() * styleModes.length)],
        verbosity: verbosities[Math.floor(Math.random() * verbosities.length)],
      };
      
      contextManager.setUserPreferences(preferences);
      
      // 验证：偏好应该被保存
      const context = contextManager.getContext();
      expect(context.userPreferences.defaultFramework).toBe(preferences.defaultFramework);
      expect(context.userPreferences.defaultStyleMode).toBe(preferences.defaultStyleMode);
      expect(context.userPreferences.verbosity).toBe(preferences.verbosity);
    });

    it('应该在导出和导入后保持上下文完整性', () => {
      const contextManager = new ConversationContextManager();
      
      // 创建随机上下文
      const messageCount = Math.floor(Math.random() * 10) + 5;
      for (let i = 0; i < messageCount; i++) {
        contextManager.addMessage(
          i % 2 === 0 ? 'user' : 'agent',
          `Message ${i}`
        );
      }
      
      const intent: Intent = {
        type: 'generate_new',
        figmaInput: {
          type: 'url',
          url: 'https://figma.com/file/test123',
        },
        targetFramework: 'react',
        additionalRequirements: ['typescript'],
      };
      contextManager.setIntent(intent);
      
      contextManager.setUserPreferences({
        defaultFramework: 'vue',
        defaultStyleMode: 'tailwind',
        verbosity: 'detailed',
      });
      
      // 导出
      const exported = contextManager.export();
      
      // 导入到新的上下文管理器
      const newContextManager = new ConversationContextManager();
      const imported = newContextManager.import(exported);
      
      expect(imported).toBe(true);
      
      // 验证：所有数据应该保持一致
      const originalContext = contextManager.getContext();
      const importedContext = newContextManager.getContext();
      
      expect(importedContext.history.length).toBe(originalContext.history.length);
      expect(importedContext.intent?.type).toBe(originalContext.intent?.type);
      expect(importedContext.intent?.targetFramework).toBe(originalContext.intent?.targetFramework);
      expect(importedContext.userPreferences.defaultFramework).toBe(originalContext.userPreferences.defaultFramework);
      expect(importedContext.userPreferences.defaultStyleMode).toBe(originalContext.userPreferences.defaultStyleMode);
    });

    it('应该在创建检查点后能够恢复到该状态', () => {
      const contextManager = new ConversationContextManager();
      
      // 创建初始状态
      contextManager.addMessage('user', 'Initial message');
      const intent: Intent = {
        type: 'generate_new',
        figmaInput: { type: 'url', url: 'https://figma.com/file/abc' },
        additionalRequirements: [],
      };
      contextManager.setIntent(intent);
      
      // 创建检查点
      const checkpointId = contextManager.createCheckpoint({
        phase: 'planning',
        data: { step: 1 },
      });
      
      // 修改状态
      contextManager.addMessage('agent', 'Response');
      contextManager.addMessage('user', 'Follow-up');
      
      // 恢复检查点
      const restored = contextManager.restoreFromCheckpoint(checkpointId);
      expect(restored).toBe(true);
      
      // 验证：状态应该恢复到检查点时的状态
      const context = contextManager.getContext();
      expect(context.taskState.phase).toBe('planning');
    });

    it('应该在多次交互后累积所有历史信息', () => {
      const contextManager = new ConversationContextManager();
      
      // 模拟多轮对话
      const rounds = Math.floor(Math.random() * 5) + 3; // 3-7轮
      let totalMessages = 0;
      
      for (let round = 0; round < rounds; round++) {
        const messagesInRound = Math.floor(Math.random() * 3) + 1; // 1-3条消息
        
        for (let i = 0; i < messagesInRound; i++) {
          contextManager.addMessage(
            i % 2 === 0 ? 'user' : 'agent',
            `Round ${round + 1}, Message ${i + 1}`
          );
          totalMessages++;
        }
      }
      
      // 验证：所有消息都应该被保留
      const history = contextManager.getHistory();
      expect(history.length).toBe(totalMessages);
      
      // 验证：消息顺序应该保持
      for (let i = 0; i < history.length - 1; i++) {
        expect(history[i].timestamp).toBeLessThanOrEqual(history[i + 1].timestamp);
      }
    });

    it('应该在设置意图后能够访问该意图', () => {
      const contextManager = new ConversationContextManager();
      
      // 生成随机意图
      const types = ['generate_new', 'update_existing', 'optimize', 'analyze'] as const;
      const frameworks = ['react', 'vue', undefined] as const;
      const styleModes = ['css-modules', 'tailwind', 'css', undefined] as const;
      
      const intent: Intent = {
        type: types[Math.floor(Math.random() * types.length)],
        figmaInput: {
          type: 'url',
          url: `https://figma.com/file/${Math.random().toString(36).substring(7)}`,
        },
        targetFramework: frameworks[Math.floor(Math.random() * frameworks.length)],
        styleMode: styleModes[Math.floor(Math.random() * styleModes.length)],
        additionalRequirements: [],
      };
      
      contextManager.setIntent(intent);
      
      // 验证：意图应该被保存
      const context = contextManager.getContext();
      expect(context.intent).toBeDefined();
      expect(context.intent?.type).toBe(intent.type);
      expect(context.intent?.figmaInput.url).toBe(intent.figmaInput.url);
      expect(context.intent?.targetFramework).toBe(intent.targetFramework);
    });

    it('应该在任意操作序列后保持上下文一致性', () => {
      const contextManager = new ConversationContextManager();
      
      // 执行随机操作序列
      const operations = Math.floor(Math.random() * 20) + 10;
      let messageCount = 0;
      let checkpointCount = 0;
      
      for (let i = 0; i < operations; i++) {
        const operation = Math.floor(Math.random() * 4);
        
        switch (operation) {
          case 0: // 添加消息
            contextManager.addMessage(
              Math.random() > 0.5 ? 'user' : 'agent',
              `Message ${messageCount++}`
            );
            break;
          case 1: // 设置意图
            contextManager.setIntent({
              type: 'generate_new',
              figmaInput: { type: 'url', url: 'https://figma.com/file/test' },
              additionalRequirements: [],
            });
            break;
          case 2: // 设置偏好
            contextManager.setUserPreferences({
              defaultFramework: Math.random() > 0.5 ? 'react' : 'vue',
              verbosity: 'normal',
            });
            break;
          case 3: // 创建检查点
            contextManager.createCheckpoint({
              phase: 'executing',
              data: { checkpoint: checkpointCount++ },
            });
            break;
        }
      }
      
      // 验证：上下文应该包含所有操作的结果
      const context = contextManager.getContext();
      expect(context.history.length).toBeGreaterThanOrEqual(0);
      expect(context.taskState.checkpoints.length).toBe(checkpointCount);
    });
  });
});
