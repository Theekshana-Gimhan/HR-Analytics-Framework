import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Custom HTTP error class for throwing errors with proper status codes.
 * Services should throw HttpError instead of plain Error to ensure
 * the correct HTTP status code is returned.
 */
export class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

/**
 * Convenience factory for common HTTP errors.
 */
export class NotFoundError extends HttpError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class BadRequestError extends HttpError {
  constructor(message = 'Bad request') {
    super(message, 400);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

export const handleError = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = 500;
  let message = 'Something went wrong';

  if (err instanceof HttpError) {
    // HttpError carries its own status code — use it directly
    statusCode = err.status;
    message = err.message;
  } else if (err.name === 'ValidationError') {
    // Zod validation errors
    statusCode = 400;
    message = err.message;
  } else if ((err as { code?: string }).code === 'P2025') {
    // Prisma: record not found
    statusCode = 404;
    message = 'Record not found';
  } else if ((err as { code?: string; meta?: { target?: string[] } }).code === 'P2002') {
    // Prisma: unique constraint violation
    statusCode = 409;
    const target = (err as { meta?: { target?: string[] } }).meta?.target;
    message = target
      ? `A record with this ${Array.isArray(target) ? target.join(', ') : target} already exists`
      : 'A record with these values already exists';
  } else if ((err as { code?: string }).code === 'P2003') {
    // Prisma: foreign key constraint failure
    statusCode = 400;
    message = 'Referenced record does not exist';
  }

  logger.error('Error:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  res.status(statusCode).json({ message });
};
