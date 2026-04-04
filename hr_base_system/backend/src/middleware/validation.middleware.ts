import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodIssue } from 'zod';

/**
 * Middleware to validate request body against a Zod schema
 */
export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate and parse the request body
      req.body = await schema.parseAsync(req.body);
      return next();
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        const formattedErrors = err.issues.map((issue: ZodIssue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));

        return res.status(400).json({
          message: 'Validation failed',
          errors: formattedErrors,
        });
      }

      // unexpected error
      console.error('Validation middleware error:', err);
      return res.status(500).json({ message: 'Internal server error during validation' });
    }
  };
};

/**
 * Middleware to validate request params against a Zod schema
 */
export const validateParams = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.params);
      req.params = validated as typeof req.params;
      return next();
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        const formattedErrors = err.issues.map((issue: ZodIssue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));

        return res.status(400).json({
          message: 'Invalid request parameters',
          errors: formattedErrors,
        });
      }

      console.error('Param validation error:', err);
      return res.status(500).json({ message: 'Internal server error during parameter validation' });
    }
  };
};

/**
 * Middleware to validate request query against a Zod schema
 */
export const validateQuery = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.query);

      // Copy validated values onto existing req.query to avoid reassigning the property
      const validatedObj = validated as Record<string, unknown>;
      Object.keys(validatedObj).forEach((k) => {
        (req.query as Record<string, unknown>)[k] = validatedObj[k];
      });

      return next();
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        const formattedErrors = err.issues.map((issue: ZodIssue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));

        return res.status(400).json({
          message: 'Invalid query parameters',
          errors: formattedErrors,
        });
      }

      console.error('Query validation error:', err);
      return res.status(500).json({ message: 'Internal server error during query validation' });
    }
  };
};
