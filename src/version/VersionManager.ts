/**
 * 版本管理系统
 * 管理代码生成的版本历史，支持版本回滚和差异对比
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface Version {
  id: string;
  timestamp: Date;
  description: string;
  files: Map<string, string>;
  config: GenerationConfig;
  metadata: VersionMetadata;
}

export interface GenerationConfig {
  framework: 'react' | 'vue';
  styleMode: 'css' | 'tailwind';
  typescript: boolean;
  figmaUrl?: string;
  figmaFileKey?: string;
  nodeIds?: string[];
  [key: string]: any;
}

export interface VersionMetadata {
  author?: string;
  tags?: string[];
  parentVersionId?: string;
  stats?: {
    filesCount: number;
    linesOfCode: number;
    componentsCount: number;
  };
}

export interface VersionDiff {
  versionA: string;
  versionB: string;
  filesAdded: string[];
  filesRemoved: string[];
  filesModified: string[];
  changes: Map<string, FileDiff>;
}

export interface FileDiff {
  path: string;
  linesAdded: number;
  linesRemoved: number;
  linesModified: number;
  diff: string;
}

/**
 * 版本管理器
 */
export class VersionManager {
  private versionsDir: string;
  private versions: Map<string, Version> = new Map();
  private currentVersionId?: string;

  constructor(projectRoot: string) {
    this.versionsDir = path.join(projectRoot, '.figma-versions');
    this.ensureVersionsDir();
    this.loadVersions();
  }

  /**
   * 创建新版本
   */
  async createVersion(
    files: Map<string, string>,
    config: GenerationConfig,
    description: string = 'Auto-generated version'
  ): Promise<Version> {
    const version: Version = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      description,
      files,
      config,
      metadata: {
        parentVersionId: this.currentVersionId,
        stats: this.calculateStats(files),
      },
    };

    // 保存版本
    await this.saveVersion(version);

    // 更新内存中的版本列表
    this.versions.set(version.id, version);
    this.currentVersionId = version.id;

