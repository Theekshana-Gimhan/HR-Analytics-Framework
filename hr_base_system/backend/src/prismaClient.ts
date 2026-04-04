import { PrismaClient } from '@prisma/client';
import logger from './utils/logger';

// Export a shared PrismaClient instance. Enable query logging for diagnostics
// so we can observe the SQL being emitted when debugging seed/runtime issues.
// Tests that need to mock the client should mock this module (e.g. jest.mock('../prismaClient')).
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'info' },
    { emit: 'stdout', level: 'warn' },
    { emit: 'stdout', level: 'error' },
  ],
});

// Forward Prisma query events to our app logger at debug level. This keeps
// the logs centralized and makes it easier to correlate SQL to request traces.
try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (prisma as any).$on('query', (e: { query: string; params: string; duration: number }) => {
    try {
      logger.debug('Prisma query', { query: e.query, params: e.params, duration: e.duration });
    } catch {
      // Swallow logging errors to avoid impacting runtime behavior
    }
  });
} catch {
  // $on may not be available in all Prisma versions — degrade gracefully
  logger.warn('Prisma $on("query") not available; query-level logging disabled');
}

// Prisma query events are already forwarded to the app logger above.
// Removed redundant stdout emission (PRISMA_QUERY) to avoid leaking
// query details in production Cloud Run logs.

export { prisma };
