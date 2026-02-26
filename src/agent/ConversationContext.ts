import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type {
  ConversationContext as IConversationContext,
  Message,
  Intent,
  TaskState,
  UserPreferences,
  Artifact,
  Checkpoint,
} from './types';

/**
 * 对话上下文管理器
 * 维护用户意图、历史交互和任务状态
 */
export class ConversationContextManager {
  private context: IConversationContext;
  private persistencePath?: string;

  constructor(sessionId?: string, persistencePath?: string) {
    this.persistencePath = persistencePath;
    
    // 尝试从文件恢复上下文
    if (persistencePath && fs.existsSync(persistencePath)) {
      this.context = this.loadFromFile(persistencePath);
    } else {
      // 创建新的上下文
      this.context = this.createNewContext(sessionId);
    }
  }

  /**
   * 创建新的对话上下文
   */
  private createNewContext(sessionId?: string): IConversationContext {
    return {
      sessionId: sessionId || uuidv4(),
      intent: null,
      history: [],
      taskState: {
        phase: 'understanding',
        currentStep: 'Initializing',
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
  }

  /**
   * 获取当前上下文
   */
  getContext(): IConversationContext {
    return { ...this.context };
  }

  /**
   * 添加消息到历史记录
   */
  addMessage(role: Message['role'], content: string, metadata?: Record<string, any>): void {
    const message: Message = {
      role,
      content,
      timestamp: Date.now(),
      metadata,
    };
    this.context.history.push(message);
    this.persist();
  }

  /**
   * 设置用户意图
   */
  setIntent(intent: Intent): void {
    this.context.intent = intent;
    this.persist();
  }

  /**
   * 获取用户意图
   */
  getIntent(): Intent | null {
    return this.context.intent;
  }

  /**
   * 更新任务状态
   */
  updateTaskState(updates: Partial<TaskState>): void {
    this.context.taskState = {
      ...this.context.taskState,
      ...updates,
    };
    this.persist();
  }

  /**
   * 获取任务状态
   */
  getTaskState(): TaskState {
    return { ...this.context.taskState };
  }

  /**
   * 创建检查点
   */
  createCheckpoint(data: any): string {
    const checkpoint: Checkpoint = {
      id: uuidv4(),
      timestamp: Date.now(),
      phase: this.context.taskState.phase,
      data,
    };
    this.context.taskState.checkpoints.push(checkpoint);
    this.persist();
    return checkpoint.id;
  }

  /**
   * 从检查点恢复
   */
  restoreFromCheckpoint(checkpointId: string): boolean {
    const checkpoint = this.context.taskState.checkpoints.find((cp) => cp.id === checkpointId);
    if (!checkpoint) {
      return false;
    }

    // 恢复任务状态到检查点时的状态
    this.context.taskState.phase = checkpoint.phase;
    
    // 移除该检查点之后的所有检查点
    const checkpointIndex = this.context.taskState.checkpoints.findIndex((cp) => cp.id === checkpointId);
    this.context.taskState.checkpoints = this.context.taskState.checkpoints.slice(0, checkpointIndex + 1);
    
    this.persist();
    return true;
  }

  /**
   * 更新用户偏好
   */
  updateUserPreferences(preferences: Partial<UserPreferences>): void {
    this.context.userPreferences = {
      ...this.context.userPreferences,
      ...preferences,
    };
    this.persist();
  }

  /**
   * 获取用户偏好
   */
  getUserPreferences(): UserPreferences {
    return { ...this.context.userPreferences };
  }

  /**
   * 添加生成的产物
   */
  addArtifact(artifact: Omit<Artifact, 'id' | 'timestamp'>): string {
    const fullArtifact: Artifact = {
      ...artifact,
      id: uuidv4(),
      timestamp: Date.now(),
    };
    this.context.generatedArtifacts.push(fullArtifact);
    this.persist();
    return fullArtifact.id;
  }

  /**
   * 获取所有产物
   */
  getArtifacts(): Artifact[] {
    return [...this.context.generatedArtifacts];
  }

  /**
   * 获取特定版本的产物
   */
  getArtifactsByVersion(version: number): Artifact[] {
    return this.context.generatedArtifacts.filter((a) => a.version === version);
  }

  /**
   * 获取历史消息
   */
  getHistory(): Message[] {
    return [...this.context.history];
  }

  /**
   * 清空历史记录（保留用户偏好）
   */
  clearHistory(): void {
    this.context.history = [];
    this.context.intent = null;
    this.context.taskState = {
      phase: 'understanding',
      currentStep: 'Initializing',
      progress: 0,
      checkpoints: [],
    };
    this.persist();
  }

  /**
   * 持久化上下文到文件
   */
  private persist(): void {
    if (!this.persistencePath) {
      return;
    }

    try {
      const dir = path.dirname(this.persistencePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.persistencePath, JSON.stringify(this.context, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to persist conversation context:', error);
    }
  }

  /**
   * 从文件加载上下文
   */
  private loadFromFile(filePath: string): IConversationContext {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to load conversation context:', error);
      return this.createNewContext();
    }
  }

  /**
   * 导出上下文为 JSON
   */
  export(): string {
    return JSON.stringify(this.context, null, 2);
  }

  /**
   * 从 JSON 导入上下文
   */
  import(json: string): boolean {
    try {
      const imported = JSON.parse(json);
      this.context = imported;
      this.persist();
      return true;
    } catch (error) {
      console.error('Failed to import conversation context:', error);
      return false;
    }
  }
}
