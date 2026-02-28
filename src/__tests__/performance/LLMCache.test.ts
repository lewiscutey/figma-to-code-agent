/**
 * LLMCache 单元测试
 */

import * as fs from 'fs';
import * as path from 'path';
import { LLMCache } from '../../performance/LLMCache';
import type { LLMRequest } from '../../performance/LLMCache';

describe('LLMCache', () => {
  const testCacheDir = path.join(__dirname, '.test-llm-cache');
  let cache: LLMCache;

  beforeEach(() => {
    // 清理测试缓存目录
    if (fs.existsSync(testCacheDir)) {
      fs.rmSync(testCacheDir, { recursive: true, force: true });
    }

    cache = new LLMCache({
      maxSize: 10,
      ttl: 1000, // 1 second for testing
      persistToDisk: true,
      cacheDir: testCacheDir,
    });
  });

  afterEach(() => {
    // 清理测试缓存目录
    if (fs.existsSync(testCacheDir)) {
      fs.rmSync(testCacheDir, { recursive: true, force: true });
    });
  });

  describe('get and set', () => {
    it('should cache and retrieve LLM responses', async () => {
      const request: LLMRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = { content: 'Hi there!' };

      await cache.set(request, response);
      const cached = await cache.get(request);

      expect(cached).toEqual(response);
    });

    it('should return null for cache miss', async () => {
      const request: LLMRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const cached = await cache.get(request);
      expect(cached).toBeNull();
    });

    it('should generate same key for identical requests', async () => {
      const request1: LLMRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
      };

      const request2: LLMRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
      };

      await cache.set(request1, { content: 'Response' });
      const cached = await cache.get(request2);

      expect(cached).toEqual({ content: 'Response' });
    });

    it('should generate different keys for different requests', async () => {
      const request1: LLMRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const request2: LLMRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Goodbye' }],
      };

      await cache.set(request1, { content: 'Response 1' });
      await cache.set(request2, { content: 'Response 2' });

      const cached1 = await cache.get(request1);
      const cached2 = await cache.get(request2);

      expect(cached1).toEqual({ content: 'Response 1' });
      expect(cached2).toEqual({ content: 'Response 2' });
    });
  });

  describe('expiration', () => {
    it('should return null for expired entries', async () => {
      const request: LLMRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await cache.set(request, { content: 'Response' }, 100); // 100ms TTL

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      const cached = await cache.get(request);
      expect(cached).toBeNull();
    });

    it('should use custom TTL when provided', async () => {
      const request: LLMRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await cache.set(request, { content: 'Response' }, 5000); // 5 seconds

      const cached = await cache.get(request);
      expect(cached).toEqual({ content: 'Response' });
    });
  });

  describe('cache size management', () => {
    it('should evict oldest entry when max size reached', async () => {
      const smallCache = new LLMCache({
        maxSize: 2,
        persistToDisk: false,
      });

      const request1: LLMRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Message 1' }],
      };

      const request2: LLMRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Message 2' }],
      };

      const request3: LLMRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Message 3' }],
      };

      await smallCache.set(request1, { content: 'Response 1' });
      await smallCache.set(request2, { content: 'Response 2' });
      await smallCache.set(request3, { content: 'Response 3' });

      const cached1 = await smallCache.get(request1);
      const cached3 = await smallCache.get(request3);

      expect(cached1).toBeNull(); // Should be evicted
      expect(cached3).toEqual({ content: 'Response 3' });
    });
  });

  describe('statistics', () => {
    it('should track cache hits and misses', async () => {
      const request: LLMRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await cache.set(request, { content: 'Response' });

      await cache.get(request); // Hit
      await cache.get(request); // Hit
      await cache.get({ model: 'gpt-4', messages: [{ role: 'user', content: 'Other' }] }); // Miss

      const stats = cache.getStats();

      expect(stats.totalHits).toBe(2);
      expect(stats.totalMisses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(2 / 3);
    });

    it('should calculate cache statistics', async () => {
      const request1: LLMRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Message 1' }],
      };

      const request2: LLMRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Message 2' }],
      };

      await cache.set(request1, { content: 'Response 1' });
      await cache.set(request2, { content: 'Response 2' });

      const stats = cache.getStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.oldestEntry).toBeInstanceOf(Date);
      expect(stats.newestEntry).toBeInstanceOf(Date);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', async () => {
      const request1: LLMRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Message 1' }],
      };

      const request2: LLMRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Message 2' }],
      };

      await cache.set(request1, { content: 'Response 1' }, 100); // Short TTL
      await cache.set(request2, { content: 'Response 2' }, 10000); // Long TTL

      await new Promise((resolve) => setTimeout(resolve, 150));

      const cleaned = await cache.cleanup();

      expect(cleaned).toBe(1);

      const cached1 = await cache.get(request1);
      const cached2 = await cache.get(request2);

      expect(cached1).toBeNull();
      expect(cached2).toEqual({ content: 'Response 2' });
    });
  });

  describe('clear', () => {
    it('should clear all cache entries', async () => {
      const request: LLMRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await cache.set(request, { content: 'Response' });
      await cache.clear();

      const cached = await cache.get(request);
      const stats = cache.getStats();

      expect(cached).toBeNull();
      expect(stats.totalEntries).toBe(0);
      expect(stats.totalHits).toBe(0);
      expect(stats.totalMisses).toBe(0);
    });
  });

  describe('delete', () => {
    it('should delete specific cache entry', async () => {
      const request: LLMRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await cache.set(request, { content: 'Response' });
      const deleted = await cache.delete(request);

      expect(deleted).toBe(true);

      const cached = await cache.get(request);
      expect(cached).toBeNull();
    });

    it('should return false when deleting non-existent entry', async () => {
      const request: LLMRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const deleted = await cache.delete(request);
      expect(deleted).toBe(false);
    });
  });

  describe('persistence', () => {
    it('should persist cache to disk', async () => {
      const request: LLMRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await cache.set(request, { content: 'Response' });

      // Create new cache instance
      const newCache = new LLMCache({
        persistToDisk: true,
        cacheDir: testCacheDir,
      });

      const cached = await newCache.get(request);
      expect(cached).toEqual({ content: 'Response' });
    });

    it('should not load expired entries from disk', async () => {
      const request: LLMRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await cache.set(request, { content: 'Response' }, 100);

      await new Promise((resolve) => setTimeout(resolve, 150));

      // Create new cache instance
      const newCache = new LLMCache({
        persistToDisk: true,
        cacheDir: testCacheDir,
      });

      const cached = await newCache.get(request);
      expect(cached).toBeNull();
    });
  });

  describe('export and import', () => {
    it('should export and import cache', async () => {
      const request1: LLMRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Message 1' }],
      };

      const request2: LLMRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Message 2' }],
      };

      await cache.set(request1, { content: 'Response 1' });
      await cache.set(request2, { content: 'Response 2' });

      const exportPath = path.join(testCacheDir, 'export.json');
      await cache.export(exportPath);

      const newCache = new LLMCache({
        persistToDisk: false,
      });

      const imported = await newCache.import(exportPath);

      expect(imported).toBe(2);

      const cached1 = await newCache.get(request1);
      const cached2 = await newCache.get(request2);

      expect(cached1).toEqual({ content: 'Response 1' });
      expect(cached2).toEqual({ content: 'Response 2' });
    });

    it('should not import expired entries', async () => {
      const request: LLMRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await cache.set(request, { content: 'Response' }, 100);

      const exportPath = path.join(testCacheDir, 'export.json');
      await cache.export(exportPath);

      await new Promise((resolve) => setTimeout(resolve, 150));

      const newCache = new LLMCache({
        persistToDisk: false,
      });

      const imported = await newCache.import(exportPath);

      expect(imported).toBe(0);
    });
  });

  describe('warmup', () => {
    it('should pre-populate cache with requests and responses', async () => {
      const requests: LLMRequest[] = [
        { model: 'gpt-4', messages: [{ role: 'user', content: 'Message 1' }] },
        { model: 'gpt-4', messages: [{ role: 'user', content: 'Message 2' }] },
      ];

      const responses = [{ content: 'Response 1' }, { content: 'Response 2' }];

      await cache.warmup(requests, responses);

      const cached1 = await cache.get(requests[0]);
      const cached2 = await cache.get(requests[1]);

      expect(cached1).toEqual(responses[0]);
      expect(cached2).toEqual(responses[1]);
    });

    it('should throw error for mismatched arrays', async () => {
      const requests: LLMRequest[] = [
        { model: 'gpt-4', messages: [{ role: 'user', content: 'Message 1' }] },
      ];

      const responses = [{ content: 'Response 1' }, { content: 'Response 2' }];

      await expect(cache.warmup(requests, responses)).rejects.toThrow(
        'Requests and responses length mismatch'
      );
    });
  });
});
