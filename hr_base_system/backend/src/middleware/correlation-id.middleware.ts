import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// Extend Express Request type to include correlationId using module augmentation
declare module 'express' {
  interface Request {
    correlationId?: string;
  }
}

/**
 * Middleware to add correlation ID to each request for tracing
 * Checks for existing X-Correlation-ID header, or generates a new one
 */
export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Use existing correlation ID from header, or generate new UUID
  const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();

  // Attach to request object for use in controllers/services
  req.correlationId = correlationId;

  // Send correlation ID in response header for client tracking
  res.setHeader('X-Correlation-ID', correlationId);

  next();
};
