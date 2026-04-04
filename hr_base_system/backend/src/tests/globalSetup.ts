/**
 * Jest Global Setup
 * Ensures database is ready before any tests run.
 * This prevents flaky tests in CI where PostgreSQL service container
 * may not be fully ready when tests start.
 */
import { PrismaClient } from '@prisma/client';

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 1000;

async function waitForDatabase(): Promise<void> {
  const prisma = new PrismaClient();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await prisma.$connect();
      // eslint-disable-next-line no-console
      console.log(`[globalSetup] Database connection established (attempt ${attempt})`);
      await prisma.$disconnect();
      return;
    } catch {
      // eslint-disable-next-line no-console
      console.log(`[globalSetup] Database connection attempt ${attempt}/${MAX_RETRIES} failed`);

      if (attempt === MAX_RETRIES) {
        await prisma.$disconnect();
        throw new Error(`Failed to connect to database after ${MAX_RETRIES} attempts`);
      }

      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

export default async function globalSetup(): Promise<void> {
  if (process.env.SKIP_DB_CHECK === 'true') {
    // eslint-disable-next-line no-console
    console.log('[globalSetup] Skipping database check (SKIP_DB_CHECK=true)');
    return;
  }

  // eslint-disable-next-line no-console
  console.log('[globalSetup] Waiting for database to be ready...');
  await waitForDatabase();
  // eslint-disable-next-line no-console
  console.log('[globalSetup] Database is ready, starting tests');
}
