import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

type Config = {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  CORS_ORIGIN: string;
  STORAGE_DRIVER: 'local' | 's3';
  LOCAL_STORAGE_ROOT: string;
  DOCUMENT_MAX_FILE_SIZE_MB: number;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX: number;
  RATE_LIMIT_TEST_MAX: number;
};

const NODE_ENV = (process.env.NODE_ENV || 'development') as Config['NODE_ENV'];

// Only validate required env vars in production/dev mode (not in test/CI)
const isTestEnvironment = NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
const required = isTestEnvironment ? [] : ['DATABASE_URL', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    // console.error is allowed here for fatal startup errors
    console.error(`FATAL: Missing required environment variable: ${key}. Set it via --update-secrets or --set-env-vars in Cloud Run.`);
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'; // Default to allow all in dev
const STORAGE_DRIVER = (process.env.STORAGE_DRIVER || 'local') as Config['STORAGE_DRIVER'];
const LOCAL_STORAGE_ROOT =
  process.env.LOCAL_STORAGE_ROOT || path.resolve(process.cwd(), 'uploads', 'documents');
const DOCUMENT_MAX_FILE_SIZE_MB = process.env.DOCUMENT_MAX_FILE_SIZE_MB
  ? parseInt(process.env.DOCUMENT_MAX_FILE_SIZE_MB, 10)
  : 5;

// Rate limiting
// - Production/dev defaults enforce QA expectation (429 after ~100 rapid requests)
// - Test defaults are relaxed to avoid flaky suites; can be overridden per-test
const RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS
  ? parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10)
  : 15 * 60 * 1000;

const RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX, 10) : 100;

const RATE_LIMIT_TEST_MAX = process.env.RATE_LIMIT_TEST_MAX
  ? parseInt(process.env.RATE_LIMIT_TEST_MAX, 10)
  : 10_000;

const config: Config = {
  NODE_ENV,
  PORT,
  DATABASE_URL: process.env.DATABASE_URL as string,
  JWT_SECRET: process.env.JWT_SECRET as string,
  CORS_ORIGIN,
  STORAGE_DRIVER,
  LOCAL_STORAGE_ROOT,
  DOCUMENT_MAX_FILE_SIZE_MB,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX,
  RATE_LIMIT_TEST_MAX,
};

export default config;
