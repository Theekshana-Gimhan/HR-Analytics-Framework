/**
 * Cache Provider Interface
 *
 * Abstraction layer for caching. Currently backed by in-memory LRU cache.
 * When traffic demands it, swap to Redis by implementing this same interface.
 *
 * Usage:
 *   import { cache } from './cache.provider';
 *   cache.set('key', value, 60_000);     // 60s TTL
 *   const hit = cache.get<MyType>('key');
 *   cache.invalidatePattern('dashboard:*');
 */

export interface CacheProvider {
  /** Get a cached value. Returns undefined on miss. */
  get<T>(key: string): T | undefined;

  /** Set a cached value with optional TTL in milliseconds. */
  set<T>(key: string, value: T, ttlMs?: number): void;

  /** Delete a specific cache key. */
  delete(key: string): void;

  /** Invalidate all keys matching a prefix (e.g. "dashboard:company:5"). */
  invalidatePattern(pattern: string): void;

  /** Clear the entire cache. */
  clear(): void;

  /** Get cache statistics for monitoring. */
  stats(): CacheStats;

  /** Check if a key exists. */
  has(key: string): boolean;
}

export interface CacheStats {
  /** Total number of cached items */
  size: number;
  /** Cache hit count since last reset */
  hits: number;
  /** Cache miss count since last reset */
  misses: number;
  /** Hit rate percentage */
  hitRate: number;
}

/** Configuration for a cacheable route / operation */
export interface CacheConfig {
  /** TTL in milliseconds */
  ttlMs: number;
  /** Key prefix for grouping (e.g. 'dashboard', 'leaveTypes') */
  prefix: string;
  /** Max number of entries for this prefix (optional, defaults to global max) */
  maxEntries?: number;
}
