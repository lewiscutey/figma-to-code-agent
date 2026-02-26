import { DecisionEngine } from '../../agent/DecisionEngine';
import type { Tool } from '../../tools/types';
import type { Intent, ConversationContext, Strategy } from '../../agent/types';

describe('DecisionEngine', () => {
  let engine: DecisionEngine;
  let mockContext: ConversationContext;
  let mockTools: Tool[];

  beforeEach(() => {
    engine = new DecisionEngine();

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

    mockTools = [
      {
        name: 'figma-extraction',
        description: 'Extract design from Figma',
        category: 'extraction',
        capabilities: ['extract_design', 'parse_figma'],
        isAvailable: async () => true,
        execute: async () => ({}),
      },
      {
        name: 'transformation',
        description: 'Transform design to AST',
        category: 'transformation',
        capabilities: ['transform', 'optimize'],
        isAvailable: async () => true,
        execute: async () => ({}),
      },
      {
        name: 'code-generation',
        description: 'Generate code',
        category: 'generation',
        capabilities: ['generate_react', 'generate_vue'],
        isAvailable: async () => true,
        execute: async () => ({}),
      },
    ];
  });

  describe('Strategy Generation', () => {
    it('should generate strategies for generate_new intent', () => {
      const intent: Intent = {
        type: 'generate_new',
        figmaInput: { type: 'url', url: 'test', fileKey: 'test' },
        targetFramework: 'react',
        styleMode: 'tailwind',
        qualityMode: 'balanced',
        additionalRequirements: [],
      };

      const strategies = engine.generateStrategies(intent, mockTools);

      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies.every((s) => s.id && s.name && s.steps.length > 0)).toBe(true);
    });

    it('should generate fast strategy for fast quality mode', () => {
      const intent: Intent = {
        type: 'generate_new',
        figmaInput: { type: 'url', url: 'test', fileKey: 'test' },
        qualityMode: 'fast',
        additionalRequirements: [],
      };

      const strategies = engine.generateStrategies(intent, mockTools);

      const fastStrategy = strategies.find((s) => s.id === 'fast-rule-based');
      expect(fastStrategy).toBeDefined();
      expect(fastStrategy!.estimatedTime).toBeLessThan(60);
    });

    it('should generate AI-enhanced strategy for high quality mode', () => {
      const intent: Intent = {
        type: 'generate_new',
        figmaInput: { type: 'url', url: 'test', fileKey: 'test' },
        qualityMode: 'high',
        additionalRequirements: [],
      };

      const strategies = engine.generateStrategies(intent, mockTools);

      const aiStrategy = strategies.find((s) => s.id === 'ai-enhanced');
      expect(aiStrategy).toBeDefined();
      expect(aiStrategy!.expectedQuality).toBe('high');
    });

    it('should generate update strategy for update_existing intent', () => {
      const intent: Intent = {
        type: 'update_existing',
        figmaInput: { type: 'url', url: 'test', fileKey: 'test' },
        additionalRequirements: [],
      };

      const strategies = engine.generateStrategies(intent, mockTools);

      expect(strategies.length).toBeGreaterThan(0);
      const updateStrategy = strategies.find((s) => s.id === 'incremental-update');
      expect(updateStrategy).toBeDefined();
    });

    it('should generate optimize strategy for optimize intent', () => {
      const intent: Intent = {
        type: 'optimize',
        figmaInput: { type: 'url', url: 'test', fileKey: 'test' },
        additionalRequirements: [],
      };

      const strategies = engine.generateStrategies(intent, mockTools);

      expect(strategies.length).toBeGreaterThan(0);
      const optimizeStrategy = strategies.find((s) => s.id === 'optimization');
      expect(optimizeStrategy).toBeDefined();
    });

    it('should generate analyze strategy for analyze intent', () => {
      const intent: Intent = {
        type: 'analyze',
        figmaInput: { type: 'url', url: 'test', fileKey: 'test' },
        additionalRequirements: [],
      };

      const strategies = engine.generateStrategies(intent, mockTools);

      expect(strategies.length).toBeGreaterThan(0);
      const analyzeStrategy = strategies.find((s) => s.id === 'design-analysis');
      expect(analyzeStrategy).toBeDefined();
    });

    it('should include responsive step when responsive is required', () => {
      const intent: Intent = {
        type: 'generate_new',
        figmaInput: { type: 'url', url: 'test', fileKey: 'test' },
        qualityMode: 'high',
        additionalRequirements: ['responsive'],
      };

      const strategies = engine.generateStrategies(intent, mockTools);
      const aiStrategy = strategies.find((s) => s.id === 'ai-enhanced');

      expect(aiStrategy).toBeDefined();
      const responsiveStep = aiStrategy!.steps.find((s) => s.tool === 'responsive-merger');
      expect(responsiveStep).toBeDefined();
    });

    it('should include accessibility and performance steps for high quality', () => {
      const intent: Intent = {
        type: 'generate_new',
        figmaInput: { type: 'url', url: 'test', fileKey: 'test' },
        qualityMode: 'high',
        additionalRequirements: [],
      };

      const strategies = engine.generateStrategies(intent, mockTools);
      const aiStrategy = strategies.find((s) => s.id === 'ai-enhanced');

      expect(aiStrategy).toBeDefined();
      const a11yStep = aiStrategy!.steps.find((s) => s.tool === 'accessibility-enhancer');
      const perfStep = aiStrategy!.steps.find((s) => s.tool === 'performance-optimizer');
      expect(a11yStep).toBeDefined();
      expect(perfStep).toBeDefined();
    });
  });

  describe('Strategy Evaluation', () => {
    let testStrategy: Strategy;

    beforeEach(() => {
      testStrategy = {
        id: 'test',
        name: 'Test Strategy',
        description: 'Test',
        steps: [
          {
            tool: 'figma-extraction',
            action: 'extract',
            inputs: {},
          },
          {
            tool: 'code-generation',
            action: 'generate',
            inputs: {},
          },
        ],
        estimatedTime: 60,
        estimatedCost: 2000,
        expectedQuality: 'high',
      };
    });

    it('should evaluate strategy and return score', () => {
      mockContext.intent = {
        type: 'generate_new',
        figmaInput: { type: 'url', url: 'test', fileKey: 'test' },
        qualityMode: 'balanced',
        additionalRequirements: [],
      };

      const score = engine.evaluateStrategy(testStrategy, mockContext);

      expect(score.feasibility).toBeGreaterThanOrEqual(0);
      expect(score.feasibility).toBeLessThanOrEqual(1);
      expect(score.cost).toBeGreaterThan(0);
      expect(score.quality).toBeGreaterThanOrEqual(0);
      expect(score.quality).toBeLessThanOrEqual(1);
      expect(score.speed).toBeGreaterThanOrEqual(0);
      expect(score.speed).toBeLessThanOrEqual(1);
      expect(score.total).toBeGreaterThan(0);
    });

    it('should give higher quality score for high quality strategies', () => {
      mockContext.intent = {
        type: 'generate_new',
        figmaInput: { type: 'url', url: 'test', fileKey: 'test' },
        qualityMode: 'high',
        additionalRequirements: [],
      };

      const highQualityStrategy = { ...testStrategy, expectedQuality: 'high' as const };
      const lowQualityStrategy = { ...testStrategy, expectedQuality: 'low' as const };

      const highScore = engine.evaluateStrategy(highQualityStrategy, mockContext);
      const lowScore = engine.evaluateStrategy(lowQualityStrategy, mockContext);

      expect(highScore.quality).toBeGreaterThan(lowScore.quality);
    });

    it('should give higher speed score for faster strategies', () => {
      mockContext.intent = {
        type: 'generate_new',
        figmaInput: { type: 'url', url: 'test', fileKey: 'test' },
        qualityMode: 'fast',
        additionalRequirements: [],
      };

      const fastStrategy = { ...testStrategy, estimatedTime: 30 };
      const slowStrategy = { ...testStrategy, estimatedTime: 150 };

      const fastScore = engine.evaluateStrategy(fastStrategy, mockContext);
      const slowScore = engine.evaluateStrategy(slowStrategy, mockContext);

      expect(fastScore.speed).toBeGreaterThan(slowScore.speed);
    });

    it('should increase feasibility for strategies with fallbacks', () => {
      const strategyWithFallback = {
        ...testStrategy,
        steps: [
          {
            tool: 'figma-extraction',
            action: 'extract',
            inputs: {},
            fallbackTool: 'figma-api',
          },
        ],
      };

      const strategyWithoutFallback = {
        ...testStrategy,
        steps: [
          {
            tool: 'figma-extraction',
            action: 'extract',
            inputs: {},
          },
        ],
      };

      mockContext.intent = {
        type: 'generate_new',
        figmaInput: { type: 'url', url: 'test', fileKey: 'test' },
        additionalRequirements: [],
      };

      const scoreWithFallback = engine.evaluateStrategy(strategyWithFallback, mockContext);
      const scoreWithoutFallback = engine.evaluateStrategy(strategyWithoutFallback, mockContext);

      expect(scoreWithFallback.feasibility).toBeGreaterThan(scoreWithoutFallback.feasibility);
    });
  });

  describe('Strategy Selection', () => {
    it('should select best strategy based on scores', () => {
      const strategies: Strategy[] = [
        {
          id: 'fast',
          name: 'Fast',
          description: 'Fast strategy',
          steps: [],
          estimatedTime: 30,
          estimatedCost: 1000,
          expectedQuality: 'medium',
        },
        {
          id: 'balanced',
          name: 'Balanced',
          description: 'Balanced strategy',
          steps: [],
          estimatedTime: 60,
          estimatedCost: 2000,
          expectedQuality: 'high',
        },
        {
          id: 'slow',
          name: 'Slow',
          description: 'Slow strategy',
          steps: [],
          estimatedTime: 150,
          estimatedCost: 5000,
          expectedQuality: 'high',
        },
      ];

      mockContext.intent = {
        type: 'generate_new',
        figmaInput: { type: 'url', url: 'test', fileKey: 'test' },
        qualityMode: 'balanced',
        additionalRequirements: [],
      };

      const best = engine.selectBestStrategy(strategies, mockContext);

      expect(best).toBeDefined();
      expect(best.id).toBeTruthy();
    });

    it('should prefer fast strategies when quality mode is fast', () => {
      const strategies: Strategy[] = [
        {
          id: 'fast',
          name: 'Fast',
          description: 'Fast strategy',
          steps: [],
          estimatedTime: 30,
          estimatedCost: 1000,
          expectedQuality: 'medium',
        },
        {
          id: 'slow',
          name: 'Slow',
          description: 'Slow strategy',
          steps: [],
          estimatedTime: 150,
          estimatedCost: 5000,
          expectedQuality: 'high',
        },
      ];

      mockContext.intent = {
        type: 'generate_new',
        figmaInput: { type: 'url', url: 'test', fileKey: 'test' },
        qualityMode: 'fast',
        additionalRequirements: [],
      };

      const best = engine.selectBestStrategy(strategies, mockContext);

      expect(best.id).toBe('fast');
    });

    it('should prefer high quality strategies when quality mode is high', () => {
      const strategies: Strategy[] = [
        {
          id: 'fast',
          name: 'Fast',
          description: 'Fast strategy',
          steps: [],
          estimatedTime: 30,
          estimatedCost: 1000,
          expectedQuality: 'low',
        },
        {
          id: 'high-quality',
          name: 'High Quality',
          description: 'High quality strategy',
          steps: [],
          estimatedTime: 120,
          estimatedCost: 4000,
          expectedQuality: 'high',
        },
      ];

      mockContext.intent = {
        type: 'generate_new',
        figmaInput: { type: 'url', url: 'test', fileKey: 'test' },
        qualityMode: 'high',
        additionalRequirements: [],
      };

      const best = engine.selectBestStrategy(strategies, mockContext);

      expect(best.id).toBe('high-quality');
    });

    it('should throw error when no strategies available', () => {
      mockContext.intent = {
        type: 'generate_new',
        figmaInput: { type: 'url', url: 'test', fileKey: 'test' },
        additionalRequirements: [],
      };

      expect(() => engine.selectBestStrategy([], mockContext)).toThrow('No strategies available');
    });
  });

  describe('Complexity Analysis', () => {
    it('should analyze simple design', () => {
      const simpleDesign = {
        id: '1',
        name: 'Root',
        children: [
          { id: '2', name: 'Child1' },
          { id: '3', name: 'Child2' },
        ],
      };

      const result = engine.analyzeComplexity(simpleDesign);

      expect(result.nodeCount).toBe(3);
      expect(result.depth).toBe(2);
      expect(result.complexity).toBe('simple');
    });

    it('should analyze medium complexity design', () => {
      const mediumDesign = {
        id: '1',
        name: 'Root',
        children: Array.from({ length: 25 }, (_, i) => ({
          id: `${i + 2}`,
          name: `Child${i}`,
        })),
      };

      const result = engine.analyzeComplexity(mediumDesign);

      expect(result.nodeCount).toBe(26);
      expect(result.complexity).toBe('medium');
    });

    it('should analyze complex design', () => {
      const complexDesign = {
        id: '1',
        name: 'Root',
        children: Array.from({ length: 60 }, (_, i) => ({
          id: `${i + 2}`,
          name: `Child${i}`,
        })),
      };

      const result = engine.analyzeComplexity(complexDesign);

      expect(result.nodeCount).toBe(61);
      expect(result.complexity).toBe('complex');
    });

    it('should calculate correct depth for nested design', () => {
      const nestedDesign = {
        id: '1',
        name: 'Root',
        children: [
          {
            id: '2',
            name: 'Level1',
            children: [
              {
                id: '3',
                name: 'Level2',
                children: [{ id: '4', name: 'Level3' }],
              },
            ],
          },
        ],
      };

      const result = engine.analyzeComplexity(nestedDesign);

      expect(result.depth).toBe(4);
    });

    it('should handle null or undefined data', () => {
      const result = engine.analyzeComplexity(null);

      expect(result.nodeCount).toBe(0);
      expect(result.depth).toBe(0);
    });
  });
});
