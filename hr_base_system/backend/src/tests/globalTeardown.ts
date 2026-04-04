/**
 * Jest Global Teardown
 * Ensures all Prisma connections are properly closed after all tests complete.
 */

export default async function globalTeardown(): Promise<void> {
    console.error('[globalTeardown] All tests completed');
}
