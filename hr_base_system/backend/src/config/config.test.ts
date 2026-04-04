describe('config validator', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // clear module cache
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('throws when required env vars are missing', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalDatabaseUrl = process.env.DATABASE_URL;
    const originalJwtSecret = process.env.JWT_SECRET;
    const originalWorkerId = process.env.JEST_WORKER_ID;

    try {
      // Force non-test environment so validation runs
      process.env.NODE_ENV = 'development';
      delete process.env.DATABASE_URL;
      delete process.env.JWT_SECRET;
      delete process.env.JEST_WORKER_ID;

      // dynamic import to exercise module evaluation
      const importIndex = async () => {
        await import('./index');
      };

      await expect(importIndex()).rejects.toThrow(/Missing required environment variable/);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      process.env.DATABASE_URL = originalDatabaseUrl;
      process.env.JWT_SECRET = originalJwtSecret;
      process.env.JEST_WORKER_ID = originalWorkerId;
    }
  });
});
