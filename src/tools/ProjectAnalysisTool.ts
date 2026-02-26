import * as fs from 'fs';
import * as path from 'path';
import type { Tool, ToolMetadata } from './types';

export interface ProjectAnalysisResult {
  framework?: 'react' | 'vue' | 'unknown';
  hasTypeScript: boolean;
  hasESLint: boolean;
  hasPrettier: boolean;
  hasTailwind: boolean;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  codeStyle?: {
    indent: 'spaces' | 'tabs';
    indentSize?: number;
    quotes: 'single' | 'double';
    semi: boolean;
  };
  pathAliases?: Record<string, string>;
  components?: ComponentInfo[];
  srcDirectory?: string;
}

export interface ComponentInfo {
  name: string;
  path: string;
  type: 'component' | 'page' | 'layout';
  framework: 'react' | 'vue';
  hasStyles: boolean;
  hasTests: boolean;
}

/**
 * 项目分析工具
 * 分析项目结构、框架、代码风格等
 */
export class ProjectAnalysisTool implements Tool {
  name = 'project-analysis';
  description = 'Analyze project structure and code style';
  category = 'analysis' as const;
  capabilities = ['detect_framework', 'analyze_style', 'find_dependencies'];

  constructor(private projectRoot: string) {}

  /**
   * 检查工具是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      // 检查项目根目录是否存在
      return fs.existsSync(this.projectRoot);
    } catch {
      return false;
    }
  }

  /**
   * 执行工具
   */
  async execute(): Promise<ProjectAnalysisResult> {
    const result: ProjectAnalysisResult = {
      hasTypeScript: false,
      hasESLint: false,
      hasPrettier: false,
      hasTailwind: false,
      dependencies: {},
      devDependencies: {},
    };

    // 分析 package.json
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      result.dependencies = packageJson.dependencies || {};
      result.devDependencies = packageJson.devDependencies || {};

      // 检测框架
      if (result.dependencies['react'] || result.devDependencies['react']) {
        result.framework = 'react';
      } else if (result.dependencies['vue'] || result.devDependencies['vue']) {
        result.framework = 'vue';
      } else {
        result.framework = 'unknown';
      }

      // 检测 TypeScript
      result.hasTypeScript =
        !!result.dependencies['typescript'] || !!result.devDependencies['typescript'];

      // 检测 Tailwind
      result.hasTailwind =
        !!result.dependencies['tailwindcss'] || !!result.devDependencies['tailwindcss'];
    }

    // 检测 ESLint
    result.hasESLint =
      fs.existsSync(path.join(this.projectRoot, '.eslintrc.js')) ||
      fs.existsSync(path.join(this.projectRoot, '.eslintrc.json')) ||
      fs.existsSync(path.join(this.projectRoot, '.eslintrc.yml'));

    // 检测 Prettier
    result.hasPrettier =
      fs.existsSync(path.join(this.projectRoot, '.prettierrc')) ||
      fs.existsSync(path.join(this.projectRoot, '.prettierrc.json')) ||
      fs.existsSync(path.join(this.projectRoot, '.prettierrc.js'));

    // 分析代码风格
    if (result.hasPrettier) {
      result.codeStyle = this.analyzePrettierConfig();
    } else if (result.hasESLint) {
      result.codeStyle = this.analyzeESLintConfig();
    }

    // 分析路径别名
    result.pathAliases = this.analyzePathAliases();

    // 发现组件库
    if (result.framework && result.framework !== 'unknown') {
      result.components = this.discoverComponents(result.framework);
      result.srcDirectory = this.findSrcDirectory();
    }

