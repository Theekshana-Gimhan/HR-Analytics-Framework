import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Catch uncaught errors during module loading / startup so Cloud Run logs show what went wrong
process.on('uncaughtException', (err) => {

  console.error('UNCAUGHT EXCEPTION during startup:', err);
  process.exit(1);
});

// Validate configuration early and fail fast if missing
import config from './config';
import logger from './utils/logger';
import { httpLogger } from './middleware/http-logger.middleware';
import { correlationIdMiddleware } from './middleware/correlation-id.middleware';
import { handleError } from './middleware/error.middleware';
import { createRateLimiter } from './middleware/rate-limit.middleware';

const app = express();
// Cloud Run and other proxies set X-Forwarded-* headers. Set trust proxy to
// the number of proxies (1 for Cloud Run) to avoid express-rate-limit validation
// errors while still extracting the correct client IP.
app.set('trust proxy', 1);
const port = config.PORT;

// Add correlation ID to each request (must be early in middleware chain)
app.use(correlationIdMiddleware);

// Security: Helmet middleware for secure HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  })
);

// Security: CORS with configurable origins (must be before rate limiter so error responses include CORS headers)
// Normalize origin list: remove surrounding quotes and whitespace so values like "*" or "http://localhost:5173" work
const allowedOrigins = config.CORS_ORIGIN.split(',').map((o) => o.trim().replace(/^['"]|['"]$/g, ''));
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, curl)
      if (!origin) return callback(null, true);

      // If wildcard specified anywhere (e.g. * or "*") reflect the origin to allow credentials usage
      const hasWildcard = allowedOrigins.includes('*');

      if (hasWildcard || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Some Cloud Run / local dev origins may include a trailing slash; try a relaxed comparison
      const normalizedOrigin = origin.replace(/\/$/, '');
      if (allowedOrigins.map((o) => o.replace(/\/$/, '')).includes(normalizedOrigin)) {
        return callback(null, true);
      }

      logger.warn('CORS blocked origin', { origin, allowedOrigins });
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  })
);

// Security: Rate limiting (env-configurable; test env is relaxed by default)
app.use(createRateLimiter());

// Security: Limit JSON body size to prevent large payload attacks
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Add HTTP request logging (before routes)
app.use(httpLogger);

import authRoutes from './routes/auth.routes';
import employeeRoutes from './routes/employee.routes';
import jobRoutes from './routes/job.routes';
import leaveRoutes from './routes/leave.routes';
import attendanceRoutes from './routes/attendance.routes';
import payrollRoutes from './routes/payroll.routes';
import dashboardRoutes from './routes/dashboard.routes';
import userRoutes from './routes/user.routes';
import shiftTemplateRoutes from './routes/shift-template.routes';
import rosterRoutes from './routes/roster.routes';
import companyRoutes from './routes/company.routes';
import auditRoutes from './routes/audit.routes';
import expiryDocumentRoutes from './routes/expiry-document.routes';
import testRoutes from './routes/test.routes';
import * as healthController from './controllers/health.controller';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { prisma } from './prismaClient';

// API Documentation (disabled in production for security)
if (config.NODE_ENV !== 'production') {
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Simpala HR API Documentation',
    })
  );
}

// Health check endpoint (no auth required)
app.get('/health', healthController.healthCheck);

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1/leave', leaveRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/payroll', payrollRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/shift-templates', shiftTemplateRoutes);
app.use('/api/v1/roster', rosterRoutes);
app.use('/api/v1/company', companyRoutes);
app.use('/api/v1/audit-logs', auditRoutes);
app.use('/api/v1/expiry-documents', expiryDocumentRoutes);
app.use('/api/v1/test', testRoutes);

// Add HTTP error logging (after routes)
app.use(handleError);

app.get('/', (req: Request, res: Response) => {
  res.send('Hello from Simpala HR Backend!');
});

const server = app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});

/**
 * Graceful shutdown handler for Cloud Run SIGTERM and local SIGINT.
 * Closes HTTP server first, then database connections.
 */
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Force exit after 10s if shutdown hangs
  const forceExit = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 10000);

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      await prisma.$disconnect();
      logger.info('Database connection closed');
      clearTimeout(forceExit);
      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error('Error during database disconnection:', err);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