    return version;
  }

  /**
   * 获取版本列表
   */
  listVersions(): Version[] {
    return Array.from(this.versions.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * 获取特定版本
   */
  getVersion(versionId: string): Version | undefined {
    return this.versions.get(versionId);
  }

  /**
   * 获取当前版本
   */
  getCurrentVersion(): Version | undefined {
    if (!this.currentVersionId) {
      return undefined;
    }
    return this.versions.get(this.currentVersionId);
  }

  /**
   * 回滚到指定版本
   */
  async rollback(versionId: string, targetDir: string): Promise<void> {
    const version = this.versions.get(versionId);
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }

    // 清空目标目录（保留 node_modules 等）
    await this.cleanTargetDir(targetDir);

    // 恢复文件
    for (const [filePath, content] of version.files) {
      const fullPath = path.join(targetDir, filePath);
      const dir = path.dirname(fullPath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, content, 'utf-8');
    }

    // 更新当前版本
    this.currentVersionId = versionId;
  }

  /**
   * 比较两个版本
   */
  async compareVersions(versionIdA: string, versionIdB: string): Promise<VersionDiff> {
    const versionA = this.versions.get(versionIdA);
    const versionB = this.versions.get(versionIdB);

    if (!versionA || !versionB) {
      throw new Error('One or both versions not found');
    }

    const filesAdded: string[] = [];
    const filesRemoved: string[] = [];
    const filesModified: string[] = [];
    const changes = new Map<string, FileDiff>();

    // 检查版本 B 中的文件
    for (const [filePath, contentB] of versionB.files) {
      const contentA = versionA.files.get(filePath);

      if (!contentA) {
        // 文件在 A 中不存在，是新增的
        filesAdded.push(filePath);
      } else if (contentA !== contentB) {
        // 文件被修改
        filesModified.push(filePath);
        changes.set(filePath, this.calculateFileDiff(filePath, contentA, contentB));
      }
    }

    // 检查版本 A 中被删除的文件
    for (const filePath of versionA.files.keys()) {
      if (!versionB.files.has(filePath)) {
        filesRemoved.push(filePath);
      }
    }

    return {
      versionA: versionIdA,
      versionB: versionIdB,
      filesAdded,
      filesRemoved,
      filesModified,
      changes,
    };
  }

  /**
   * 删除版本
   */
  async deleteVersion(versionId: string): Promise<void> {
    const version = this.versions.get(versionId);
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }

    // 删除版本文件
    const versionFile = path.join(this.versionsDir, `${versionId}.json`);
    if (fs.existsSync(versionFile)) {
      fs.unlinkSync(versionFile);
    }

    // 从内存中删除
    this.versions.delete(versionId);

    // 如果删除的是当前版本，更新当前版本指针
    if (this.currentVersionId === versionId) {
      const versions = this.listVersions();
      this.currentVersionId = versions.length > 0 ? versions[0].id : undefined;
    }
  }

  /**
   * 添加版本标签
   */
  async tagVersion(versionId: string, tag: string): Promise<void> {
    const version = this.versions.get(versionId);
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }

    if (!version.metadata.tags) {
      version.metadata.tags = [];
    }

    if (!version.metadata.tags.includes(tag)) {
      version.metadata.tags.push(tag);
      await this.saveVersion(version);
    }
  }

  /**
   * 按标签查找版本
   */
  findVersionsByTag(tag: string): Version[] {
    return Array.from(this.versions.values()).filter(
      (v) => v.metadata.tags && v.metadata.tags.includes(tag)
    );
  }

  /**
   * 导出版本
   */
  async exportVersion(versionId: string, outputPath: string): Promise<void> {
    const version = this.versions.get(versionId);
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }

    const exportData = {
      version: {
        id: version.id,
        timestamp: version.timestamp,
        description: version.description,
        config: version.config,
        metadata: version.metadata,
      },
      files: Array.from(version.files.entries()),
    };

    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf-8');
  }

  /**
   * 导入版本
   */
  async importVersion(importPath: string): Promise<Version> {
    const content = fs.readFileSync(importPath, 'utf-8');
    const importData = JSON.parse(content);

    const version: Version = {
      ...importData.version,
      timestamp: new Date(importData.version.timestamp),
      files: new Map(importData.files),
    };

    // 生成新的 ID 避免冲突
    version.id = crypto.randomUUID();
    version.metadata.parentVersionId = undefined;

    await this.saveVersion(version);
    this.versions.set(version.id, version);

    return version;
  }

  /**
   * 保存版本到磁盘
   */
  private async saveVersion(version: Version): Promise<void> {
    const versionFile = path.join(this.versionsDir, `${version.id}.json`);

    const data = {
      id: version.id,
      timestamp: version.timestamp.toISOString(),
      description: version.description,
      config: version.config,
      metadata: version.metadata,
      files: Array.from(version.files.entries()),
    };

    fs.writeFileSync(versionFile, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * 从磁盘加载版本
   */
  private loadVersions(): void {
    if (!fs.existsSync(this.versionsDir)) {
      return;
    }

    const files = fs.readdirSync(this.versionsDir);

    for (const file of files) {
      if (!file.endsWith('.json')) {
        continue;
      }

      try {
        const filePath = path.join(this.versionsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);

        const version: Version = {
          id: data.id,
          timestamp: new Date(data.timestamp),
          description: data.description,
          config: data.config,
          metadata: data.metadata,
          files: new Map(data.files),
        };

        this.versions.set(version.id, version);

        // 更新当前版本（最新的）
        if (
          !this.currentVersionId ||
          version.timestamp > this.versions.get(this.currentVersionId)!.timestamp
        ) {
          this.currentVersionId = version.id;
        }
      } catch (error) {
        console.error(`Failed to load version from ${file}:`, error);
      }
    }
  }

  /**
   * 确保版本目录存在
   */
  private ensureVersionsDir(): void {
    if (!fs.existsSync(this.versionsDir)) {
      fs.mkdirSync(this.versionsDir, { recursive: true });
    }
  }

  /**
   * 计算统计信息
   */
  private calculateStats(files: Map<string, string>): VersionMetadata['stats'] {
    let linesOfCode = 0;
    let componentsCount = 0;

    for (const [filePath, content] of files) {
      linesOfCode += content.split('\n').length;

      // 简单的组件计数（检测文件名）
      const ext = path.extname(filePath);
      if (['.tsx', '.jsx', '.vue'].includes(ext)) {
        componentsCount++;
      }
    }

    return {
      filesCount: files.size,
      linesOfCode,
      componentsCount,
    };
  }

  /**
   * 计算文件差异
   */
  private calculateFileDiff(filePath: string, contentA: string, contentB: string): FileDiff {
    const linesA = contentA.split('\n');
    const linesB = contentB.split('\n');

    let linesAdded = 0;
    let linesRemoved = 0;
    let linesModified = 0;

    // 简单的行级差异（实际应该使用更复杂的 diff 算法）
    const maxLines = Math.max(linesA.length, linesB.length);

    for (let i = 0; i < maxLines; i++) {
      const lineA = linesA[i];
      const lineB = linesB[i];

      if (lineA === undefined) {
        linesAdded++;
      } else if (lineB === undefined) {
        linesRemoved++;
      } else if (lineA !== lineB) {
        linesModified++;
      }
    }

    // 生成简单的 diff 字符串
    const diff = this.generateSimpleDiff(linesA, linesB);

    return {
      path: filePath,
      linesAdded,
      linesRemoved,
      linesModified,
      diff,
    };
  }

  /**
   * 生成简单的 diff 字符串
   */
  private generateSimpleDiff(linesA: string[], linesB: string[]): string {
    const diffLines: string[] = [];
    const maxLines = Math.max(linesA.length, linesB.length);

    for (let i = 0; i < maxLines; i++) {
      const lineA = linesA[i];
      const lineB = linesB[i];

      if (lineA === undefined) {
        diffLines.push(`+ ${lineB}`);
      } else if (lineB === undefined) {
        diffLines.push(`- ${lineA}`);
      } else if (lineA !== lineB) {
        diffLines.push(`- ${lineA}`);
        diffLines.push(`+ ${lineB}`);
      }
    }

    return diffLines.join('\n');
  }

  /**
   * 清空目标目录
   */
  private async cleanTargetDir(targetDir: string): Promise<void> {
    const skipDirs = ['node_modules', '.git', '.figma-versions', '.figma-backups'];

    if (!fs.existsSync(targetDir)) {
      return;
    }

    const entries = fs.readdirSync(targetDir, { withFileTypes: true });

    for (const entry of entries) {
      if (skipDirs.includes(entry.name)) {
        continue;
      }

      const fullPath = path.join(targetDir, entry.name);

      if (entry.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }
    }
  }
}
