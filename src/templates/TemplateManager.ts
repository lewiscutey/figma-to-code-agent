/**
 * 模板管理器
 * 支持自定义代码模板和设计模式库
 */

import * as fs from 'fs';
import * as path from 'path';

export interface Template {
  id: string;
  name: string;
  description: string;
  category: 'component' | 'layout' | 'pattern' | 'utility';
  framework: 'react' | 'vue' | 'both';
  content: string;
  variables: TemplateVariable[];
  metadata: TemplateMetadata;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'boolean' | 'number' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: any;
  validation?: VariableValidation;
}

export interface VariableValidation {
  pattern?: string;
  min?: number;
  max?: number;
  enum?: any[];
}

export interface TemplateMetadata {
  author?: string;
  version?: string;
  tags?: string[];
  dependencies?: string[];
  examples?: TemplateExample[];
}

export interface TemplateExample {
  name: string;
  description: string;
  variables: Record<string, any>;
  expectedOutput?: string;
}

export interface TemplateContext {
  variables: Record<string, any>;
  helpers?: Record<string, (...args: any[]) => any>;
}

export interface AppliedTemplate {
  code: string;
  imports: string[];
  dependencies: string[];
  warnings: string[];
}

/**
 * 模板管理器
 */
export class TemplateManager {
  private templates: Map<string, Template> = new Map();
  private templatePaths: string[] = [];

  constructor(templatePaths?: string[]) {
    this.templatePaths = templatePaths || [];
  }

