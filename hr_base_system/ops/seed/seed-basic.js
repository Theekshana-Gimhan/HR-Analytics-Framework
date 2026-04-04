const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seedBasicUsers() {
  try {
    console.log('🌱 Starting basic user seeding...');
    
    // Check if company exists
    let company = await prisma.company.findFirst();
    
    if (!company) {
      console.log('📋 Creating company...');
      company = await prisma.company.create({
        data: {
          name: 'Simpala Tech Pvt Ltd',
          address: '123 Galle Road, Colombo 03, Sri Lanka'
        }
      });
      console.log('✅ Company created:', company.name);
    } else {
      console.log('✅ Using existing company:', company.name);
    }
    
    // Create password hash
    const hash = await bcrypt.hash('password123', 10);
    
    // Create owner
    const existingOwner = await prisma.user.findUnique({ where: { email: 'owner@simpala.lk' } });
    if (!existingOwner) {
      const owner = await prisma.user.create({
        data: {
          email: 'owner@simpala.lk',
          password_hash: hash,
          role: 'OWNER',
          companyId: company.id
        }
      });
      console.log('✅ Created owner:', owner.email);
    } else {
      console.log('ℹ️  Owner already exists');
    }
    
    // Create admin
    const existingAdmin = await prisma.user.findUnique({ where: { email: 'admin@simpala.lk' } });
    if (!existingAdmin) {
      const admin = await prisma.user.create({
        data: {
          email: 'admin@simpala.lk',
          password_hash: hash,
          role: 'ADMIN',
          companyId: company.id
        }
      });
      console.log('✅ Created admin:', admin.email);
    } else {
      console.log('ℹ️  Admin already exists');
    }
    
    // Create HR
    const existingHR = await prisma.user.findUnique({ where: { email: 'hr@simpala.lk' } });
    if (!existingHR) {
      const hr = await prisma.user.create({
        data: {
          email: 'hr@simpala.lk',
          password_hash: hash,
          role: 'ADMIN',
          companyId: company.id
        }
      });
      console.log('✅ Created HR admin:', hr.email);
    } else {
      console.log('ℹ️  HR admin already exists');
    }
    
    console.log('\n🎉 Seeding completed successfully!');
    console.log('\n📧 Login credentials:');
    console.log('   Email: owner@simpala.lk');
    console.log('   Email: admin@simpala.lk');
    console.log('   Email: hr@simpala.lk');
    console.log('   Password: password123 (for all)');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

seedBasicUsers();
