import { IntentUnderstandingEngine } from '../../agent/IntentUnderstandingEngine';
import type { ConversationContext } from '../../agent/types';

describe('IntentUnderstandingEngine', () => {
  let engine: IntentUnderstandingEngine;
  let mockContext: ConversationContext;

  beforeEach(() => {
    engine = new IntentUnderstandingEngine();
    mockContext = {
      sessionId: 'test',
      intent: null,
      history: [],
      taskState: {
        phase: 'understanding',
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

  describe('Figma URL Extraction', () => {
    it('should extract file key from Figma URL', async () => {
      const input = '生成这个设计的代码 https://www.figma.com/file/abc123def456/MyDesign';
      
      const intent = await engine.analyzeInput(input, mockContext);
      
      expect(intent.figmaInput.type).toBe('url');
      expect(intent.figmaInput.fileKey).toBe('abc123def456');
    });

    it('should extract file key and node ID from Figma URL', async () => {
      const input = 'https://www.figma.com/file/abc123/Design?node-id=123-456';
      
      const intent = await engine.analyzeInput(input, mockContext);
      
      expect(intent.figmaInput.type).toBe('url');
      expect(intent.figmaInput.fileKey).toBe('abc123');
      expect(intent.figmaInput.nodeIds).toEqual(['123:456']);
    });

    it('should handle design URL format', async () => {
      const input = 'https://www.figma.com/design/xyz789/MyDesign';
      
      const intent = await engine.analyzeInput(input, mockContext);
      
      expect(intent.figmaInput.type).toBe('url');
      expect(intent.figmaInput.fileKey).toBe('xyz789');
    });

    it('should detect file ID without full URL', async () => {
      const input = '使用文件 abcdefghijklmnopqrstuv 生成代码';
      
      const intent = await engine.analyzeInput(input, mockContext);
      
      expect(intent.figmaInput.type).toBe('file_id');
      expect(intent.figmaInput.fileKey).toBe('abcdefghijklmnopqrstuv');
    });

    it('should detect MCP current file request', async () => {
      const input = '生成当前打开的设计';
      
      const intent = await engine.analyzeInput(input, mockContext);
      
      expect(intent.figmaInput.type).toBe('mcp_current');
    });
  });

  describe('Intent Type Detection', () => {
    it('should detect generate_new intent', async () => {
      const input = '生成 React 组件';
      
      const intent = await engine.analyzeInput(input, mockContext);
      
      expect(intent.type).toBe('generate_new');
    });

    it('should detect update_existing intent', async () => {
      const input = '更新现有组件';
      
      const intent = await engine.analyzeInput(input, mockContext);
      
      expect(intent.type).toBe('update_existing');
    });

    it('should detect optimize intent', async () => {
      const input = '优化这个组件的性能';
      
      const intent = await engine.analyzeInput(input, mockContext);
      
      expect(intent.type).toBe('optimize');
    });

    it('should detect analyze intent', async () => {
      const input = '分析这个设计';
      
      const intent = await engine.analyzeInput(input, mockContext);
      
      expect(intent.type).toBe('analyze');
    });
  });

  describe('Framework Detection', () => {
    it('should detect React framework', async () => {
      const input = '生成 React 组件';
      
      const intent = await engine.analyzeInput(input, mockContext);
      
      expect(intent.targetFramework).toBe('react');
    });

    it('should detect Vue framework', async () => {
      const input = '生成 Vue 组件';
      
      const intent = await engine.analyzeInput(input, mockContext);
      
      expect(intent.targetFramework).toBe('vue');
    });

    it('should use default framework from preferences', async () => {
      mockContext.userPreferences.defaultFramework = 'react';
      const input = '生成组件';
      
      const intent = await engine.analyzeInput(input, mockContext);
      
      expect(intent.targetFramework).toBe('react');
    });
  });

  describe('Style Mode Detection', () => {
    it('should detect Tailwind style mode', async () => {
      const input = '使用 Tailwind 生成组件';
      
      const intent = await engine.analyzeInput(input, mockContext);
      
      expect(intent.styleMode).toBe('tailwind');
    });

    it('should detect CSS Modules style mode', async () => {
      const input = '使用 CSS Modules 生成组件';
      
      const intent = await engine.analyzeInput(input, mockContext);
      
      expect(intent.styleMode).toBe('css-modules');
    });

    it('should detect plain CSS style mode', async () => {
      const input = '使用纯 CSS 生成组件';
      
      const intent = await engine.analyzeInput(input, mockContext);
      
      expect(intent.styleMode).toBe('css');
    });

    it('should use default style mode from preferences', async () => {
      mockContext.userPreferences.defaultStyleMode = 'tailwind';
      const input = '生成组件';
      
      const intent = await engine.analyzeInput(input, mockContext);
      
      expect(intent.styleMode).toBe('tailwind');
    });
  });

  describe('Quality Mode Detection', () => {
    it('should detect fast quality mode', async () => {
      const input = '快速生成一个原型';
      
      const intent = await engine.analyzeInput(input, mockContext);
      
      expect(intent.qualityMode).toBe('fast');
    });

    it('should detect high quality mode', async () => {
      const input = '生成高质量的生产代码';
      
      const intent = await engine.analyzeInput(input, mockContext);
      
      expect(intent.qualityMode).toBe('high');
    });

    it('should default to balanced mode', async () => {
      const input = '生成组件';
      
      const intent = await engine.analyzeInput(input, mockContext);
      
      expect(intent.qualityMode).toBe('balanced');
    });
  });

  describe('Additional Requirements Detection', () => {
    it('should detect TypeScript requirement', async () => {
      const input = '生成 TypeScript 组件';
      
      const intent = await engine.analyzeInput(input, mockContext);
      
      expect(intent.additionalRequirements).toContain('typescript');
    });

    it('should detect responsive requirement', async () => {
      const input = '生成响应式组件';
      
      const intent = await engine.analyzeInput(input, mockContext);
      
      expect(intent.additionalRequirements).toContain('responsive');
    });

    it('should detect dark mode requirement', async () => {
      const input = '添加暗色模式支持';
      
      const intent = await engine.analyzeInput(input, mockContext);
      
      expect(intent.additionalRequirements).toContain('dark_mode');
    });

    it('should detect accessibility requirement', async () => {
      const input = '确保无障碍访问';
      
      const intent = await engine.analyzeInput(input, mockContext);
      
      expect(intent.additionalRequirements).toContain('accessibility');
    });

    it('should detect multiple requirements', async () => {
      const input = '生成响应式的 TypeScript 组件，支持暗色模式';
      
      const intent = await engine.analyzeInput(input, mockContext);
      
      expect(intent.additionalRequirements).toContain('typescript');
      expect(intent.additionalRequirements).toContain('responsive');
      expect(intent.additionalRequirements).toContain('dark_mode');
    });
  });

  describe('Complex Intent Analysis', () => {
    it('should handle complex combined intent', async () => {
      const input = '使用 https://www.figma.com/file/abc123/Design 生成 React 组件，使用 Tailwind，需要 TypeScript 和响应式支持';
      
      const intent = await engine.analyzeInput(input, mockContext);
      
      expect(intent.type).toBe('generate_new');
      expect(intent.figmaInput.fileKey).toBe('abc123');
      expect(intent.targetFramework).toBe('react');
      expect(intent.styleMode).toBe('tailwind');
      expect(intent.additionalRequirements).toContain('typescript');
      expect(intent.additionalRequirements).toContain('responsive');
    });

    it('should handle English input', async () => {
      const input = 'Generate React component with Tailwind from https://www.figma.com/file/xyz789/Design';
      
      const intent = await engine.analyzeInput(input, mockContext);
      
      expect(intent.type).toBe('generate_new');
      expect(intent.targetFramework).toBe('react');
      expect(intent.styleMode).toBe('tailwind');
      expect(intent.figmaInput.fileKey).toBe('xyz789');
    });
  });

  describe('Missing Information Detection', () => {
    it('should identify missing Figma input', () => {
      const intent = {
        type: 'generate_new' as const,
        figmaInput: { type: 'url' as const },
        additionalRequirements: [],
      };
      
      const missing = engine.identifyMissingInfo(intent);
      
      expect(missing).toContain('figma_input');
    });

    it('should identify missing framework', () => {
      const intent = {
        type: 'generate_new' as const,
        figmaInput: { type: 'url' as const, url: 'test', fileKey: 'test' },
        additionalRequirements: [],
      };
      
      const missing = engine.identifyMissingInfo(intent);
      
      expect(missing).toContain('target_framework');
    });

    it('should identify missing style mode', () => {
      const intent = {
        type: 'generate_new' as const,
        figmaInput: { type: 'url' as const, url: 'test', fileKey: 'test' },
        targetFramework: 'react' as const,
        additionalRequirements: [],
      };
      
      const missing = engine.identifyMissingInfo(intent);
      
      expect(missing).toContain('style_mode');
    });

    it('should return empty array when all info is present', () => {
      const intent = {
        type: 'generate_new' as const,
        figmaInput: { type: 'url' as const, url: 'test', fileKey: 'test' },
        targetFramework: 'react' as const,
        styleMode: 'tailwind' as const,
        additionalRequirements: [],
      };
      
      const missing = engine.identifyMissingInfo(intent);
      
      expect(missing).toHaveLength(0);
    });
  });

  describe('Clarification Questions', () => {
    it('should generate question for missing Figma input', () => {
      const questions = engine.generateClarificationQuestions(['figma_input']);
      
      expect(questions).toHaveLength(1);
      expect(questions[0]).toContain('Figma');
    });

    it('should generate question for missing framework', () => {
      const questions = engine.generateClarificationQuestions(['target_framework']);
      
      expect(questions).toHaveLength(1);
      expect(questions[0]).toContain('React');
      expect(questions[0]).toContain('Vue');
    });

    it('should generate question for missing style mode', () => {
      const questions = engine.generateClarificationQuestions(['style_mode']);
      
      expect(questions).toHaveLength(1);
      expect(questions[0]).toContain('样式');
    });

    it('should generate multiple questions for multiple missing info', () => {
      const questions = engine.generateClarificationQuestions([
        'figma_input',
        'target_framework',
        'style_mode',
      ]);
      
      expect(questions).toHaveLength(3);
    });
  });
});
