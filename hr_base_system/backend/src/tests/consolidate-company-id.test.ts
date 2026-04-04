import { prisma } from '../prismaClient';

// Integration test to validate canonical company_id mapping and seed behavior.
// This test requires a running DB and will create data. Run in a disposable/staging DB.

type UserRow = {
  id: number;
  email: string;
  companyId: number | null;
  company_id: number | null;
};

describe.skip('consolidate company_id migration', () => {
  test('creates user with companyId and stores value in canonical company_id column', async () => {
    // Create a company
    const company = await prisma.company.create({
      data: { name: 'Test Co', address: 'Test Addr' },
    });

    // Create a user via Prisma client (field name is companyId in Prisma schema)
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        password_hash: 'hashed-password',
        role: 'EMPLOYEE',
        companyId: company.id,
      },
      select: { id: true, email: true, companyId: true },
    });

    expect(user.companyId).toBe(company.id);

    // Verify raw DB columns: "companyId" (camelCase), company_id (canonical)
    const rows: UserRow[] = await prisma.$queryRaw`
      SELECT id, email, "companyId", company_id FROM "User" WHERE id = ${user.id};
    `;

    const row = rows[0];
    // After migration, canonical company_id should equal the company id
    expect(row.company_id).toBe(company.id);

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.company.delete({ where: { id: company.id } });
  }, 20000);
});
