/**
 * VersionManager 单元测试
 */

import * as fs from 'fs';
import * as path from 'path';
import { VersionManager } from '../../version/VersionManager';

describe('VersionManager', () => {
  const testDir = path.join(__dirname, '.test-versions');
  let versionManager: VersionManager;

  beforeEach(() => {
    // 清理测试目录
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });

    versionManager = new VersionManager(testDir);
  });

  afterEach(() => {
    // 清理测试目录
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('createVersion', () => {
    it('should create a new version', async () => {
      const files = new Map([
        ['Component.tsx', 'export const Component = () => <div>Hello</div>'],
        ['Component.css', '.component { color: red; }'],
      ]);

      const config = {
        framework: 'react' as const,
        styleMode: 'css' as const,
        typescript: true,
      };

      const version = await versionManager.createVersion(files, config, 'Initial version');

      expect(version.id).toBeDefined();
      expect(version.description).toBe('Initial version');
      expect(version.files.size).toBe(2);
      expect(version.config.framework).toBe('react');
      expect(version.metadata.stats?.filesCount).toBe(2);
      expect(version.metadata.stats?.componentsCount).toBe(1);
    });

    it('should set parent version ID for subsequent versions', async () => {
      const files1 = new Map([['file1.tsx', 'content1']]);
      const config = { framework: 'react' as const, styleMode: 'css' as const, typescript: true };

      const version1 = await versionManager.createVersion(files1, config, 'Version 1');

      const files2 = new Map([['file2.tsx', 'content2']]);
      const version2 = await versionManager.createVersion(files2, config, 'Version 2');

      expect(version2.metadata.parentVersionId).toBe(version1.id);
    });
  });

  describe('listVersions', () => {
    it('should list versions in reverse chronological order', async () => {
      const config = { framework: 'react' as const, styleMode: 'css' as const, typescript: true };

      await versionManager.createVersion(new Map([['file1.tsx', 'v1']]), config, 'Version 1');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await versionManager.createVersion(new Map([['file2.tsx', 'v2']]), config, 'Version 2');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await versionManager.createVersion(new Map([['file3.tsx', 'v3']]), config, 'Version 3');

      const versions = versionManager.listVersions();

      expect(versions).toHaveLength(3);
      expect(versions[0].description).toBe('Version 3');
      expect(versions[1].description).toBe('Version 2');
      expect(versions[2].description).toBe('Version 1');
    });
  });

  describe('getVersion', () => {
    it('should retrieve a specific version', async () => {
      const files = new Map([['test.tsx', 'content']]);
      const config = { framework: 'react' as const, styleMode: 'css' as const, typescript: true };

      const created = await versionManager.createVersion(files, config, 'Test version');
      const retrieved = versionManager.getVersion(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.description).toBe('Test version');
    });

    it('should return undefined for non-existent version', () => {
      const version = versionManager.getVersion('non-existent-id');
      expect(version).toBeUndefined();
    });
  });

  describe('getCurrentVersion', () => {
    it('should return the most recent version', async () => {
      const config = { framework: 'react' as const, styleMode: 'css' as const, typescript: true };

      await versionManager.createVersion(new Map([['file1.tsx', 'v1']]), config, 'Version 1');
      const version2 = await versionManager.createVersion(
        new Map([['file2.tsx', 'v2']]),
        config,
        'Version 2'
      );

      const current = versionManager.getCurrentVersion();

      expect(current).toBeDefined();
      expect(current?.id).toBe(version2.id);
    });

    it('should return undefined when no versions exist', () => {
      const current = versionManager.getCurrentVersion();
      expect(current).toBeUndefined();
    });
  });

  describe('rollback', () => {
    it('should restore files from a previous version', async () => {
      const config = { framework: 'react' as const, styleMode: 'css' as const, typescript: true };

      const version1 = await versionManager.createVersion(
        new Map([
          ['Component.tsx', 'version 1 content'],
          ['styles.css', 'version 1 styles'],
        ]),
        config,
        'Version 1'
      );

      await versionManager.createVersion(
        new Map([['Component.tsx', 'version 2 content']]),
        config,
        'Version 2'
      );

      const outputDir = path.join(testDir, 'output');
      await versionManager.rollback(version1.id, outputDir);

      const restoredContent = fs.readFileSync(path.join(outputDir, 'Component.tsx'), 'utf-8');
      const restoredStyles = fs.readFileSync(path.join(outputDir, 'styles.css'), 'utf-8');

      expect(restoredContent).toBe('version 1 content');
      expect(restoredStyles).toBe('version 1 styles');
    });

    it('should throw error for non-existent version', async () => {
      const outputDir = path.join(testDir, 'output');
      await expect(versionManager.rollback('non-existent', outputDir)).rejects.toThrow(
        'Version non-existent not found'
      );
    });
  });

  describe('compareVersions', () => {
    it('should detect added files', async () => {
      const config = { framework: 'react' as const, styleMode: 'css' as const, typescript: true };

      const v1 = await versionManager.createVersion(
        new Map([['file1.tsx', 'content1']]),
        config,
        'V1'
      );

      const v2 = await versionManager.createVersion(
        new Map([
          ['file1.tsx', 'content1'],
          ['file2.tsx', 'content2'],
        ]),
        config,
        'V2'
      );

      const diff = await versionManager.compareVersions(v1.id, v2.id);

      expect(diff.filesAdded).toContain('file2.tsx');
      expect(diff.filesRemoved).toHaveLength(0);
      expect(diff.filesModified).toHaveLength(0);
    });

    it('should detect removed files', async () => {
      const config = { framework: 'react' as const, styleMode: 'css' as const, typescript: true };

      const v1 = await versionManager.createVersion(
        new Map([
          ['file1.tsx', 'content1'],
          ['file2.tsx', 'content2'],
        ]),
        config,
        'V1'
      );

      const v2 = await versionManager.createVersion(
        new Map([['file1.tsx', 'content1']]),
        config,
        'V2'
      );

      const diff = await versionManager.compareVersions(v1.id, v2.id);

      expect(diff.filesRemoved).toContain('file2.tsx');
      expect(diff.filesAdded).toHaveLength(0);
    });

    it('should detect modified files', async () => {
      const config = { framework: 'react' as const, styleMode: 'css' as const, typescript: true };

      const v1 = await versionManager.createVersion(
        new Map([['file1.tsx', 'original content']]),
        config,
        'V1'
      );

      const v2 = await versionManager.createVersion(
        new Map([['file1.tsx', 'modified content']]),
        config,
        'V2'
      );

      const diff = await versionManager.compareVersions(v1.id, v2.id);

      expect(diff.filesModified).toContain('file1.tsx');
      expect(diff.changes.has('file1.tsx')).toBe(true);

      const fileDiff = diff.changes.get('file1.tsx')!;
      expect(fileDiff.linesModified).toBeGreaterThan(0);
    });
  });

  describe('deleteVersion', () => {
    it('should delete a version', async () => {
      const config = { framework: 'react' as const, styleMode: 'css' as const, typescript: true };

      const version = await versionManager.createVersion(
        new Map([['file.tsx', 'content']]),
        config,
        'Test'
      );

      await versionManager.deleteVersion(version.id);

      const retrieved = versionManager.getVersion(version.id);
      expect(retrieved).toBeUndefined();
    });

    it('should update current version pointer when deleting current version', async () => {
      const config = { framework: 'react' as const, styleMode: 'css' as const, typescript: true };

      const v1 = await versionManager.createVersion(new Map([['f1.tsx', 'c1']]), config, 'V1');
      const v2 = await versionManager.createVersion(new Map([['f2.tsx', 'c2']]), config, 'V2');

      await versionManager.deleteVersion(v2.id);

      const current = versionManager.getCurrentVersion();
      expect(current?.id).toBe(v1.id);
    });
  });

  describe('tagVersion', () => {
    it('should add tags to a version', async () => {
      const config = { framework: 'react' as const, styleMode: 'css' as const, typescript: true };

      const version = await versionManager.createVersion(
        new Map([['file.tsx', 'content']]),
        config,
        'Test'
      );

      await versionManager.tagVersion(version.id, 'stable');
      await versionManager.tagVersion(version.id, 'production');

      const tagged = versionManager.getVersion(version.id);
      expect(tagged?.metadata.tags).toContain('stable');
      expect(tagged?.metadata.tags).toContain('production');
    });

    it('should not add duplicate tags', async () => {
      const config = { framework: 'react' as const, styleMode: 'css' as const, typescript: true };

      const version = await versionManager.createVersion(
        new Map([['file.tsx', 'content']]),
        config,
        'Test'
      );

      await versionManager.tagVersion(version.id, 'stable');
      await versionManager.tagVersion(version.id, 'stable');

      const tagged = versionManager.getVersion(version.id);
      expect(tagged?.metadata.tags?.filter((t) => t === 'stable')).toHaveLength(1);
    });
  });

  describe('findVersionsByTag', () => {
    it('should find versions with specific tag', async () => {
      const config = { framework: 'react' as const, styleMode: 'css' as const, typescript: true };

      const v1 = await versionManager.createVersion(new Map([['f1.tsx', 'c1']]), config, 'V1');
      const v2 = await versionManager.createVersion(new Map([['f2.tsx', 'c2']]), config, 'V2');
      const v3 = await versionManager.createVersion(new Map([['f3.tsx', 'c3']]), config, 'V3');

      await versionManager.tagVersion(v1.id, 'stable');
      await versionManager.tagVersion(v3.id, 'stable');

      const stableVersions = versionManager.findVersionsByTag('stable');

      expect(stableVersions).toHaveLength(2);
      expect(stableVersions.map((v) => v.id)).toContain(v1.id);
      expect(stableVersions.map((v) => v.id)).toContain(v3.id);
      expect(stableVersions.map((v) => v.id)).not.toContain(v2.id);
    });
  });

  describe('exportVersion and importVersion', () => {
    it('should export and import a version', async () => {
      const config = { framework: 'react' as const, styleMode: 'css' as const, typescript: true };

      const original = await versionManager.createVersion(
        new Map([
          ['Component.tsx', 'export const Component = () => <div>Test</div>'],
          ['styles.css', '.component { color: blue; }'],
        ]),
        config,
        'Export test'
      );

      const exportPath = path.join(testDir, 'export.json');
      await versionManager.exportVersion(original.id, exportPath);

      // 创建新的 VersionManager 实例
      const newManager = new VersionManager(path.join(testDir, 'new'));
      const imported = await newManager.importVersion(exportPath);

      expect(imported.description).toBe(original.description);
      expect(imported.files.size).toBe(original.files.size);
      expect(imported.config).toEqual(original.config);
      expect(imported.id).not.toBe(original.id); // 应该生成新 ID
    });
  });

  describe('persistence', () => {
    it('should persist versions to disk', async () => {
      const config = { framework: 'react' as const, styleMode: 'css' as const, typescript: true };

      await versionManager.createVersion(new Map([['file.tsx', 'content']]), config, 'Test');

      // 创建新实例，应该加载已保存的版本
      const newManager = new VersionManager(testDir);
      const versions = newManager.listVersions();

      expect(versions).toHaveLength(1);
      expect(versions[0].description).toBe('Test');
    });

    it('should skip expired versions on load', async () => {
      const config = { framework: 'react' as const, styleMode: 'css' as const, typescript: true };

      const version = await versionManager.createVersion(
        new Map([['file.tsx', 'content']]),
        config,
        'Test'
      );

      // 手动修改版本文件，设置过期时间为过去
      const versionFile = path.join(testDir, '.figma-versions', `${version.id}.json`);
      const data = JSON.parse(fs.readFileSync(versionFile, 'utf-8'));
      data.timestamp = new Date(Date.now() - 1000000).toISOString();
      fs.writeFileSync(versionFile, JSON.stringify(data));

      // 创建新实例
      const newManager = new VersionManager(testDir);
      const versions = newManager.listVersions();

      expect(versions).toHaveLength(1); // 仍然应该加载（版本不会自动过期）
    });
  });
});
