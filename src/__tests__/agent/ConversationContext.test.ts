import * as fs from 'fs';
import * as path from 'path';
import { ConversationContextManager } from '../../agent/ConversationContext';

// Mock uuid
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-1234',
}));

describe('ConversationContextManager', () => {
  const testPersistencePath = path.join(__dirname, '.test-context.json');

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testPersistencePath)) {
      fs.unlinkSync(testPersistencePath);
    }
  });

  describe('Context Creation', () => {
    it('should create a new context with default values', () => {
      const manager = new ConversationContextManager();
      const context = manager.getContext();

      expect(context.sessionId).toBeDefined();
      expect(context.intent).toBeNull();
      expect(context.history).toEqual([]);
      expect(context.taskState.phase).toBe('understanding');
      expect(context.taskState.progress).toBe(0);
      expect(context.userPreferences.language).toBe('zh');
    });

    it('should use provided session ID', () => {
      const sessionId = 'test-session-123';
      const manager = new ConversationContextManager(sessionId);
      const context = manager.getContext();

      expect(context.sessionId).toBe(sessionId);
    });
  });

  describe('Message History', () => {
    it('should add messages to history', () => {
      const manager = new ConversationContextManager();
      
      manager.addMessage('user', 'Hello');
      manager.addMessage('agent', 'Hi there!');

      const history = manager.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].role).toBe('user');
      expect(history[0].content).toBe('Hello');
      expect(history[1].role).toBe('agent');
      expect(history[1].content).toBe('Hi there!');
    });

    it('should include timestamp in messages', () => {
      const manager = new ConversationContextManager();
      const before = Date.now();
      
      manager.addMessage('user', 'Test message');
      
      const after = Date.now();
      const history = manager.getHistory();
      
      expect(history[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(history[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('should support message metadata', () => {
      const manager = new ConversationContextManager();
      const metadata = { source: 'cli', userId: '123' };
      
      manager.addMessage('user', 'Test', metadata);
      
      const history = manager.getHistory();
      expect(history[0].metadata).toEqual(metadata);
    });
  });

  describe('Intent Management', () => {
    it('should set and get intent', () => {
      const manager = new ConversationContextManager();
      const intent = {
        type: 'generate_new' as const,
        figmaInput: {
          type: 'url' as const,
          url: 'https://figma.com/file/test',
        },
        targetFramework: 'react' as const,
        additionalRequirements: [],
      };

      manager.setIntent(intent);
      const retrieved = manager.getIntent();

      expect(retrieved).toEqual(intent);
    });
  });

  describe('Task State Management', () => {
    it('should update task state', () => {
      const manager = new ConversationContextManager();
      
      manager.updateTaskState({
        phase: 'executing',
        currentStep: 'Generating code',
        progress: 50,
      });

      const state = manager.getTaskState();
      expect(state.phase).toBe('executing');
      expect(state.currentStep).toBe('Generating code');
      expect(state.progress).toBe(50);
    });

    it('should preserve unmodified state fields', () => {
      const manager = new ConversationContextManager();
      
      manager.updateTaskState({ progress: 25 });
      
      const state = manager.getTaskState();
      expect(state.phase).toBe('understanding'); // Original value
      expect(state.progress).toBe(25); // Updated value
    });
  });

  describe('Checkpoint Management', () => {
    it('should create checkpoints', () => {
      const manager = new ConversationContextManager();
      const checkpointData = { step: 1, data: 'test' };
      
      const checkpointId = manager.createCheckpoint(checkpointData);
      
      expect(checkpointId).toBeDefined();
      const state = manager.getTaskState();
      expect(state.checkpoints).toHaveLength(1);
      expect(state.checkpoints[0].id).toBe(checkpointId);
      expect(state.checkpoints[0].data).toEqual(checkpointData);
    });

    it('should restore from checkpoint', () => {
      const manager = new ConversationContextManager();
      
      // Create initial checkpoint
      manager.updateTaskState({ phase: 'planning' });
      const checkpoint1 = manager.createCheckpoint({ step: 1 });
      
      // Progress further
      manager.updateTaskState({ phase: 'executing' });
      manager.createCheckpoint({ step: 2 });
      
      // Restore to first checkpoint
      const restored = manager.restoreFromCheckpoint(checkpoint1);
      
      expect(restored).toBe(true);
      const state = manager.getTaskState();
      expect(state.phase).toBe('planning');
      expect(state.checkpoints).toHaveLength(1); // Later checkpoints removed
    });

    it('should return false for invalid checkpoint ID', () => {
      const manager = new ConversationContextManager();
      
      const restored = manager.restoreFromCheckpoint('invalid-id');
      
      expect(restored).toBe(false);
    });
  });

  describe('User Preferences', () => {
    it('should update user preferences', () => {
      const manager = new ConversationContextManager();
      
      manager.updateUserPreferences({
        language: 'en',
        verbosity: 'detailed',
        defaultFramework: 'vue',
      });

      const prefs = manager.getUserPreferences();
      expect(prefs.language).toBe('en');
      expect(prefs.verbosity).toBe('detailed');
      expect(prefs.defaultFramework).toBe('vue');
    });

    it('should preserve unmodified preferences', () => {
      const manager = new ConversationContextManager();
      
      manager.updateUserPreferences({ language: 'en' });
      
      const prefs = manager.getUserPreferences();
      expect(prefs.language).toBe('en');
      expect(prefs.autoApprove).toBe(false); // Original value
    });
  });

  describe('Artifact Management', () => {
    it('should add artifacts', () => {
      const manager = new ConversationContextManager();
      
      const artifactId = manager.addArtifact({
        type: 'code',
        path: 'src/Component.tsx',
        content: 'export const Component = () => {}',
        version: 1,
      });

      expect(artifactId).toBeDefined();
      const artifacts = manager.getArtifacts();
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].id).toBe(artifactId);
    });

    it('should filter artifacts by version', () => {
      const manager = new ConversationContextManager();
      
      manager.addArtifact({ type: 'code', path: 'file1.ts', content: 'v1', version: 1 });
      manager.addArtifact({ type: 'code', path: 'file2.ts', content: 'v1', version: 1 });
      manager.addArtifact({ type: 'code', path: 'file1.ts', content: 'v2', version: 2 });

      const v1Artifacts = manager.getArtifactsByVersion(1);
      const v2Artifacts = manager.getArtifactsByVersion(2);

      expect(v1Artifacts).toHaveLength(2);
      expect(v2Artifacts).toHaveLength(1);
    });
  });

  describe('Persistence', () => {
    it('should persist context to file', () => {
      const manager = new ConversationContextManager('test-session', testPersistencePath);
      
      manager.addMessage('user', 'Test message');
      manager.updateTaskState({ progress: 50 });

      expect(fs.existsSync(testPersistencePath)).toBe(true);
      
      const content = JSON.parse(fs.readFileSync(testPersistencePath, 'utf-8'));
      expect(content.sessionId).toBe('test-session');
      expect(content.history).toHaveLength(1);
      expect(content.taskState.progress).toBe(50);
    });

    it('should load context from file', () => {
      // Create and persist context
      const manager1 = new ConversationContextManager('test-session', testPersistencePath);
      manager1.addMessage('user', 'Persisted message');
      manager1.updateTaskState({ progress: 75 });

      // Load from file
      const manager2 = new ConversationContextManager(undefined, testPersistencePath);
      const context = manager2.getContext();

      expect(context.sessionId).toBe('test-session');
      expect(context.history).toHaveLength(1);
      expect(context.history[0].content).toBe('Persisted message');
      expect(context.taskState.progress).toBe(75);
    });
  });

  describe('Clear History', () => {
    it('should clear history and reset state', () => {
      const manager = new ConversationContextManager();
      
      manager.addMessage('user', 'Message 1');
      manager.addMessage('agent', 'Message 2');
      manager.setIntent({
        type: 'generate_new',
        figmaInput: { type: 'url', url: 'test' },
        additionalRequirements: [],
      });
      manager.updateTaskState({ phase: 'executing', progress: 50 });

      manager.clearHistory();

      const context = manager.getContext();
      expect(context.history).toHaveLength(0);
      expect(context.intent).toBeNull();
      expect(context.taskState.phase).toBe('understanding');
      expect(context.taskState.progress).toBe(0);
      // User preferences should be preserved
      expect(context.userPreferences).toBeDefined();
    });
  });

  describe('Import/Export', () => {
    it('should export context as JSON', () => {
      const manager = new ConversationContextManager('export-test');
      manager.addMessage('user', 'Test');
      
      const exported = manager.export();
      const parsed = JSON.parse(exported);

      expect(parsed.sessionId).toBe('export-test');
      expect(parsed.history).toHaveLength(1);
    });

    it('should import context from JSON', () => {
      const manager1 = new ConversationContextManager('original');
      manager1.addMessage('user', 'Original message');
      const exported = manager1.export();

      const manager2 = new ConversationContextManager('new');
      const success = manager2.import(exported);

      expect(success).toBe(true);
      const context = manager2.getContext();
      expect(context.sessionId).toBe('original');
      expect(context.history).toHaveLength(1);
    });

    it('should handle invalid JSON on import', () => {
      const manager = new ConversationContextManager();
      
      const success = manager.import('invalid json');
      
      expect(success).toBe(false);
    });
  });
});
