/**
 * LLM 响应缓存系统
 * 缓存 LLM 响应以减少 API 调用和提高性能
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface CacheEntry {
  key: string;
  request: LLMRequest;
  response: any;
  timestamp: Date;
  expiresAt: Date;
  hitCount: number;
  metadata?: {
    model?: string;
    tokens?: number;
    duration?: number;
  };
}

export interface LLMRequest {
  model: string;
  messages: any[];
  temperature?: number;
  maxTokens?: number;
  [key: string]: any;
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  totalSize: number;
  oldestEntry?: Date;
  newestEntry?: Date;
}

export interface CacheConfig {
  maxSize?: number; // 最大缓存条目数
  ttl?: number; // 默认过期时间（毫秒）
  persistToDisk?: boolean; // 是否持久化到磁盘
  cacheDir?: string; // 缓存目录
}

/**
 * LLM 缓存管理器
 */
export class LLMCache {
  private cache: Map<string, CacheEntry> = new Map();
  private hits: number = 0;
  private misses: number = 0;
  private maxSize: number;
  private defaultTTL: number;
  private persistToDisk: boolean;
  private cacheDir: string;

  constructor(config: CacheConfig = {}) {
    this.maxSize = config.maxSize || 1000;
    this.defaultTTL = config.ttl || 24 * 60 * 60 * 1000; // 默认 24 小时
    this.persistToDisk = config.persistToDisk !== false;
    this.cacheDir = config.cacheDir || '.llm-cache';

    if (this.persistToDisk) {
      this.ensureCacheDir();
      this.loadFromDisk();
    }
  }

  /**
   * 获取缓存的响应
   */
  async get(request: LLMRequest): Promise<any | null> {
    const key = this.generateKey(request);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // 检查是否过期
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // 更新命中次数
    entry.hitCount++;
    this.hits++;

    return entry.response;
  }

  /**
   * 设置缓存
   */
  async set(
    request: LLMRequest,
    response: any,
    ttl?: number,
    metadata?: CacheEntry['metadata']
  ): Promise<void> {
    const key = this.generateKey(request);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (ttl || this.defaultTTL));

    const entry: CacheEntry = {
      key,
      request,
      response,
      timestamp: now,
      expiresAt,
      hitCount: 0,
      metadata,
    };

