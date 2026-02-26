/**
 * 代码风格匹配器
 * 从现有代码中学习风格并应用到生成的代码
 */

import * as fs from 'fs';
import * as path from 'path';

export interface CodeStyle {
  indent: 'spaces' | 'tabs';
  indentSize: number;
  quotes: 'single' | 'double';
  semi: boolean;
  trailingComma: 'none' | 'es5' | 'all';
  lineEnding: 'lf' | 'crlf';
  maxLineLength?: number;
  bracketSpacing: boolean;
  arrowParens: 'avoid' | 'always';
}

export interface NamingConventions {
  components: 'PascalCase' | 'kebab-case';
  files: 'PascalCase' | 'kebab-case' | 'camelCase';
  variables: 'camelCase' | 'snake_case';
  constants: 'UPPER_CASE' | 'camelCase';
  cssClasses: 'kebab-case' | 'camelCase' | 'BEM';
}

/**
 * 代码风格匹配器
 */
export class CodeStyleMatcher {
  private projectRoot: string;
  private cachedStyle?: CodeStyle;
  private cachedNaming?: NamingConventions;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * 提取项目代码风格
   */
  async extractStyle(): Promise<CodeStyle> {
    if (this.cachedStyle) {
      return this.cachedStyle;
    }

    // 默认风格
    const style: CodeStyle = {
      indent: 'spaces',
      indentSize: 2,
      quotes: 'single',
      semi: true,
      trailingComma: 'es5',
      lineEnding: 'lf',
      bracketSpacing: true,
      arrowParens: 'avoid',
    };

    // 从配置文件读取
    const configStyle = await this.extractFromConfig();
    if (configStyle) {
      Object.assign(style, configStyle);
      this.cachedStyle = style;
      return style;
    }

    // 从现有代码中学习
    const learnedStyle = await this.learnFromCode();
    if (learnedStyle) {
      Object.assign(style, learnedStyle);
    }

    this.cachedStyle = style;
    return style;
  }

  /**
   * 提取命名约定
   */
  async extractNamingConventions(): Promise<NamingConventions> {
    if (this.cachedNaming) {
      return this.cachedNaming;
    }

    const naming: NamingConventions = {
      components: 'PascalCase',
      files: 'PascalCase',
      variables: 'camelCase',
      constants: 'UPPER_CASE',
      cssClasses: 'kebab-case',
    };

    // 从现有代码中学习命名约定
    const learned = await this.learnNamingFromCode();
    if (learned) {
      Object.assign(naming, learned);
    }

    this.cachedNaming = naming;
    return naming;
  }

  /**
   * 应用风格到代码
   */
  applyStyle(code: string, style?: CodeStyle): string {
    const targetStyle = style || this.cachedStyle;
    if (!targetStyle) {
      return code;
    }

    let result = code;

    // 应用缩进
    result = this.applyIndent(result, targetStyle);

    // 应用引号
    result = this.applyQuotes(result, targetStyle);

    // 应用分号
    result = this.applySemicolons(result, targetStyle);

    // 应用行尾
    result = this.applyLineEnding(result, targetStyle);

    return result;
  }

  /**
   * 从配置文件提取风格
   */
  private async extractFromConfig(): Promise<Partial<CodeStyle> | null> {
    // 尝试读取 Prettier 配置
    const prettierConfig = this.readPrettierConfig();
    if (prettierConfig) {
      return this.convertPrettierConfig(prettierConfig);
    }

    // 尝试读取 ESLint 配置
    const eslintConfig = this.readESLintConfig();
    if (eslintConfig) {
      return this.convertESLintConfig(eslintConfig);
    }

    return null;
  }

