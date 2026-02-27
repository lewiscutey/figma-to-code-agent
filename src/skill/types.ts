/**
 * Kiro Skill 接口类型定义
 */

export interface SkillMetadata {
  name: string;
  displayName: string;
  version: string;
  description: string;
  author: string;
  icon: string;
  category: 'development' | 'design' | 'productivity';
  tags: string[];
}

export interface SkillCommand {
  name: string;
  displayName: string;
  description: string;
  trigger: string;
  parameters: SkillParameter[];
}

export interface SkillParameter {
  name: string;
  displayName: string;
  type: 'string' | 'boolean' | 'select' | 'number';
  description: string;
  required: boolean;
  options?: Array<{ label: string; value: string }>;
  default?: any;
  placeholder?: string;
  secret?: boolean;
  minimum?: number;
  maximum?: number;
}

export interface SkillContext {
  workspaceRoot: string;
  currentFile?: string;
  selectedText?: string;
  clipboardContent?: string;
  projectInfo?: {
    framework?: string;
    dependencies?: Record<string, string>;
    hasTypeScript?: boolean;
  };
}

export interface SkillResponse {
  type: 'message' | 'files' | 'question' | 'error' | 'progress';
  content: string;
  files?: GeneratedFile[];
  question?: {
    text: string;
    options?: string[];
  };
  actions?: SkillAction[];
  metadata?: Record<string, any>;
}

export interface GeneratedFile {
  path: string;
  content: string;
  language?: string;
  description?: string;
}

export interface SkillAction {
  type: 'open_file' | 'preview' | 'diff' | 'install_deps' | 'run_command';
  data: any;
  label?: string;
  description?: string;
}

export interface SkillProgress {
  phase: string;
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number;
  currentStep?: number;
  totalSteps?: number;
}

export interface SkillConfig {
  figmaAccessToken?: string;
  defaultFramework?: 'react' | 'vue' | 'auto';
  defaultStyleMode?: 'css-modules' | 'tailwind' | 'css' | 'auto';
  defaultQualityMode?: 'fast' | 'balanced' | 'high';
  enableAutoDetection?: boolean;
  enableIterativeMode?: boolean;
  showDecisionReasoning?: boolean;
  maxIterations?: number;
  llmProvider?: 'bedrock' | 'openai' | 'anthropic';
  llmModel?: string;
  tokenBudget?: number;
  enableMCPIntegration?: boolean;
  enableParallelProcessing?: boolean;
  verbosity?: 'minimal' | 'normal' | 'detailed';
}

export interface SkillCapabilities {
  conversational: boolean;
  contextAware: boolean;
  iterative: boolean;
  multiStep: boolean;
  fileGeneration: boolean;
  codeAnalysis: boolean;
}
