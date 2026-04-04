/**
 * In-Memory LRU Cache Provider
 *
 * Zero-cost caching using lru-cache. Suitable for single-instance deployments.
 * When scaling to multiple instances, swap to RedisCacheProvider implementing
 * the same CacheProvider interface.
 *
 * Max 500 entries by default, evicts least-recently-used when full.
 */

import { LRUCache } from 'lru-cache';
import { CacheProvider, CacheStats } from './cache.interface';
import logger from '../../utils/logger';

export class MemoryCacheProvider implements CacheProvider {
  private readonly cache: LRUCache<string, any>;
  private hits = 0;
  private misses = 0;

  constructor(maxEntries = 500) {
    this.cache = new LRUCache<string, any>({
      max: maxEntries,
      // Allow items with individual TTLs
      ttl: 5 * 60 * 1000, // default 5 min fallback
      allowStale: false,
      updateAgeOnGet: false,
      // Log evictions in debug mode
      dispose: (value, key, reason) => {
        if (reason === 'evict') {
          logger.debug(`Cache evicted: ${key}`);
        }
      },
    });

    logger.info(`In-memory LRU cache initialized (max=${maxEntries} entries)`);
  }

  get<T>(key: string): T | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.hits++;
      return value as T;
    }
    this.misses++;
    return undefined;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    const options = ttlMs ? { ttl: ttlMs } : {};
    this.cache.set(key, value, options);
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    // Pattern matching: supports prefix-based invalidation
    // e.g., "dashboard:company:5" invalidates all keys starting with that prefix
    const prefix = pattern.replace(/\*$/, ''); // strip trailing wildcard
    let invalidated = 0;

    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    if (invalidated > 0) {
      logger.debug(`Cache invalidated ${invalidated} entries matching "${pattern}"`);
    }
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    logger.info('Cache cleared');
  }

  stats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? Math.round((this.hits / total) * 100) : 0,
    };
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }
}
