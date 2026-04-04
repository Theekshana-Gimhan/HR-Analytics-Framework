jest.mock('../utils/logger');

import { MemoryCacheProvider } from '../services/cache/memory-cache.provider';
import {
  getCache,
  resetCache,
  buildCacheKey,
  invalidateCompanyCache,
  invalidateAllCompanyCache,
  CACHE_CONFIGS,
} from '../services/cache';

describe('Cache Service', () => {
  afterEach(() => {
    resetCache();
  });

  describe('MemoryCacheProvider', () => {
    let cache: MemoryCacheProvider;

    beforeEach(() => {
      cache = new MemoryCacheProvider(100);
    });

    it('should store and retrieve values', () => {
      cache.set('key1', { data: 'hello' });
      const result = cache.get<{ data: string }>('key1');
      expect(result).toEqual({ data: 'hello' });
    });

    it('should return undefined for cache misses', () => {
      const result = cache.get('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should delete specific keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.delete('key1');
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
    });

    it('should check key existence', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    it('should respect TTL expiration', async () => {
      cache.set('expire-key', 'value', 50); // 50ms TTL
      expect(cache.get('expire-key')).toBe('value');

      await new Promise((resolve) => setTimeout(resolve, 100)); // wait 100ms

      expect(cache.get('expire-key')).toBeUndefined();
    });

    it('should invalidate by pattern prefix', () => {
      cache.set('dashboard:company:1:stats', { total: 10 });
      cache.set('dashboard:company:1:liquidity', { cost: 500 });
      cache.set('dashboard:company:2:stats', { total: 20 });
      cache.set('leaveTypes:company:1', ['Annual']);

      cache.invalidatePattern('dashboard:company:1*');

      expect(cache.get('dashboard:company:1:stats')).toBeUndefined();
      expect(cache.get('dashboard:company:1:liquidity')).toBeUndefined();
      expect(cache.get('dashboard:company:2:stats')).toEqual({ total: 20 }); // untouched
      expect(cache.get('leaveTypes:company:1')).toEqual(['Annual']); // untouched
    });

    it('should clear all entries', () => {
      cache.set('key1', 'v1');
      cache.set('key2', 'v2');
      cache.clear();
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });

    it('should track hit/miss stats', () => {
      cache.set('key1', 'value');
      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('nonexistent'); // miss

      const stats = cache.stats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(67); // 2/3 = 67%
      expect(stats.size).toBe(1);
    });

    it('should enforce max entries via LRU eviction', () => {
      const smallCache = new MemoryCacheProvider(3);
      smallCache.set('a', 1);
      smallCache.set('b', 2);
      smallCache.set('c', 3);
      smallCache.set('d', 4); // should evict 'a'

      expect(smallCache.get('a')).toBeUndefined();
      expect(smallCache.get('b')).toBe(2);
      expect(smallCache.get('d')).toBe(4);
    });
  });

  describe('Cache key builders', () => {
    it('should build company-scoped keys', () => {
      expect(buildCacheKey('dashboard', 5)).toBe('dashboard:company:5');
      expect(buildCacheKey('dashboard', 5, 'stats')).toBe('dashboard:company:5:stats');
    });
  });

  describe('Cache invalidation helpers', () => {
    it('should invalidate company cache for a specific prefix', () => {
      const cache = getCache();
      cache.set('leaveTypes:company:1', ['Annual', 'Casual']);
      cache.set('leaveTypes:company:2', ['Annual']);

      invalidateCompanyCache('leaveTypes', 1);

      expect(cache.get('leaveTypes:company:1')).toBeUndefined();
      expect(cache.get('leaveTypes:company:2')).toEqual(['Annual']);
    });

    it('should invalidate all company caches across prefixes', () => {
      const cache = getCache();
      cache.set('dashboard:stats:company:1:stats', { total: 10 });
      cache.set('dashboard:liquidity:company:1', { cost: 500 });
      cache.set('leaveTypes:company:1', ['Annual']);
      cache.set('employees:company:1:list', [{ id: 1 }]);
      cache.set('leaveTypes:company:2', ['Medical']); // different company

      invalidateAllCompanyCache(1);

      expect(cache.get('dashboard:stats:company:1:stats')).toBeUndefined();
      expect(cache.get('dashboard:liquidity:company:1')).toBeUndefined();
      expect(cache.get('leaveTypes:company:1')).toBeUndefined();
      expect(cache.get('employees:company:1:list')).toBeUndefined();
      expect(cache.get('leaveTypes:company:2')).toEqual(['Medical']); // untouched
    });
  });

  describe('Singleton behavior', () => {
    it('should return the same instance', () => {
      const cache1 = getCache();
      const cache2 = getCache();
      cache1.set('test', 'value');
      expect(cache2.get('test')).toBe('value');
    });

    it('should reset properly', () => {
      const cache = getCache();
      cache.set('test', 'value');
      resetCache();
      const newCache = getCache();
      expect(newCache.get('test')).toBeUndefined();
    });
  });

  describe('CACHE_CONFIGS', () => {
    it('should have expected configurations', () => {
      expect(CACHE_CONFIGS.dashboardStats.ttlMs).toBe(60_000);
      expect(CACHE_CONFIGS.dashboardLiquidity.ttlMs).toBe(60_000);
      expect(CACHE_CONFIGS.leaveTypes.ttlMs).toBe(300_000);
      expect(CACHE_CONFIGS.employees.ttlMs).toBe(120_000);
    });
  });
});
