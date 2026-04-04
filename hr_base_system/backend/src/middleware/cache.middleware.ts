/**
 * Cache Middleware
 *
 * Express middleware for automatic response caching.
 * Wraps res.json() to cache successful responses, returns cached data on hit.
 *
 * Usage in routes:
 *   router.get('/stats', authenticate, cacheMiddleware(CACHE_CONFIGS.dashboardStats), controller.getStats);
 */

import { Response, NextFunction } from 'express';
import { CustomRequest } from './auth.middleware';
import { CacheConfig } from '../services/cache/cache.interface';
import { getCache, buildCacheKey } from '../services/cache';
import logger from '../utils/logger';

/**
 * Creates a caching middleware for a specific route.
 *
 * @param config - Cache configuration (TTL, prefix)
 * @param keySuffix - Optional function to generate dynamic key suffix from request
 */
export function cacheMiddleware(
  config: CacheConfig,
  keySuffix?: (req: CustomRequest) => string
) {
  return (req: CustomRequest, res: Response, next: NextFunction): void => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      next();
      return;
    }

    // Need authenticated user for company-scoped cache key
    if (!req.user) {
      next();
      return;
    }

    const cache = getCache();
    const suffix = keySuffix ? keySuffix(req) : undefined;
    const key = buildCacheKey(config.prefix, req.user.companyId, suffix);

    // Check cache
    const cached = cache.get<unknown>(key);
    if (cached !== undefined) {
      logger.debug(`Cache HIT: ${key}`);
      res.json(cached);
      return;
    }

    logger.debug(`Cache MISS: ${key}`);

    // Intercept res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = function (body: unknown) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, body, config.ttlMs);
        logger.debug(`Cache SET: ${key} (TTL=${config.ttlMs}ms)`);
      }
      return originalJson(body);
    };

    next();
  };
}