    return result;
  }

  /**
   * 获取工具元数据
   */
  getMetadata(): ToolMetadata {
    return {
      version: '1.0.0',
      author: 'Figma-to-Code Agent',
      performance: {
        avgDuration: 100, // 平均 100ms
        reliability: 0.99,
      },
      cost: {
        apiCallsPerExecution: 0,
      },
    };
  }

  /**
   * 分析 Prettier 配置
   */
  private analyzePrettierConfig(): ProjectAnalysisResult['codeStyle'] {
    const prettierPaths = [
      path.join(this.projectRoot, '.prettierrc'),
      path.join(this.projectRoot, '.prettierrc.json'),
      path.join(this.projectRoot, '.prettierrc.js'),
    ];

    for (const configPath of prettierPaths) {
      if (fs.existsSync(configPath)) {
        try {
          const content = fs.readFileSync(configPath, 'utf-8');
          const config = configPath.endsWith('.js')
            ? this.parseJSConfig(content)
            : JSON.parse(content);

          return {
            indent: config.useTabs ? 'tabs' : 'spaces',
            indentSize: config.tabWidth || 2,
            quotes: config.singleQuote ? 'single' : 'double',
            semi: config.semi !== false,
          };
        } catch {
          // 解析失败，使用默认值
        }
      }
    }

    return undefined;
  }

  /**
   * 分析 ESLint 配置
   */
  private analyzeESLintConfig(): ProjectAnalysisResult['codeStyle'] {
    const eslintPaths = [
      path.join(this.projectRoot, '.eslintrc.js'),
      path.join(this.projectRoot, '.eslintrc.json'),
    ];

    for (const configPath of eslintPaths) {
      if (fs.existsSync(configPath)) {
        try {
          const content = fs.readFileSync(configPath, 'utf-8');
          const config = configPath.endsWith('.js')
            ? this.parseJSConfig(content)
            : JSON.parse(content);

          const rules = config.rules || {};

          return {
            indent: 'spaces',
            indentSize: this.extractIndentSize(rules.indent),
            quotes: this.extractQuotes(rules.quotes),
            semi: this.extractSemi(rules.semi),
          };
        } catch {
          // 解析失败，使用默认值
        }
      }
    }

    return undefined;
  }

  /**
   * 分析路径别名
   */
  private analyzePathAliases(): Record<string, string> | undefined {
    const tsconfigPath = path.join(this.projectRoot, 'tsconfig.json');
    const jsconfigPath = path.join(this.projectRoot, 'jsconfig.json');

    const configPath = fs.existsSync(tsconfigPath)
      ? tsconfigPath
      : fs.existsSync(jsconfigPath)
        ? jsconfigPath
        : null;

    if (!configPath) {
      return undefined;
    }

    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);
      const paths = config.compilerOptions?.paths;

      if (!paths) {
        return undefined;
      }

      // 转换路径别名格式
      const aliases: Record<string, string> = {};
      for (const [alias, targets] of Object.entries(paths)) {
        if (Array.isArray(targets) && targets.length > 0) {
          // 移除通配符
          const cleanAlias = alias.replace('/*', '');
          const cleanTarget = (targets[0] as string).replace('/*', '');
          aliases[cleanAlias] = cleanTarget;
        }
      }

      return aliases;
    } catch {
      return undefined;
    }
  }

  /**
   * 解析 JS 配置文件（简单实现）
   */
  private parseJSConfig(content: string): any {
    // 简单的正则提取，不是完整的 JS 解析器
    try {
      const match = content.match(/module\.exports\s*=\s*({[\s\S]*})/);
      if (match) {
        // 使用 eval 解析（注意：这在生产环境中不安全）
        // 这里只是一个简单实现，实际应该使用更安全的方法
        return eval(`(${match[1]})`);
      }
    } catch {
      // 解析失败
    }
    return {};
  }

  /**
   * 提取缩进大小
   */
  private extractIndentSize(rule: any): number {
    if (Array.isArray(rule) && rule.length > 1) {
      return typeof rule[1] === 'number' ? rule[1] : 2;
    }
    return 2;
  }

  /**
   * 提取引号风格
   */
  private extractQuotes(rule: any): 'single' | 'double' {
    if (Array.isArray(rule) && rule.length > 1) {
      return rule[1] === 'single' ? 'single' : 'double';
    }
    return 'single';
  }

  /**
   * 提取分号规则
   */
  private extractSemi(rule: any): boolean {
    if (Array.isArray(rule) && rule.length > 1) {
      return rule[1] !== 'never';
    }
    return true;
  }

  /**
   * 查找 src 目录
   */
  private findSrcDirectory(): string | undefined {
    const possibleDirs = ['src', 'app', 'lib', 'components'];

    for (const dir of possibleDirs) {
      const dirPath = path.join(this.projectRoot, dir);
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        return dir;
      }
    }

    return undefined;
  }

  /**
   * 发现项目中的组件
   */
  private discoverComponents(framework: 'react' | 'vue'): ComponentInfo[] {
    const components: ComponentInfo[] = [];
    const srcDir = this.findSrcDirectory();

    if (!srcDir) {
      return components;
    }

    const srcPath = path.join(this.projectRoot, srcDir);
    const extensions = framework === 'react' ? ['.tsx', '.jsx'] : ['.vue'];

    // 递归扫描组件
    this.scanDirectory(srcPath, srcPath, extensions, framework, components);

    return components;
  }

  /**
   * 递归扫描目录查找组件
   */
  private scanDirectory(
    dirPath: string,
    basePath: string,
    extensions: string[],
    framework: 'react' | 'vue',
    components: ComponentInfo[],
    depth = 0
  ): void {
    // 限制递归深度
    if (depth > 10) {
      return;
    }

    // 跳过 node_modules 和其他不需要的目录
    const skipDirs = ['node_modules', 'dist', 'build', '.git', 'coverage', '__tests__'];
    const dirName = path.basename(dirPath);
    if (skipDirs.includes(dirName)) {
      return;
    }

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          this.scanDirectory(fullPath, basePath, extensions, framework, components, depth + 1);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            const componentInfo = this.analyzeComponent(fullPath, basePath, framework);
            if (componentInfo) {
              components.push(componentInfo);
            }
          }
        }
      }
    } catch (error) {
      // 忽略无法读取的目录
    }
  }

  /**
   * 分析单个组件文件
   */
  private analyzeComponent(
    filePath: string,
    basePath: string,
    framework: 'react' | 'vue'
  ): ComponentInfo | null {
    try {
      const relativePath = path.relative(basePath, filePath);
      const fileName = path.basename(filePath, path.extname(filePath));

      // 判断组件类型
      let type: ComponentInfo['type'] = 'component';
      if (relativePath.includes('pages') || relativePath.includes('views')) {
        type = 'page';
      } else if (relativePath.includes('layouts') || relativePath.includes('layout')) {
        type = 'layout';
      }

      // 检查是否有样式文件
      const hasStyles = this.hasStyleFile(filePath);

      // 检查是否有测试文件
      const hasTests = this.hasTestFile(filePath);

      return {
        name: fileName,
        path: relativePath,
        type,
        framework,
        hasStyles,
        hasTests,
      };
    } catch {
      return null;
    }
  }

  /**
   * 检查是否有对应的样式文件
   */
  private hasStyleFile(componentPath: string): boolean {
    const dir = path.dirname(componentPath);
    const baseName = path.basename(componentPath, path.extname(componentPath));

    const styleExtensions = ['.css', '.scss', '.sass', '.less', '.module.css', '.module.scss'];

    for (const ext of styleExtensions) {
      const stylePath = path.join(dir, baseName + ext);
      if (fs.existsSync(stylePath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 检查是否有对应的测试文件
   */
  private hasTestFile(componentPath: string): boolean {
    const dir = path.dirname(componentPath);
    const baseName = path.basename(componentPath, path.extname(componentPath));
    const ext = path.extname(componentPath);

    const testPatterns = [
      `${baseName}.test${ext}`,
      `${baseName}.spec${ext}`,
      `${baseName}.test.ts`,
      `${baseName}.spec.ts`,
      `${baseName}.test.tsx`,
      `${baseName}.spec.tsx`,
    ];

    for (const pattern of testPatterns) {
      const testPath = path.join(dir, pattern);
      if (fs.existsSync(testPath)) {
        return true;
      }
    }

    // 检查 __tests__ 目录
    const testsDir = path.join(dir, '__tests__');
    if (fs.existsSync(testsDir)) {
      for (const pattern of testPatterns) {
        const testPath = path.join(testsDir, pattern);
        if (fs.existsSync(testPath)) {
          return true;
        }
      }
    }

    return false;
  }
}