  /**
   * 读取 Prettier 配置
   */
  private readPrettierConfig(): any {
    const configPaths = [
      '.prettierrc',
      '.prettierrc.json',
      '.prettierrc.js',
      'prettier.config.js',
    ];

    for (const configPath of configPaths) {
      const fullPath = path.join(this.projectRoot, configPath);
      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (configPath.endsWith('.js')) {
            // 简单解析 JS 配置
            const match = content.match(/module\.exports\s*=\s*({[\s\S]*})/);
            if (match) {
              return eval(`(${match[1]})`);
            }
          } else {
            return JSON.parse(content);
          }
        } catch {
          // 解析失败，继续尝试下一个
        }
      }
    }

    return null;
  }

  /**
   * 读取 ESLint 配置
   */
  private readESLintConfig(): any {
    const configPaths = ['.eslintrc.js', '.eslintrc.json', '.eslintrc'];

    for (const configPath of configPaths) {
      const fullPath = path.join(this.projectRoot, configPath);
      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (configPath.endsWith('.js')) {
            const match = content.match(/module\.exports\s*=\s*({[\s\S]*})/);
            if (match) {
              return eval(`(${match[1]})`);
            }
          } else {
            return JSON.parse(content);
          }
        } catch {
          // 解析失败
        }
      }
    }

    return null;
  }

  /**
   * 转换 Prettier 配置
   */
  private convertPrettierConfig(config: any): Partial<CodeStyle> {
    return {
      indent: config.useTabs ? 'tabs' : 'spaces',
      indentSize: config.tabWidth || 2,
      quotes: config.singleQuote ? 'single' : 'double',
      semi: config.semi !== false,
      trailingComma: config.trailingComma || 'es5',
      lineEnding: config.endOfLine === 'crlf' ? 'crlf' : 'lf',
      maxLineLength: config.printWidth,
      bracketSpacing: config.bracketSpacing !== false,
      arrowParens: config.arrowParens || 'avoid',
    };
  }

  /**
   * 转换 ESLint 配置
   */
  private convertESLintConfig(config: any): Partial<CodeStyle> {
    const rules = config.rules || {};
    const style: Partial<CodeStyle> = {};

    // 缩进规则
    if (rules.indent) {
      const indentRule = Array.isArray(rules.indent) ? rules.indent : [rules.indent];
      if (indentRule[1] === 'tab') {
        style.indent = 'tabs';
      } else {
        style.indent = 'spaces';
        style.indentSize = typeof indentRule[1] === 'number' ? indentRule[1] : 2;
      }
    }

    // 引号规则
    if (rules.quotes) {
      const quotesRule = Array.isArray(rules.quotes) ? rules.quotes : [rules.quotes];
      style.quotes = quotesRule[1] === 'single' ? 'single' : 'double';
    }

    // 分号规则
    if (rules.semi) {
      const semiRule = Array.isArray(rules.semi) ? rules.semi : [rules.semi];
      style.semi = semiRule[1] !== 'never';
    }

    return style;
  }

  /**
   * 从现有代码中学习风格
   */
  private async learnFromCode(): Promise<Partial<CodeStyle> | null> {
    const srcDir = this.findSrcDirectory();
    if (!srcDir) {
      return null;
    }

    const files = this.findCodeFiles(srcDir, 10); // 采样 10 个文件
    if (files.length === 0) {
      return null;
    }

    const samples = files.map((file) => {
      try {
        return fs.readFileSync(file, 'utf-8');
      } catch {
        return null;
      }
    }).filter((content): content is string => content !== null);

    if (samples.length === 0) {
      return null;
    }

    return {
      indent: this.detectIndent(samples),
      indentSize: this.detectIndentSize(samples),
      quotes: this.detectQuotes(samples),
      semi: this.detectSemicolons(samples),
      lineEnding: this.detectLineEnding(samples),
    };
  }

  /**
   * 从代码中学习命名约定
   */
  private async learnNamingFromCode(): Promise<Partial<NamingConventions> | null> {
    const srcDir = this.findSrcDirectory();
    if (!srcDir) {
      return null;
    }

    const files = this.findCodeFiles(srcDir, 20);
    if (files.length === 0) {
      return null;
    }

    return {
      components: this.detectComponentNaming(files),
      files: this.detectFileNaming(files),
    };
  }

  /**
   * 查找源代码目录
   */
  private findSrcDirectory(): string | null {
    const possibleDirs = ['src', 'app', 'lib', 'components'];

    for (const dir of possibleDirs) {
      const dirPath = path.join(this.projectRoot, dir);
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        return dirPath;
      }
    }

    return null;
  }

  /**
   * 查找代码文件
   */
  private findCodeFiles(dir: string, limit: number): string[] {
    const files: string[] = [];
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.vue'];

    const scan = (currentDir: string, depth = 0) => {
      if (depth > 5 || files.length >= limit) {
        return;
      }

      try {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
          if (files.length >= limit) {
            break;
          }

          const fullPath = path.join(currentDir, entry.name);

          if (entry.isDirectory()) {
            const skipDirs = ['node_modules', 'dist', 'build', '.git'];
            if (!skipDirs.includes(entry.name)) {
              scan(fullPath, depth + 1);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (extensions.includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch {
        // 忽略错误
      }
    };

    scan(dir);
    return files;
  }

  /**
   * 检测缩进类型
   */
  private detectIndent(samples: string[]): 'spaces' | 'tabs' {
    let spacesCount = 0;
    let tabsCount = 0;

    for (const sample of samples) {
      const lines = sample.split('\n');
      for (const line of lines) {
        if (line.startsWith('  ')) spacesCount++;
        if (line.startsWith('\t')) tabsCount++;
      }
    }

    return spacesCount > tabsCount ? 'spaces' : 'tabs';
  }

  /**
   * 检测缩进大小
   */
  private detectIndentSize(samples: string[]): number {
    const sizes: number[] = [];

    for (const sample of samples) {
      const lines = sample.split('\n');
      for (const line of lines) {
        const match = line.match(/^( +)/);
        if (match) {
          sizes.push(match[1].length);
        }
      }
    }

    if (sizes.length === 0) {
      return 2;
    }

    // 找到最常见的缩进大小
    const counts = new Map<number, number>();
    for (const size of sizes) {
      counts.set(size, (counts.get(size) || 0) + 1);
    }

    let maxCount = 0;
    let mostCommon = 2;
    for (const [size, count] of counts) {
      if (count > maxCount && size > 0 && size <= 8) {
        maxCount = count;
        mostCommon = size;
      }
    }

    return mostCommon;
  }

  /**
   * 检测引号风格
   */
  private detectQuotes(samples: string[]): 'single' | 'double' {
    let singleCount = 0;
    let doubleCount = 0;

    for (const sample of samples) {
      singleCount += (sample.match(/'/g) || []).length;
      doubleCount += (sample.match(/"/g) || []).length;
    }

    return singleCount > doubleCount ? 'single' : 'double';
  }

  /**
   * 检测分号使用
   */
  private detectSemicolons(samples: string[]): boolean {
    let withSemi = 0;
    let withoutSemi = 0;

    for (const sample of samples) {
      const lines = sample.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('/*')) {
          if (trimmed.endsWith(';')) withSemi++;
          else if (trimmed.endsWith('}') || trimmed.endsWith('{')) {
            // 忽略大括号
          } else {
            withoutSemi++;
          }
        }
      }
    }

    return withSemi > withoutSemi;
  }

  /**
   * 检测行尾符
   */
  private detectLineEnding(samples: string[]): 'lf' | 'crlf' {
    let lfCount = 0;
    let crlfCount = 0;

    for (const sample of samples) {
      crlfCount += (sample.match(/\r\n/g) || []).length;
      lfCount += (sample.match(/(?<!\r)\n/g) || []).length;
    }

    return crlfCount > lfCount ? 'crlf' : 'lf';
  }

  /**
   * 检测组件命名约定
   */
  private detectComponentNaming(files: string[]): 'PascalCase' | 'kebab-case' {
    let pascalCount = 0;
    let kebabCount = 0;

    for (const file of files) {
      const basename = path.basename(file, path.extname(file));
      if (/^[A-Z][a-zA-Z0-9]*$/.test(basename)) {
        pascalCount++;
      } else if (/^[a-z][a-z0-9-]*$/.test(basename)) {
        kebabCount++;
      }
    }

    return pascalCount > kebabCount ? 'PascalCase' : 'kebab-case';
  }

  /**
   * 检测文件命名约定
   */
  private detectFileNaming(files: string[]): 'PascalCase' | 'kebab-case' | 'camelCase' {
    let pascalCount = 0;
    let kebabCount = 0;
    let camelCount = 0;

    for (const file of files) {
      const basename = path.basename(file, path.extname(file));
      if (/^[A-Z][a-zA-Z0-9]*$/.test(basename)) {
        pascalCount++;
      } else if (/^[a-z][a-z0-9-]*$/.test(basename)) {
        kebabCount++;
      } else if (/^[a-z][a-zA-Z0-9]*$/.test(basename)) {
        camelCount++;
      }
    }

    const max = Math.max(pascalCount, kebabCount, camelCount);
    if (max === pascalCount) return 'PascalCase';
    if (max === kebabCount) return 'kebab-case';
    return 'camelCase';
  }

  /**
   * 应用缩进
   */
  private applyIndent(code: string, style: CodeStyle): string {
    const lines = code.split('\n');
    const indentChar = style.indent === 'tabs' ? '\t' : ' '.repeat(style.indentSize);

    return lines
      .map((line) => {
        // 检测当前缩进级别
        const match = line.match(/^(\s*)/);
        if (!match) return line;

        const currentIndent = match[1];
        const level = currentIndent.length / (style.indent === 'tabs' ? 1 : 2);
        const newIndent = indentChar.repeat(Math.floor(level));

        return newIndent + line.trim();
      })
      .join('\n');
  }

  /**
   * 应用引号
   */
  private applyQuotes(code: string, style: CodeStyle): string {
    const targetQuote = style.quotes === 'single' ? "'" : '"';
    const sourceQuote = style.quotes === 'single' ? '"' : "'";

    // 简单替换（实际应该使用 AST）
    return code.replace(
      new RegExp(`${sourceQuote}([^${sourceQuote}]*)${sourceQuote}`, 'g'),
      `${targetQuote}$1${targetQuote}`
    );
  }

  /**
   * 应用分号
   */
  private applySemicolons(code: string, style: CodeStyle): string {
    const lines = code.split('\n');

    return lines
      .map((line) => {
        const trimmed = line.trimEnd();
        if (trimmed.length === 0) return line;

        // 跳过注释和大括号
        if (
          trimmed.startsWith('//') ||
          trimmed.startsWith('/*') ||
          trimmed.endsWith('{') ||
          trimmed.endsWith('}')
        ) {
          return line;
        }

        if (style.semi) {
          // 添加分号
          if (!trimmed.endsWith(';')) {
            return trimmed + ';';
          }
        } else {
          // 移除分号
          if (trimmed.endsWith(';')) {
            return trimmed.slice(0, -1);
          }
        }

        return line;
      })
      .join('\n');
  }

  /**
   * 应用行尾符
   */
  private applyLineEnding(code: string, style: CodeStyle): string {
    if (style.lineEnding === 'crlf') {
      return code.replace(/\r?\n/g, '\r\n');
    } else {
      return code.replace(/\r\n/g, '\n');
    }
  }
}
