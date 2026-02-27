/**
 * 属性测试：Figma URL 解析的完整性
 * 
 * **属性 1：Figma URL 解析的完整性**
 * 验证：对于任意有效的 Figma URL，解析后应该能提取出文件 ID，
 * 如果 URL 包含节点信息，也应该提取出节点 ID
 * 
 * **验证需求：2.1**
 */

import { IntentUnderstandingEngine } from '../../agent/IntentUnderstandingEngine';
import { ConversationContextManager } from '../../agent/ConversationContext';

describe('IntentUnderstandingEngine Property Tests', () => {
  describe('属性 1：Figma URL 解析的完整性', () => {
    it('应该从任意有效的 Figma file URL 中提取文件 ID', async () => {
      const engine = new IntentUnderstandingEngine();
      const contextManager = new ConversationContextManager();
      
      // 生成随机文件 ID（22-24个字符）
      const fileIds = Array.from({ length: 10 }, () => {
        const length = Math.floor(Math.random() * 3) + 22;
        return Array.from({ length }, () => 
          'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[
            Math.floor(Math.random() * 62)
          ]
        ).join('');
      });
      
      for (const fileId of fileIds) {
        const url = `https://www.figma.com/file/${fileId}/MyDesign`;
        const input = `生成 ${url} 的组件`;
        
        const intent = await engine.analyzeInput(input, contextManager.getContext());
        
        expect(intent.figmaInput).toBeDefined();
        expect(intent.figmaInput.type).toBe('url');
        expect(intent.figmaInput.fileKey).toBe(fileId);
        expect(intent.figmaInput.url).toContain(fileId);
      }
    });

    it('应该从任意有效的 Figma design URL 中提取文件 ID', async () => {
      const engine = new IntentUnderstandingEngine();
      const contextManager = new ConversationContextManager();
      
      // 测试 design URL 格式
      const fileIds = Array.from({ length: 5 }, () => {
        return Array.from({ length: 22 }, () => 
          'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[
            Math.floor(Math.random() * 62)
          ]
        ).join('');
      });
      
      for (const fileId of fileIds) {
        const url = `https://www.figma.com/design/${fileId}/MyDesign`;
        const input = `从 ${url} 生成代码`;
        
        const intent = await engine.analyzeInput(input, contextManager.getContext());
        
        expect(intent.figmaInput).toBeDefined();
        expect(intent.figmaInput.fileKey).toBe(fileId);
      }
    });

    it('应该从包含节点 ID 的 URL 中提取节点信息', async () => {
      const engine = new IntentUnderstandingEngine();
      const contextManager = new ConversationContextManager();
      
      // 生成随机节点 ID（格式：数字:数字）
      const testCases = Array.from({ length: 10 }, () => {
        const fileId = Array.from({ length: 22 }, () => 
          'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[
            Math.floor(Math.random() * 62)
          ]
        ).join('');
        
        const nodeId1 = Math.floor(Math.random() * 1000);
        const nodeId2 = Math.floor(Math.random() * 1000);
        const nodeIdParam = `${nodeId1}-${nodeId2}`; // URL 格式使用 -
        const expectedNodeId = `${nodeId1}:${nodeId2}`; // 内部格式使用 :
        
        return { fileId, nodeIdParam, expectedNodeId };
      });
      
      for (const { fileId, nodeIdParam, expectedNodeId } of testCases) {
        const url = `https://www.figma.com/file/${fileId}/MyDesign?node-id=${nodeIdParam}`;
        const input = `生成 ${url}`;
        
        const intent = await engine.analyzeInput(input, contextManager.getContext());
        
        expect(intent.figmaInput).toBeDefined();
        expect(intent.figmaInput.fileKey).toBe(fileId);
        expect(intent.figmaInput.nodeIds).toBeDefined();
        expect(intent.figmaInput.nodeIds).toContain(expectedNodeId);
      }
    });

    it('应该处理不带 www 前缀的 URL', async () => {
      const engine = new IntentUnderstandingEngine();
      const contextManager = new ConversationContextManager();
      
      const fileId = 'abcdefghijklmnopqrstuv';
      const urls = [
        `https://figma.com/file/${fileId}/Design`,
        `http://figma.com/file/${fileId}/Design`,
        `https://www.figma.com/file/${fileId}/Design`,
        `http://www.figma.com/file/${fileId}/Design`,
      ];
      
      for (const url of urls) {
        const input = `生成 ${url}`;
        const intent = await engine.analyzeInput(input, contextManager.getContext());
        
        expect(intent.figmaInput).toBeDefined();
        expect(intent.figmaInput.fileKey).toBe(fileId);
      }
    });

    it('应该从包含复杂查询参数的 URL 中提取信息', async () => {
      const engine = new IntentUnderstandingEngine();
      const contextManager = new ConversationContextManager();
      
      const fileId = 'testFileId123456789012';
      const nodeId = '123-456';
      const expectedNodeId = '123:456';
      
      const urls = [
        `https://figma.com/file/${fileId}/Design?node-id=${nodeId}&viewport=100,200,0.5`,
        `https://figma.com/file/${fileId}/Design?viewport=100,200,0.5&node-id=${nodeId}`,
        `https://figma.com/file/${fileId}/Design?node-id=${nodeId}&mode=dev`,
      ];
      
      for (const url of urls) {
        const input = `从 ${url} 生成`;
        const intent = await engine.analyzeInput(input, contextManager.getContext());
        
        expect(intent.figmaInput.fileKey).toBe(fileId);
        expect(intent.figmaInput.nodeIds).toContain(expectedNodeId);
      }
    });

    it('应该识别直接提供的文件 ID', async () => {
      const engine = new IntentUnderstandingEngine();
      const contextManager = new ConversationContextManager();
      
      // 生成随机长文件 ID
      const fileIds = Array.from({ length: 5 }, () => {
        return Array.from({ length: 24 }, () => 
          'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[
            Math.floor(Math.random() * 62)
          ]
        ).join('');
      });
      
      for (const fileId of fileIds) {
        const input = `生成文件 ${fileId} 的组件`;
        const intent = await engine.analyzeInput(input, contextManager.getContext());
        
        expect(intent.figmaInput).toBeDefined();
        expect(intent.figmaInput.type).toBe('file_id');
        expect(intent.figmaInput.fileKey).toBe(fileId);
      }
    });

    it('应该识别"当前"文件的请求', async () => {
      const engine = new IntentUnderstandingEngine();
      const contextManager = new ConversationContextManager();
      
      const inputs = [
        '生成当前打开的设计',
        '从当前文件生成代码',
        'generate from current file',
        'use the opened design',
      ];
      
      for (const input of inputs) {
        const intent = await engine.analyzeInput(input, contextManager.getContext());
        
        expect(intent.figmaInput).toBeDefined();
        expect(intent.figmaInput.type).toBe('mcp_current');
      }
    });

    it('应该从混合中英文输入中提取 URL', async () => {
      const engine = new IntentUnderstandingEngine();
      const contextManager = new ConversationContextManager();
      
      const fileId = 'mixedLanguageTest12345';
      const nodeId = '100-200';
      const expectedNodeId = '100:200';
      
      const inputs = [
        `请帮我生成这个设计 https://figma.com/file/${fileId}/Design?node-id=${nodeId} 的 React 组件`,
        `Generate React component from https://figma.com/file/${fileId}/Design?node-id=${nodeId} 谢谢`,
        `从 https://figma.com/file/${fileId}/Design?node-id=${nodeId} 生成 Vue component`,
      ];
      
      for (const input of inputs) {
        const intent = await engine.analyzeInput(input, contextManager.getContext());
        
        expect(intent.figmaInput.fileKey).toBe(fileId);
        expect(intent.figmaInput.nodeIds).toContain(expectedNodeId);
      }
    });

    it('应该处理包含特殊字符的设计名称', async () => {
      const engine = new IntentUnderstandingEngine();
      const contextManager = new ConversationContextManager();
      
      const fileId = 'specialCharsTest123456';
      const designNames = [
        'My-Design-v2',
        'Design_Final',
        'Design%20With%20Spaces',
        'Design(1)',
        'Design-2024-01-01',
      ];
      
      for (const designName of designNames) {
        const url = `https://figma.com/file/${fileId}/${designName}`;
        const input = `生成 ${url}`;
        
        const intent = await engine.analyzeInput(input, contextManager.getContext());
        
        expect(intent.figmaInput.fileKey).toBe(fileId);
        expect(intent.figmaInput.url).toContain(fileId);
      }
    });

    it('应该从任意位置的 URL 中提取信息', async () => {
      const engine = new IntentUnderstandingEngine();
      const contextManager = new ConversationContextManager();
      
      const fileId = 'positionTest123456789';
      const url = `https://figma.com/file/${fileId}/Design`;
      
      const inputs = [
        `${url} 生成组件`,
        `生成 ${url} 的代码`,
        `请从 ${url} 生成`,
        `生成组件，使用 ${url}`,
      ];
      
      for (const input of inputs) {
        const intent = await engine.analyzeInput(input, contextManager.getContext());
        
        expect(intent.figmaInput.fileKey).toBe(fileId);
      }
    });
  });
});