  /**
   * 加载模板目录
   */
  async loadTemplatesFromDirectory(dirPath: string): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      throw new Error(`Template directory not found: ${dirPath}`);
    }

    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      if (file.endsWith('.template.json')) {
        const filePath = path.join(dirPath, file);
        await this.loadTemplate(filePath);
      }
    }
  }

  /**
   * 加载单个模板
   */
  async loadTemplate(filePath: string): Promise<Template> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const template = JSON.parse(content) as Template;

    // 验证模板
    this.validateTemplate(template);

    // 注册模板
    this.templates.set(template.id, template);

    return template;
  }

  /**
   * 注册模板
   */
  registerTemplate(template: Template): void {
    this.validateTemplate(template);
    this.templates.set(template.id, template);
  }

  /**
   * 获取模板
   */
  getTemplate(id: string): Template | null {
    return this.templates.get(id) || null;
  }

  /**
   * 查询模板
   */
  queryTemplates(query: {
    category?: Template['category'];
    framework?: Template['framework'];
    tags?: string[];
  }): Template[] {
    let results = Array.from(this.templates.values());

    if (query.category) {
      results = results.filter((t) => t.category === query.category);
    }

    if (query.framework) {
      results = results.filter(
        (t) => t.framework === query.framework || t.framework === 'both'
      );
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter((t) =>
        query.tags!.some((tag) => t.metadata.tags?.includes(tag))
      );
    }

    return results;
  }

  /**
   * 应用模板
   */
  async applyTemplate(
    templateId: string,
    context: TemplateContext
  ): Promise<AppliedTemplate> {
    const template = this.getTemplate(templateId);

    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // 验证变量
    this.validateVariables(template, context.variables);

    // 替换变量
    const code = this.replaceVariables(template.content, context);

    // 提取导入语句
    const imports = this.extractImports(code);

    // 收集依赖
    const dependencies = template.metadata.dependencies || [];

    // 收集警告
    const warnings = this.collectWarnings(template, context);

    return {
      code,
      imports,
      dependencies,
      warnings,
    };
  }

  /**
   * 验证模板
   */
  private validateTemplate(template: Template): void {
    if (!template.id) {
      throw new Error('Template must have an id');
    }

    if (!template.name) {
      throw new Error('Template must have a name');
    }

    if (!template.content) {
      throw new Error('Template must have content');
    }

    if (!template.variables) {
      template.variables = [];
    }

    if (!template.metadata) {
      template.metadata = {};
    }
  }

  /**
   * 验证变量
   */
  private validateVariables(template: Template, variables: Record<string, any>): void {
    for (const varDef of template.variables) {
      const value = variables[varDef.name];

      // 检查必需变量
      if (varDef.required && value === undefined) {
        throw new Error(`Required variable missing: ${varDef.name}`);
      }

      // 跳过未提供的可选变量
      if (value === undefined) {
        continue;
      }

      // 类型检查
      if (!this.checkType(value, varDef.type)) {
        throw new Error(
          `Variable ${varDef.name} has wrong type. Expected ${varDef.type}, got ${typeof value}`
        );
      }

      // 验证规则
      if (varDef.validation) {
        this.validateValue(varDef.name, value, varDef.validation);
      }
    }
  }

  /**
   * 检查类型
   */
  private checkType(value: any, expectedType: TemplateVariable['type']): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'boolean':
        return typeof value === 'boolean';
      case 'number':
        return typeof value === 'number';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && !Array.isArray(value);
      default:
        return false;
    }
  }

  /**
   * 验证值
   */
  private validateValue(
    name: string,
    value: any,
    validation: VariableValidation
  ): void {
    // 正则验证
    if (validation.pattern && typeof value === 'string') {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        throw new Error(`Variable ${name} does not match pattern: ${validation.pattern}`);
      }
    }

    // 最小值验证
    if (validation.min !== undefined) {
      if (typeof value === 'number' && value < validation.min) {
        throw new Error(`Variable ${name} is less than minimum: ${validation.min}`);
      }
      if (typeof value === 'string' && value.length < validation.min) {
        throw new Error(
          `Variable ${name} length is less than minimum: ${validation.min}`
        );
      }
      if (Array.isArray(value) && value.length < validation.min) {
        throw new Error(
          `Variable ${name} array length is less than minimum: ${validation.min}`
        );
      }
    }

    // 最大值验证
    if (validation.max !== undefined) {
      if (typeof value === 'number' && value > validation.max) {
        throw new Error(`Variable ${name} is greater than maximum: ${validation.max}`);
      }
      if (typeof value === 'string' && value.length > validation.max) {
        throw new Error(
          `Variable ${name} length is greater than maximum: ${validation.max}`
        );
      }
      if (Array.isArray(value) && value.length > validation.max) {
        throw new Error(
          `Variable ${name} array length is greater than maximum: ${validation.max}`
        );
      }
    }

    // 枚举验证
    if (validation.enum && !validation.enum.includes(value)) {
      throw new Error(
        `Variable ${name} must be one of: ${validation.enum.join(', ')}`
      );
    }
  }

  /**
   * 替换变量
   */
  private replaceVariables(content: string, context: TemplateContext): string {
    let result = content;

    // 替换简单变量 {{variableName}}
    result = result.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      const value = context.variables[varName];
      return value !== undefined ? String(value) : match;
    });

    // 替换条件语句 {{#if condition}}...{{/if}}
    result = this.replaceConditionals(result, context);

    // 替换循环语句 {{#each items}}...{{/each}}
    result = this.replaceLoops(result, context);

    // 替换辅助函数 {{helper arg1 arg2}}
    result = this.replaceHelpers(result, context);

    return result;
  }

  /**
   * 替换条件语句
   */
  private replaceConditionals(content: string, context: TemplateContext): string {
    const regex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

    return content.replace(regex, (match, condition, body) => {
      const value = context.variables[condition];
      return value ? body : '';
    });
  }

  /**
   * 替换循环语句
   */
  private replaceLoops(content: string, context: TemplateContext): string {
    const regex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

    return content.replace(regex, (match, arrayName, body) => {
      const array = context.variables[arrayName];

      if (!Array.isArray(array)) {
        return '';
      }

      return array
        .map((item, index) => {
          let itemBody = body;

          // 替换 {{this}}
          itemBody = itemBody.replace(/\{\{this\}\}/g, String(item));

          // 替换 {{@index}}
          itemBody = itemBody.replace(/\{\{@index\}\}/g, String(index));

          // 如果 item 是对象，替换 {{this.property}}
          if (typeof item === 'object') {
            for (const [key, value] of Object.entries(item)) {
              const regex = new RegExp(`\\{\\{this\\.${key}\\}\\}`, 'g');
              itemBody = itemBody.replace(regex, String(value));
            }
          }

          return itemBody;
        })
        .join('');
    });
  }

  /**
   * 替换辅助函数
   */
  private replaceHelpers(content: string, context: TemplateContext): string {
    if (!context.helpers) {
      return content;
    }

    const regex = /\{\{(\w+)\s+(.*?)\}\}/g;

    return content.replace(regex, (match, helperName, args) => {
      const helper = context.helpers![helperName];

      if (!helper) {
        return match;
      }

      // 解析参数
      const parsedArgs = args.split(/\s+/).map((arg: string) => {
        // 如果是变量引用
        if (context.variables[arg] !== undefined) {
          return context.variables[arg];
        }
        // 如果是字符串字面量
        if (arg.startsWith('"') && arg.endsWith('"')) {
          return arg.slice(1, -1);
        }
        // 如果是数字
        if (!isNaN(Number(arg))) {
          return Number(arg);
        }
        return arg;
      });

      try {
        return String(helper(...parsedArgs));
      } catch (error) {
        console.error(`Helper ${helperName} failed:`, error);
        return match;
      }
    });
  }

  /**
   * 提取导入语句
   */
  private extractImports(code: string): string[] {
    const imports: string[] = [];
    const importRegex = /^import\s+.*?from\s+['"].*?['"];?$/gm;

    let match;
    while ((match = importRegex.exec(code)) !== null) {
      imports.push(match[0]);
    }

    return imports;
  }

  /**
   * 收集警告
   */
  private collectWarnings(template: Template, context: TemplateContext): string[] {
    const warnings: string[] = [];

    // 检查未使用的变量
    for (const varDef of template.variables) {
      if (!varDef.required && context.variables[varDef.name] === undefined) {
        warnings.push(`Optional variable '${varDef.name}' not provided, using default`);
      }
    }

    // 检查缺失的依赖
    if (template.metadata.dependencies && template.metadata.dependencies.length > 0) {
      warnings.push(
        `This template requires dependencies: ${template.metadata.dependencies.join(', ')}`
      );
    }

    return warnings;
  }

  /**
   * 列出所有模板
   */
  listTemplates(): Template[] {
    return Array.from(this.templates.values());
  }

  /**
   * 导出模板
   */
  exportTemplate(templateId: string, outputPath: string): void {
    const template = this.getTemplate(templateId);

    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const json = JSON.stringify(template, null, 2);
    fs.writeFileSync(outputPath, json, 'utf-8');
  }

  /**
   * 创建模板示例
   */
  createTemplateExample(template: Template, exampleName: string): string {
    const example = template.metadata.examples?.find((e) => e.name === exampleName);

    if (!example) {
      throw new Error(`Example not found: ${exampleName}`);
    }

    const context: TemplateContext = {
      variables: example.variables,
    };

    return this.replaceVariables(template.content, context);
  }

  /**
   * 验证模板语法
   */
  validateTemplateSyntax(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查未闭合的标签
    const openIf = (content.match(/\{\{#if/g) || []).length;
    const closeIf = (content.match(/\{\{\/if\}\}/g) || []).length;
    if (openIf !== closeIf) {
      errors.push(`Unclosed {{#if}} tags: ${openIf} open, ${closeIf} close`);
    }

    const openEach = (content.match(/\{\{#each/g) || []).length;
    const closeEach = (content.match(/\{\{\/each\}\}/g) || []).length;
    if (openEach !== closeEach) {
      errors.push(`Unclosed {{#each}} tags: ${openEach} open, ${closeEach} close`);
    }

    // 检查变量语法
    const invalidVars = content.match(/\{\{[^}]*\{\{/g);
    if (invalidVars) {
      errors.push(`Invalid nested variables: ${invalidVars.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
