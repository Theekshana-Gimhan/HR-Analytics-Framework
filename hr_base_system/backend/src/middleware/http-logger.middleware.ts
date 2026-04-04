import expressWinston from 'express-winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import winston from 'winston';

const isProduction = process.env.NODE_ENV === 'production';

// Extend Express Request type to include user (from auth middleware)
declare module 'express' {
  interface Request {
    user?: {
      id: number;
      role: string;
    };
    correlationId?: string;
  }
}

// Daily rotation configuration
const rotationConfig = {
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
};

// Build transports based on environment
const httpTransports: winston.transport[] = [new winston.transports.Console()];
const errorTransports: winston.transport[] = [new winston.transports.Console()];

if (!isProduction) {
  httpTransports.push(
    new DailyRotateFile({
      ...rotationConfig,
      filename: 'logs/http-%DATE%.log',
    })
  );
  errorTransports.push(
    new DailyRotateFile({
      ...rotationConfig,
      filename: 'logs/error-%DATE%.log',
    })
  );
}

// HTTP request logger middleware
export const httpLogger = expressWinston.logger({
  transports: httpTransports,
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  meta: true, // Include metadata
  msg: 'HTTP {{req.method}} {{req.url}}',
  expressFormat: true,
  colorize: false,
  ignoreRoute: (req) => {
    // Don't log health check requests to reduce noise
    return req.url === '/health';
  },
  // Add correlation ID to logs
  dynamicMeta: (req) => {
    return {
      correlationId: req.correlationId,
      userId: req.user?.id,
      userRole: req.user?.role,
    };
  },
});

// HTTP error logger middleware
export const httpErrorLogger = expressWinston.errorLogger({
  transports: errorTransports,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  // Add correlation ID to error logs
  dynamicMeta: (req) => {
    return {
      correlationId: req.correlationId,
      userId: req.user?.id,
      userRole: req.user?.role,
    };
  },
});
