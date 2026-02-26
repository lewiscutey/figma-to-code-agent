/**
 * Agent 核心类型定义
 */

export interface ConversationContext {
  sessionId: string;
  userId?: string;
  intent: Intent | null;
  history: Message[];
  taskState: TaskState;
  userPreferences: UserPreferences;
  generatedArtifacts: Artifact[];
}

export interface Intent {
  type: 'generate_new' | 'update_existing' | 'optimize' | 'analyze';
  figmaInput: FigmaInput;
  targetFramework?: 'react' | 'vue';
  styleMode?: 'css-modules' | 'tailwind' | 'css';
  qualityMode?: 'fast' | 'balanced' | 'high';
  additionalRequirements: string[];
}

export interface FigmaInput {
  type: 'url' | 'file_id' | 'mcp_current';
  url?: string;
  fileKey?: string;
  nodeIds?: string[];
}

export interface Message {
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface TaskState {
  phase: 'understanding' | 'planning' | 'executing' | 'reviewing' | 'completed';
  currentStep: string;
  progress: number;
  checkpoints: Checkpoint[];
}

export interface Checkpoint {
  id: string;
  timestamp: number;
  phase: TaskState['phase'];
  data: any;
}

export interface UserPreferences {
  language: 'zh' | 'en';
  verbosity: 'minimal' | 'normal' | 'detailed';
  autoApprove: boolean;
  defaultFramework?: 'react' | 'vue';
  defaultStyleMode?: 'css-modules' | 'tailwind' | 'css';
}

export interface Artifact {
  id: string;
  type: 'code' | 'config' | 'documentation';
  path: string;
  content: string;
  version: number;
  timestamp: number;
}

// Strategy and Execution types
export interface Strategy {
  id: string;
  name: string;
  description: string;
  steps: StrategyStep[];
  estimatedTime: number;
  estimatedCost: number;
  expectedQuality: 'low' | 'medium' | 'high';
}

export interface StrategyStep {
  tool: string;
  action: string;
  inputs: Record<string, any>;
  fallbackTool?: string;
}

export interface StrategyScore {
  feasibility: number;  // 0-1
  cost: number;         // estimated tokens/API calls
  quality: number;      // 0-1
  speed: number;        // 0-1
  total: number;        // weighted sum
}

export interface ExecutionResult {
  success: boolean;
  artifacts: Artifact[];
  errors: ExecutionError[];
  metrics: ExecutionMetrics;
  nextAction: 'complete' | 'iterate' | 'ask_user';
}

export interface ExecutionError {
  type: string;
  message: string;
  context?: any;
  recoverable: boolean;
}

export interface ExecutionMetrics {
  totalDuration: number;
  tokensUsed: number;
  apiCalls: number;
  toolsInvoked: string[];
}

export interface ToolResult {
  success: boolean;
  data: any;
  error?: Error;
  metadata: {
    duration: number;
    tokensUsed?: number;
    toolName: string;
  };
}
