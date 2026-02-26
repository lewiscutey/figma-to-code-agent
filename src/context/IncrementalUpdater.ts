/**
 * 增量更新器
 * 实现代码差异分析和选择性更新
 */

import * as fs from 'fs';
import * as path from 'path';

export interface CodeDiff {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  path: string;
  oldContent?: string;
  newContent?: string;
  changes: Change[];
}

export interface Change {
  type: 'structure' | 'style' | 'content' | 'business_logic';
  location: string;
  description: string;
  oldValue?: string;
  newValue?: string;
  canAutoUpdate: boolean;
  risk: 'low' | 'medium' | 'high';
}

export interface UpdateStrategy {
  updateStructure: boolean;
  updateStyles: boolean;
  updateContent: boolean;
  preserveBusinessLogic: boolean;
  backupBeforeUpdate: boolean;
}

export interface UpdateResult {
  success: boolean;
  filesUpdated: string[];
  filesSkipped: string[];
  errors: string[];
  report: DiffReport;
}

export interface DiffReport {
  totalChanges: number;
  autoUpdatable: number;
  requiresReview: number;
  highRisk: number;
  changes: CodeDiff[];
}

/**
 * 增量更新器
 */
export class IncrementalUpdater {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * 分析代码差异
   */
  async analyzeDiff(
    designData: any,
    existingFiles: Map<string, string>
  ): Promise<DiffReport> {
    const changes: CodeDiff[] = [];
    let totalChanges = 0;
    let autoUpdatable = 0;
    let requiresReview = 0;
    let highRisk = 0;

    for (const [filePath, newContent] of Object.entries(designData.files || {})) {
      const oldContent = existingFiles.get(filePath);

      if (!oldContent) {
        // 新文件
        changes.push({
          type: 'added',
          path: filePath,
          newContent: newContent as string,
          changes: [
            {
              type: 'structure',
              location: filePath,
              description: 'New file',
              newValue: newContent as string,
              canAutoUpdate: true,
              risk: 'low',
            },
          ],
        });
        totalChanges++;
        autoUpdatable++;
      } else if (oldContent !== newContent) {
        // 文件已修改
        const fileChanges = this.detectChanges(oldContent, newContent as string);
        const diff: CodeDiff = {
          type: 'modified',
          path: filePath,
          oldContent,
          newContent: newContent as string,
          changes: fileChanges,
        };

        changes.push(diff);
        totalChanges += fileChanges.length;

        for (const change of fileChanges) {
          if (change.canAutoUpdate) {
            autoUpdatable++;
          } else {
            requiresReview++;
          }
          if (change.risk === 'high') {
            highRisk++;
          }
        }
      } else {
        // 文件未变化
        changes.push({
          type: 'unchanged',
          path: filePath,
          oldContent,
          newContent: newContent as string,
          changes: [],
        });
      }
    }

    // 检查删除的文件
    for (const [filePath, oldContent] of existingFiles) {
      if (!(filePath in (designData.files || {}))) {
        changes.push({
          type: 'removed',
          path: filePath,
          oldContent,
          changes: [
            {
              type: 'structure',
              location: filePath,
              description: 'File removed',
              oldValue: oldContent,
              canAutoUpdate: false,
              risk: 'high',
            },
          ],
        });
        totalChanges++;
        requiresReview++;
        highRisk++;
      }
    }

    return {
      totalChanges,
      autoUpdatable,
      requiresReview,
      highRisk,
      changes,
    };
  }

  /**
   * 执行选择性更新
   */
  async applyUpdate(
    report: DiffReport,
    strategy: UpdateStrategy
  ): Promise<UpdateResult> {
    const result: UpdateResult = {
      success: true,
      filesUpdated: [],
      filesSkipped: [],
      errors: [],
      report,
    };

    for (const diff of report.changes) {
      try {
        if (diff.type === 'unchanged') {
          continue;
        }

        // 检查是否应该更新
        const shouldUpdate = this.shouldUpdateFile(diff, strategy);

        if (!shouldUpdate) {
          result.filesSkipped.push(diff.path);
          continue;
        }

        // 备份
        if (strategy.backupBeforeUpdate && diff.oldContent) {
          await this.backupFile(diff.path, diff.oldContent);
        }

        // 应用更新
        if (diff.type === 'added' || diff.type === 'modified') {
          await this.updateFile(diff, strategy);
          result.filesUpdated.push(diff.path);
        } else if (diff.type === 'removed') {
          // 删除文件需要用户确认
          result.filesSkipped.push(diff.path);
        }
      } catch (error) {
        result.success = false;
        result.errors.push(`Failed to update ${diff.path}: ${(error as Error).message}`);
      }
    }

    return result;
  }

