jest.mock('../utils/logger');

import { Response, NextFunction } from 'express';
import { cacheMiddleware } from '../middleware/cache.middleware';
import { CustomRequest } from '../middleware/auth.middleware';
import { resetCache, getCache, CACHE_CONFIGS } from '../services/cache';

describe('Cache Middleware', () => {
  let req: Partial<CustomRequest>;
  let res: Partial<Response>;
  let next: NextFunction;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    resetCache();
    jsonMock = jest.fn().mockReturnThis();

    req = {
      method: 'GET',
      user: { id: 1, role: 'ADMIN', companyId: 5 },
    };

    res = {
      json: jsonMock,
      statusCode: 200,
    };

    next = jest.fn();
  });

  afterEach(() => {
    resetCache();
  });

  it('should call next() on cache miss', () => {
    const middleware = cacheMiddleware(CACHE_CONFIGS.dashboardStats);
    middleware(req as CustomRequest, res as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('should return cached data on hit', () => {
    const middleware = cacheMiddleware(CACHE_CONFIGS.dashboardStats);
    const cachedData = { totalEmployees: 42 };

    // Simulate first request that populates cache
    getCache().set('dashboard:stats:company:5', cachedData, 60000);

    // Second request should hit cache
    middleware(req as CustomRequest, res as Response, next);

    expect(jsonMock).toHaveBeenCalledWith(cachedData);
    expect(next).not.toHaveBeenCalled(); // Should NOT call next on cache hit
  });

  it('should skip caching for non-GET requests', () => {
    req.method = 'POST';
    const middleware = cacheMiddleware(CACHE_CONFIGS.dashboardStats);
    middleware(req as CustomRequest, res as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('should skip caching for unauthenticated requests', () => {
    req.user = undefined;
    const middleware = cacheMiddleware(CACHE_CONFIGS.dashboardStats);
    middleware(req as CustomRequest, res as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('should cache response when handler calls res.json()', () => {
    const middleware = cacheMiddleware(CACHE_CONFIGS.dashboardStats);
    middleware(req as CustomRequest, res as Response, next);

    // Simulate the controller calling res.json()
    const responseData = { totalEmployees: 15, pendingLeaves: 3 };
    (res.json as jest.Mock)(responseData);

    // Now the cache should have the data
    const cached = getCache().get('dashboard:stats:company:5');
    expect(cached).toEqual(responseData);
  });

  it('should use custom key suffix function', () => {
    const middleware = cacheMiddleware(CACHE_CONFIGS.employees, () => 'list:active');
    middleware(req as CustomRequest, res as Response, next);

    // Simulate response
    const responseData = { data: [{ id: 1 }] };
    (res.json as jest.Mock)(responseData);

    const cached = getCache().get('employees:company:5:list:active');
    expect(cached).toEqual(responseData);
  });

  it('should isolate cache by companyId', () => {
    const middleware = cacheMiddleware(CACHE_CONFIGS.leaveTypes);

    // Request from company 5
    middleware(req as CustomRequest, res as Response, next);
    (res.json as jest.Mock)([{ name: 'Annual' }]);

    // Request from company 10
    const req2 = { ...req, user: { id: 2, role: 'ADMIN' as const, companyId: 10 } };
    const jsonMock2 = jest.fn().mockReturnThis();
    const res2: Partial<Response> = { json: jsonMock2, statusCode: 200 };
    const next2 = jest.fn();

    middleware(req2 as CustomRequest, res2 as Response, next2);

    // Company 10 should get a cache miss
    expect(next2).toHaveBeenCalled();
  });
});
