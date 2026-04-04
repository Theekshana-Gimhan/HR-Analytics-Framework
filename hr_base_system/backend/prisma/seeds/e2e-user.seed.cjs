"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Safe incremental seed to ensure E2E test employee exists without wiping data.
 * Usage (PowerShell):
 *   $env:CONFIRM_E2E_USER="yes"; $env:DATABASE_URL="<cloud_dev_db_url>"; npm run seed:e2e-user
 *
 * Guard rails:
 *  - Requires CONFIRM_E2E_USER=yes to run (prevents accidental prod execution)
 *  - Only creates/updates john.doe@simpala.lk and his employee record + leave balances
 *  - Assumes companyId = 1 by default; override with E2E_COMPANY_ID env var if needed
 */
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
/**
 * Diagnostic helper: sanitize and print DB host for visibility when failures occur.
 */
function logDatabaseTarget() {
    const raw = process.env.DATABASE_URL || '';
    // Try to extract host:port portion after '@'
    const match = raw.split('@')[1];
    const hostPort = match ? match.split('/')[0] : 'unknown';
    console.log(`🗄  Database target: ${hostPort}`);
}
const REQUIRED_CONFIRM = 'yes';
if (process.env.CONFIRM_E2E_USER !== REQUIRED_CONFIRM) {
    console.error(`❌ Aborting: set CONFIRM_E2E_USER=${REQUIRED_CONFIRM} to proceed.`);
    process.exit(1);
}
const prisma = new client_1.PrismaClient();
const COMPANY_ID = parseInt(process.env.E2E_COMPANY_ID ?? '1', 10);
const TEST_EMAIL = 'john.doe@simpala.lk';
const TEST_PASSWORD = 'Employee123!';
function resolveCompanyId() {
    // Lightweight placeholder (avoids referencing prisma.company delegate for environments without generated client during lint phase)
    console.log(`🏢 Using configured companyId=${COMPANY_ID} (override with E2E_COMPANY_ID env var).`);
    return COMPANY_ID;
}
async function ensureE2EUser(effectiveCompanyId) {
    console.log('🔍 Ensuring E2E test user exists...');
    const existing = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    if (existing) {
        if (existing.companyId === effectiveCompanyId) {
            console.log(`✅ User already exists (id=${existing.id})`);
        }
        else {
            console.log(`ℹ️ Existing user companyId=${existing.companyId} differs from target=${effectiveCompanyId}; leaving unchanged.`);
        }
        return existing;
    }
    console.log('➕ Creating user...');
    const password_hash = await bcrypt_1.default.hash(TEST_PASSWORD, 10);
    const created = await prisma.user.create({
        data: {
            email: TEST_EMAIL,
            password_hash,
            role: 'EMPLOYEE',
            companyId: effectiveCompanyId,
        },
    });
    console.log(`✅ User created (id=${created.id})`);
    return created;
}
async function ensureEmployee(userId) {
    console.log('🔍 Ensuring employee profile exists...');
    const existing = await prisma.employee.findFirst({ where: { userId } });
    if (existing) {
        console.log(`✅ Employee already exists (id=${existing.id})`);
        return existing;
    }
    console.log('➕ Creating employee profile...');
    const created = await prisma.employee.create({
        data: {
            userId,
            first_name: 'John',
            last_name: 'Doe',
            nic: '199012345678',
            job_title: 'Software Engineer',
            salary: 150000,
            bank_details: 'Bank of Ceylon - 0123456789',
            bank_name: 'Bank of Ceylon',
            bank_code: '7010',
            branch_code: '001',
            account_number: '0123456789',
            date_of_birth: new Date('1990-01-01'),
            phone_number: '+94771234567',
            address: '123 Main Street, Colombo 03',
            employmentStartDate: new Date('2024-01-01'),
        },
    });
    console.log(`✅ Employee created (id=${created.id})`);
    return created;
}
async function ensureLeaveBalances(employeeId, effectiveCompanyId) {
    console.log('🔍 Ensuring leave balances exist...');
    const types = await prisma.leaveType.findMany({ where: { companyId: effectiveCompanyId } });
    if (types.length === 0) {
        console.log('⚠️ No leave types found for company; skipping balances.');
        console.log('👉 If this is unexpected, run the admin leave type setup or dev seed.');
        return;
    }
    for (const lt of types) {
        const existing = await prisma.employeeLeaveBalance.findFirst({
            where: { employeeId, leaveTypeId: lt.id },
        });
        if (existing) {
            console.log(`   ✅ Balance already exists for '${lt.name}'`);
        }
        else {
            await prisma.employeeLeaveBalance.create({
                data: { employeeId, leaveTypeId: lt.id },
            });
            console.log(`   ➕ Balance created for leaveType '${lt.name}' (id=${lt.id})`);
        }
    }
}
async function testDbConnectivity() {
    console.log('🔌 Testing database connectivity...');
    try {
        // Use a lightweight delegate operation instead of $queryRaw to avoid lint false negatives
        await prisma.user.count();
        console.log('✅ Database connectivity OK');
    }
    catch (err) {
        console.error('❌ Database connectivity test failed:', err);
        throw err; // Bubble up
    }
}
async function main() {
    console.log('🚀 Starting incremental E2E user seed');
    logDatabaseTarget();
    await testDbConnectivity();
    const effectiveCompanyId = resolveCompanyId();
    console.log(`🏢 Using companyId=${effectiveCompanyId}`);
    const user = await ensureE2EUser(effectiveCompanyId);
    const employee = await ensureEmployee(user.id);
    await ensureLeaveBalances(employee.id, effectiveCompanyId);
    console.log('\n🎉 E2E user seed complete. Credentials:');
    console.log(`   Email: ${TEST_EMAIL}`);
    console.log(`   Password: ${TEST_PASSWORD}`);
    console.log('🧪 Next: run Playwright leave-request-form test against deployed frontend.');
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
    try {
        await main();
    }
    catch (e) {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    }
    finally {
        if (prisma.$disconnect) {
            await prisma.$disconnect();
        }
    }
})();