  /**
   * 生成差异报告
   */
  generateReport(report: DiffReport): string {
    const lines: string[] = [];

    lines.push('# Code Diff Report\n');
    lines.push(`Total Changes: ${report.totalChanges}`);
    lines.push(`Auto-updatable: ${report.autoUpdatable}`);
    lines.push(`Requires Review: ${report.requiresReview}`);
    lines.push(`High Risk: ${report.highRisk}\n`);

    // 按类型分组
    const added = report.changes.filter((c) => c.type === 'added');
    const modified = report.changes.filter((c) => c.type === 'modified');
    const removed = report.changes.filter((c) => c.type === 'removed');

    if (added.length > 0) {
      lines.push(`## Added Files (${added.length})\n`);
      for (const diff of added) {
        lines.push(`- ${diff.path}`);
      }
      lines.push('');
    }

    if (modified.length > 0) {
      lines.push(`## Modified Files (${modified.length})\n`);
      for (const diff of modified) {
        lines.push(`### ${diff.path}\n`);
        for (const change of diff.changes) {
          const riskBadge = change.risk === 'high' ? '⚠️' : change.risk === 'medium' ? '⚡' : '✓';
          const autoBadge = change.canAutoUpdate ? '🤖' : '👤';
          lines.push(`${riskBadge} ${autoBadge} **${change.type}**: ${change.description}`);
        }
        lines.push('');
      }
    }

    if (removed.length > 0) {
      lines.push(`## Removed Files (${removed.length})\n`);
      for (const diff of removed) {
        lines.push(`- ⚠️ ${diff.path}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * 检测文件变化
   */
  private detectChanges(oldContent: string, newContent: string): Change[] {
    const changes: Change[] = [];

    // 简单的行级差异检测
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    // 检测结构变化（import、export、函数定义等）
    const structureChanges = this.detectStructureChanges(oldLines, newLines);
    changes.push(...structureChanges);

    // 检测样式变化（CSS、className等）
    const styleChanges = this.detectStyleChanges(oldLines, newLines);
    changes.push(...styleChanges);

    // 检测业务逻辑变化
    const logicChanges = this.detectBusinessLogicChanges(oldLines, newLines);
    changes.push(...logicChanges);

    return changes;
  }

  /**
   * 检测结构变化
   */
  private detectStructureChanges(oldLines: string[], newLines: string[]): Change[] {
    const changes: Change[] = [];

    const oldImports = oldLines.filter((line) => line.trim().startsWith('import'));
    const newImports = newLines.filter((line) => line.trim().startsWith('import'));

    if (oldImports.length !== newImports.length) {
      changes.push({
        type: 'structure',
        location: 'imports',
        description: 'Import statements changed',
        oldValue: oldImports.join('\n'),
        newValue: newImports.join('\n'),
        canAutoUpdate: true,
        risk: 'low',
      });
    }

    // 检测函数/组件定义变化
    const oldFunctions = this.extractFunctions(oldLines);
    const newFunctions = this.extractFunctions(newLines);

    if (oldFunctions.length !== newFunctions.length) {
      changes.push({
        type: 'structure',
        location: 'functions',
        description: 'Function/component definitions changed',
        canAutoUpdate: false,
        risk: 'medium',
      });
    }

    return changes;
  }

  /**
   * 检测样式变化
   */
  private detectStyleChanges(oldLines: string[], newLines: string[]): Change[] {
    const changes: Change[] = [];

    const oldStyles = oldLines.filter(
      (line) => line.includes('className') || line.includes('style=')
    );
    const newStyles = newLines.filter(
      (line) => line.includes('className') || line.includes('style=')
    );

    if (oldStyles.join('') !== newStyles.join('')) {
      changes.push({
        type: 'style',
        location: 'styles',
        description: 'Style/className changes detected',
        canAutoUpdate: true,
        risk: 'low',
      });
    }

    return changes;
  }

  /**
   * 检测业务逻辑变化
   */
  private detectBusinessLogicChanges(oldLines: string[], newLines: string[]): Change[] {
    const changes: Change[] = [];

    // 检测事件处理器
    const oldHandlers = oldLines.filter((line) => line.includes('onClick') || line.includes('onChange'));
    const newHandlers = newLines.filter((line) => line.includes('onClick') || line.includes('onChange'));

    if (oldHandlers.length > 0 && oldHandlers.join('') !== newHandlers.join('')) {
      changes.push({
        type: 'business_logic',
        location: 'event handlers',
        description: 'Event handlers modified',
        canAutoUpdate: false,
        risk: 'high',
      });
    }

    // 检测 API 调用
    const oldAPICalls = oldLines.filter((line) => line.includes('fetch') || line.includes('axios'));
    const newAPICalls = newLines.filter((line) => line.includes('fetch') || line.includes('axios'));

    if (oldAPICalls.length > 0 && oldAPICalls.join('') !== newAPICalls.join('')) {
      changes.push({
        type: 'business_logic',
        location: 'API calls',
        description: 'API calls modified',
        canAutoUpdate: false,
        risk: 'high',
      });
    }

    return changes;
  }

  /**
   * 提取函数定义
   */
  private extractFunctions(lines: string[]): string[] {
    const functions: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed.startsWith('function ') ||
        trimmed.startsWith('const ') && trimmed.includes('=>') ||
        trimmed.startsWith('export function ') ||
        trimmed.startsWith('export const ') && trimmed.includes('=>')
      ) {
        functions.push(trimmed);
      }
    }

    return functions;
  }

  /**
   * 判断是否应该更新文件
   */
  private shouldUpdateFile(diff: CodeDiff, strategy: UpdateStrategy): boolean {
    // 新文件总是添加
    if (diff.type === 'added') {
      return true;
    }

    // 删除文件需要手动确认
    if (diff.type === 'removed') {
      return false;
    }

    // 检查变化类型
    for (const change of diff.changes) {
      // 业务逻辑变化需要保留
      if (change.type === 'business_logic' && strategy.preserveBusinessLogic) {
        if (!change.canAutoUpdate) {
          return false;
        }
      }

      // 高风险变化需要审查
      if (change.risk === 'high' && !change.canAutoUpdate) {
        return false;
      }

      // 根据策略决定是否更新
      if (change.type === 'structure' && !strategy.updateStructure) {
        return false;
      }
      if (change.type === 'style' && !strategy.updateStyles) {
        return false;
      }
      if (change.type === 'content' && !strategy.updateContent) {
        return false;
      }
    }

    return true;
  }

  /**
   * 备份文件
   */
  private async backupFile(filePath: string, content: string): Promise<void> {
    const backupDir = path.join(this.projectRoot, '.figma-backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(
      backupDir,
      `${path.basename(filePath)}.${timestamp}.backup`
    );

    fs.writeFileSync(backupPath, content, 'utf-8');
  }

  /**
   * 更新文件
   */
  private async updateFile(diff: CodeDiff, strategy: UpdateStrategy): Promise<void> {
    if (!diff.newContent) {
      throw new Error('No new content to update');
    }

    let content = diff.newContent;

    // 如果需要保留业务逻辑，合并内容
    if (strategy.preserveBusinessLogic && diff.oldContent) {
      content = this.mergeWithBusinessLogic(diff.oldContent, diff.newContent, diff.changes);
    }

    const fullPath = path.join(this.projectRoot, diff.path);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content, 'utf-8');
  }

  /**
   * 合并业务逻辑
   */
  private mergeWithBusinessLogic(
    oldContent: string,
    newContent: string,
    changes: Change[]
  ): string {
    // 简单实现：保留旧的业务逻辑部分
    const businessLogicChanges = changes.filter((c) => c.type === 'business_logic');

    if (businessLogicChanges.length === 0) {
      return newContent;
    }

    // 这里应该使用 AST 进行智能合并
    // 目前返回新内容，实际应该保留事件处理器和 API 调用
    return newContent;
  }
}
