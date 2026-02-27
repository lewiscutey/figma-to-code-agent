/**
 * 属性测试：策略选择与设计复杂度的一致性
 * 
 * **属性 2：策略选择与设计复杂度的一致性**
 * 验证：对于任意设计和质量模式，当设计复杂度低且质量模式为"快速"时，
 * 应该选择基于规则的策略；当设计复杂度高或质量模式为"高质量"时，
 * 应该选择 AI 增强策略
 * 
 * **验证需求：7.2, 7.3, 7.4, 7.5**
 */

import { DecisionEngine } from '../../agent/DecisionEngine';
import { ConversationContextManager } from '../../agent/ConversationContext';
import type { Intent } from '../../agent/types';

describe('DecisionEngine Property Tests', () => {
  describe('属性 2：策略选择与设计复杂度的一致性', () => {
    it('应该为简单设计和快速模式选择基于规则的策略', () => {
      const engine = new DecisionEngine();
      
      // 生成多个简单设计的意图
      for (let i = 0; i < 10; i++) {
        const intent: Intent = {
          type: 'generate_new',
          figmaInput: {
            type: 'url',
            url: `https://figma.com/file/test${i}`,
          },
          qualityMode: 'fast',
          additionalRequirements: [],
        };
        
        const strategies = engine.generateStrategies(intent, []);
        
        // 验证：应该包含快速规则策略
        const fastStrategy = strategies.find(s => s.id === 'fast-rule-based');
        expect(fastStrategy).toBeDefined();
        expect(fastStrategy?.estimatedTime).toBeLessThan(60);
      }
    });

    it('应该为复杂设计选择 AI 增强策略', () => {
      const engine = new DecisionEngine();
      
      // 生成多个复杂设计的意图
      for (let i = 0; i < 10; i++) {
        const intent: Intent = {
          type: 'generate_new',
          figmaInput: {
            type: 'url',
            url: `https://figma.com/file/complex${i}`,
          },
          qualityMode: 'high',
          additionalRequirements: [],
        };
        
        const strategies = engine.generateStrategies(intent, []);
        
        // 验证：应该包含 AI 增强策略
        const aiStrategy = strategies.find(s => s.id === 'ai-enhanced');
        expect(aiStrategy).toBeDefined();
        expect(aiStrategy?.expectedQuality).toBe('high');
      }
    });

    it('应该为高质量模式启用所有优化步骤', () => {
      const engine = new DecisionEngine();
      
      const intent: Intent = {
        type: 'generate_new',
        figmaInput: {
          type: 'url',
          url: 'https://figma.com/file/test',
        },
        qualityMode: 'high',
        additionalRequirements: [],
      };
      
      const strategies = engine.generateStrategies(intent, []);
      const aiStrategy = strategies.find(s => s.id === 'ai-enhanced');
      
      // 验证：高质量策略应该包含优化步骤
      expect(aiStrategy).toBeDefined();
      const hasAccessibilityStep = aiStrategy?.steps.some(s => 
        s.tool === 'accessibility-enhancer'
      );
      const hasPerformanceStep = aiStrategy?.steps.some(s => 
        s.tool === 'performance-optimizer'
      );
      
      expect(hasAccessibilityStep).toBe(true);
      expect(hasPerformanceStep).toBe(true);
    });

    it('应该为快速模式跳过可选优化步骤', () => {
      const engine = new DecisionEngine();
      
      const intent: Intent = {
        type: 'generate_new',
        figmaInput: {
          type: 'url',
          url: 'https://figma.com/file/test',
        },
        qualityMode: 'fast',
        additionalRequirements: [],
      };
      
      const strategies = engine.generateStrategies(intent, []);
      const fastStrategy = strategies.find(s => s.id === 'fast-rule-based');
      
      // 验证：快速策略不应该包含优化步骤
      expect(fastStrategy).toBeDefined();
      const hasOptimizationSteps = fastStrategy?.steps.some(s => 
        s.tool === 'accessibility-enhancer' || s.tool === 'performance-optimizer'
      );
      
      expect(hasOptimizationSteps).toBe(false);
    });

    it('应该为平衡模式生成多个策略选项', () => {
      const engine = new DecisionEngine();
      
      const intent: Intent = {
        type: 'generate_new',
        figmaInput: {
          type: 'url',
          url: 'https://figma.com/file/test',
        },
        qualityMode: 'balanced',
        additionalRequirements: [],
      };
      
      const strategies = engine.generateStrategies(intent, []);
      
      // 验证：平衡模式应该生成多个策略
      expect(strategies.length).toBeGreaterThan(1);
      
      // 应该同时包含快速和 AI 策略
      const hasFastStrategy = strategies.some(s => s.id === 'fast-rule-based');
      const hasAIStrategy = strategies.some(s => s.id === 'ai-enhanced');
      
      expect(hasFastStrategy).toBe(true);
      expect(hasAIStrategy).toBe(true);
    });

    it('应该根据用户偏好选择最佳策略', () => {
      const engine = new DecisionEngine();
      const contextManager = new ConversationContextManager();
      
      // 测试不同的质量偏好
      const qualityModes = ['fast', 'balanced', 'high'] as const;
      
      for (const qualityMode of qualityModes) {
        const intent: Intent = {
          type: 'generate_new',
          figmaInput: {
            type: 'url',
            url: 'https://figma.com/file/test',
          },
          qualityMode,
          additionalRequirements: [],
        };
        
        contextManager.setIntent(intent);
        const context = contextManager.getContext();
        
        const strategies = engine.generateStrategies(intent, []);
        const bestStrategy = engine.selectBestStrategy(strategies, context);
        
        // 验证：选择的策略应该符合质量模式
        expect(bestStrategy).toBeDefined();
        
        if (qualityMode === 'fast') {
          expect(bestStrategy.estimatedTime).toBeLessThan(90);
        } else if (qualityMode === 'high') {
          expect(bestStrategy.expectedQuality).toBe('high');
        }
      }
    });

    it('应该为响应式需求添加相应的处理步骤', () => {
      const engine = new DecisionEngine();
      
      const intent: Intent = {
        type: 'generate_new',
        figmaInput: {
          type: 'url',
          url: 'https://figma.com/file/test',
        },
        qualityMode: 'balanced',
        additionalRequirements: ['responsive'],
      };
      
      const strategies = engine.generateStrategies(intent, []);
      const aiStrategy = strategies.find(s => s.id === 'ai-enhanced');
      
      // 验证：应该包含响应式合并步骤
      expect(aiStrategy).toBeDefined();
      const hasResponsiveStep = aiStrategy?.steps.some(s => 
        s.tool === 'responsive-merger'
      );
      
      expect(hasResponsiveStep).toBe(true);
    });

    it('应该为更新意图生成增量更新策略', () => {
      const engine = new DecisionEngine();
      
      const intent: Intent = {
        type: 'update_existing',
        figmaInput: {
          type: 'url',
          url: 'https://figma.com/file/test',
        },
        additionalRequirements: [],
      };
      
      const strategies = engine.generateStrategies(intent, []);
      
      // 验证：应该生成增量更新策略
      const updateStrategy = strategies.find(s => s.id === 'incremental-update');
      expect(updateStrategy).toBeDefined();
      
      // 应该包含差异分析步骤
      const hasDiffStep = updateStrategy?.steps.some(s => 
        s.tool === 'diff-analysis'
      );
      expect(hasDiffStep).toBe(true);
    });

    it('应该为优化意图生成优化策略', () => {
      const engine = new DecisionEngine();
      
      const intent: Intent = {
        type: 'optimize',
        figmaInput: {
          type: 'url',
          url: 'https://figma.com/file/test',
        },
        additionalRequirements: [],
      };
      
      const strategies = engine.generateStrategies(intent, []);
      
      // 验证：应该生成优化策略
      const optimizeStrategy = strategies.find(s => s.id === 'optimization');
      expect(optimizeStrategy).toBeDefined();
      
      // 应该包含性能优化和无障碍增强步骤
      const hasPerformanceStep = optimizeStrategy?.steps.some(s => 
        s.tool === 'performance-optimizer'
      );
      const hasAccessibilityStep = optimizeStrategy?.steps.some(s => 
        s.tool === 'accessibility-enhancer'
      );
      
      expect(hasPerformanceStep).toBe(true);
      expect(hasAccessibilityStep).toBe(true);
    });

    it('应该为分析意图生成分析策略', () => {
      const engine = new DecisionEngine();
      
      const intent: Intent = {
        type: 'analyze',
        figmaInput: {
          type: 'url',
          url: 'https://figma.com/file/test',
        },
        additionalRequirements: [],
      };
      
      const strategies = engine.generateStrategies(intent, []);
      
      // 验证：应该生成分析策略
      const analyzeStrategy = strategies.find(s => s.id === 'design-analysis');
      expect(analyzeStrategy).toBeDefined();
      
      // 应该包含设计分析步骤
      const hasAnalyzerStep = analyzeStrategy?.steps.some(s => 
        s.tool === 'design-analyzer'
      );
      expect(hasAnalyzerStep).toBe(true);
    });

    it('应该为所有策略提供回退选项', () => {
      const engine = new DecisionEngine();
      
      const intents: Intent[] = [
        {
          type: 'generate_new',
          figmaInput: { type: 'url', url: 'https://figma.com/file/test1' },
          qualityMode: 'fast',
          additionalRequirements: [],
        },
        {
          type: 'generate_new',
          figmaInput: { type: 'url', url: 'https://figma.com/file/test2' },
          qualityMode: 'high',
          additionalRequirements: [],
        },
      ];
      
      for (const intent of intents) {
        const strategies = engine.generateStrategies(intent, []);
        
        // 验证：至少有一个策略包含回退工具
        const hasStrategyWithFallback = strategies.some(s =>
          s.steps.some(step => step.fallbackTool !== undefined)
        );
        
        expect(hasStrategyWithFallback).toBe(true);
      }
    });

    it('应该评估策略的可行性分数在 0-1 范围内', () => {
      const engine = new DecisionEngine();
      const contextManager = new ConversationContextManager();
      
      const intent: Intent = {
        type: 'generate_new',
        figmaInput: {
          type: 'url',
          url: 'https://figma.com/file/test',
        },
        qualityMode: 'balanced',
        additionalRequirements: [],
      };
      
      contextManager.setIntent(intent);
      const context = contextManager.getContext();
      
      const strategies = engine.generateStrategies(intent, []);
      
      for (const strategy of strategies) {
        const score = engine.evaluateStrategy(strategy, context);
        
        // 验证：所有分数应该在 0-1 范围内
        expect(score.feasibility).toBeGreaterThanOrEqual(0);
        expect(score.feasibility).toBeLessThanOrEqual(1);
        expect(score.quality).toBeGreaterThanOrEqual(0);
        expect(score.quality).toBeLessThanOrEqual(1);
        expect(score.speed).toBeGreaterThanOrEqual(0);
        expect(score.speed).toBeLessThanOrEqual(1);
      }
    });
  });
});
