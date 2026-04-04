import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import config from '../config';

export const createRateLimiter = (overrides?: {
  windowMs?: number;
  max?: number;
}): RateLimitRequestHandler => {
  const windowMs = overrides?.windowMs ?? config.RATE_LIMIT_WINDOW_MS;

  const maxDefault = config.NODE_ENV === 'test' ? config.RATE_LIMIT_TEST_MAX : config.RATE_LIMIT_MAX;
  const max = overrides?.max ?? maxDefault;

  return rateLimit({
    windowMs,
    max,
    message: { message: 'Too many requests from this IP, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    // trust proxy is set at app-level; avoid express-rate-limit validation errors
    validate: { trustProxy: false },
  });
};
