/**
 * Cache Service - Singleton Entry Point
 *
 * Provides the application-wide cache instance. Currently uses in-memory LRU.
 * To switch to Redis later, change the provider here — no other code changes needed.
 *
 * Cache key convention: `{prefix}:company:{companyId}:{extra?}`
 * Examples:
 *   - dashboard:company:5:stats
 *   - dashboard:company:5:liquidity
 *   - leaveTypes:company:5
 *   - employees:company:5:list
 */

import { CacheProvider, CacheConfig } from './cache.interface';
import { MemoryCacheProvider } from './memory-cache.provider';

// ── Default TTL configurations ──────────────────────────────────────────────
export const CACHE_CONFIGS: Record<string, CacheConfig> = {
  dashboardStats: {
    prefix: 'dashboard:stats',
    ttlMs: 60 * 1000, // 60 seconds
  },
  dashboardLiquidity: {
    prefix: 'dashboard:liquidity',
    ttlMs: 60 * 1000, // 60 seconds
  },
  leaveTypes: {
    prefix: 'leaveTypes',
    ttlMs: 5 * 60 * 1000, // 5 minutes
  },
  employees: {
    prefix: 'employees',
    ttlMs: 2 * 60 * 1000, // 2 minutes
  },
};

// ── Singleton instance ──────────────────────────────────────────────────────
// Swap MemoryCacheProvider → RedisCacheProvider when scaling to multiple instances.
let cacheInstance: CacheProvider | null = null;

export function getCache(): CacheProvider {
  cacheInstance ??= new MemoryCacheProvider(500);
  return cacheInstance;
}

/** Reset for testing */
export function resetCache(): void {
  if (cacheInstance) {
    cacheInstance.clear();
  }
  cacheInstance = null;
}

// ── Key builder helpers ─────────────────────────────────────────────────────
export function buildCacheKey(prefix: string, companyId: number, suffix?: string): string {
  const base = `${prefix}:company:${companyId}`;
  return suffix ? `${base}:${suffix}` : base;
}

/** Invalidate all cache entries for a company under a given prefix */
export function invalidateCompanyCache(prefix: string, companyId: number): void {
  const cache = getCache();
  cache.invalidatePattern(`${prefix}:company:${companyId}`);
}

/** Invalidate all cache entries for a company across all prefixes */
export function invalidateAllCompanyCache(companyId: number): void {
  const cache = getCache();
  for (const config of Object.values(CACHE_CONFIGS)) {
    cache.invalidatePattern(`${config.prefix}:company:${companyId}`);
  }
}

export type { CacheProvider, CacheConfig } from './cache.interface';