    // 检查缓存大小限制
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, entry);

    // 持久化到磁盘
    if (this.persistToDisk) {
      await this.saveToDisk(entry);
    }
  }

  /**
   * 清除缓存
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;

    if (this.persistToDisk) {
      await this.clearDisk();
    }
  }

  /**
   * 删除特定缓存
   */
  async delete(request: LLMRequest): Promise<boolean> {
    const key = this.generateKey(request);
    const deleted = this.cache.delete(key);

    if (deleted && this.persistToDisk) {
      await this.deleteFromDisk(key);
    }

    return deleted;
  }

  /**
   * 清理过期缓存
   */
  async cleanup(): Promise<number> {
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        cleaned++;

        if (this.persistToDisk) {
          await this.deleteFromDisk(key);
        }
      }
    }

    return cleaned;
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalRequests = this.hits + this.misses;

    return {
      totalEntries: this.cache.size,
      totalHits: this.hits,
      totalMisses: this.misses,
      hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
      totalSize: this.calculateSize(),
      oldestEntry: entries.length > 0 ? this.findOldest(entries) : undefined,
      newestEntry: entries.length > 0 ? this.findNewest(entries) : undefined,
    };
  }

  /**
   * 预热缓存
   */
  async warmup(requests: LLMRequest[], responses: any[]): Promise<void> {
    if (requests.length !== responses.length) {
      throw new Error('Requests and responses length mismatch');
    }

    for (let i = 0; i < requests.length; i++) {
      await this.set(requests[i], responses[i]);
    }
  }

  /**
   * 导出缓存
   */
  async export(outputPath: string): Promise<void> {
    const entries = Array.from(this.cache.values()).map((entry) => ({
      ...entry,
      timestamp: entry.timestamp.toISOString(),
      expiresAt: entry.expiresAt.toISOString(),
    }));

    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      stats: this.getStats(),
      entries,
    };

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * 导入缓存
   */
  async import(inputPath: string): Promise<number> {
    const content = fs.readFileSync(inputPath, 'utf-8');
    const data = JSON.parse(content);

    let imported = 0;

    for (const entry of data.entries) {
      const cacheEntry: CacheEntry = {
        ...entry,
        timestamp: new Date(entry.timestamp),
        expiresAt: new Date(entry.expiresAt),
      };

      // 只导入未过期的条目
      if (!this.isExpired(cacheEntry)) {
        this.cache.set(cacheEntry.key, cacheEntry);
        imported++;
      }
    }

    return imported;
  }

  /**
   * 生成缓存键
   */
  private generateKey(request: LLMRequest): string {
    // 创建一个标准化的请求对象用于生成键
    const normalized = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature || 0,
      maxTokens: request.maxTokens,
    };

    const content = JSON.stringify(normalized);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * 检查是否过期
   */
  private isExpired(entry: CacheEntry): boolean {
    return new Date() > entry.expiresAt;
  }

  /**
   * 驱逐最旧的条目
   */
  private evictOldest(): void {
    const entries = Array.from(this.cache.entries());

    if (entries.length === 0) {
      return;
    }

    // 找到最旧的条目（最少使用的）
    let oldestKey = entries[0][0];
    let oldestEntry = entries[0][1];

    for (const [key, entry] of entries) {
      if (entry.hitCount < oldestEntry.hitCount) {
        oldestKey = key;
        oldestEntry = entry;
      } else if (
        entry.hitCount === oldestEntry.hitCount &&
        entry.timestamp < oldestEntry.timestamp
      ) {
        oldestKey = key;
        oldestEntry = entry;
      }
    }

    this.cache.delete(oldestKey);
  }

  /**
   * 计算缓存大小
   */
  private calculateSize(): number {
    let size = 0;

    for (const entry of this.cache.values()) {
      // 粗略估算大小
      size += JSON.stringify(entry).length;
    }

    return size;
  }

  /**
   * 查找最旧的条目
   */
  private findOldest(entries: CacheEntry[]): Date {
    return entries.reduce(
      (oldest, entry) => (entry.timestamp < oldest ? entry.timestamp : oldest),
      entries[0].timestamp
    );
  }

  /**
   * 查找最新的条目
   */
  private findNewest(entries: CacheEntry[]): Date {
    return entries.reduce(
      (newest, entry) => (entry.timestamp > newest ? entry.timestamp : newest),
      entries[0].timestamp
    );
  }

  /**
   * 确保缓存目录存在
   */
  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * 保存到磁盘
   */
  private async saveToDisk(entry: CacheEntry): Promise<void> {
    const filePath = path.join(this.cacheDir, `${entry.key}.json`);

    const data = {
      ...entry,
      timestamp: entry.timestamp.toISOString(),
      expiresAt: entry.expiresAt.toISOString(),
    };

    fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
  }

  /**
   * 从磁盘加载
   */
  private loadFromDisk(): void {
    if (!fs.existsSync(this.cacheDir)) {
      return;
    }

    const files = fs.readdirSync(this.cacheDir);

    for (const file of files) {
      if (!file.endsWith('.json')) {
        continue;
      }

      try {
        const filePath = path.join(this.cacheDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);

        const entry: CacheEntry = {
          ...data,
          timestamp: new Date(data.timestamp),
          expiresAt: new Date(data.expiresAt),
        };

        // 只加载未过期的条目
        if (!this.isExpired(entry)) {
          this.cache.set(entry.key, entry);
        } else {
          // 删除过期的文件
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.error(`Failed to load cache entry from ${file}:`, error);
      }
    }
  }

  /**
   * 从磁盘删除
   */
  private async deleteFromDisk(key: string): Promise<void> {
    const filePath = path.join(this.cacheDir, `${key}.json`);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /**
   * 清空磁盘缓存
   */
  private async clearDisk(): Promise<void> {
    if (!fs.existsSync(this.cacheDir)) {
      return;
    }

    const files = fs.readdirSync(this.cacheDir);

    for (const file of files) {
      if (file.endsWith('.json')) {
        fs.unlinkSync(path.join(this.cacheDir, file));
      }
    }
  }
}
