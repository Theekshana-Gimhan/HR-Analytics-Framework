// Quick script to check for existing users
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL
});

async function checkUsers() {
  try {
    console.log('🔍 Checking for existing users...\n');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (users.length === 0) {
      console.log('❌ No users found in the database.');
      console.log('\n📝 You need to create a new user account.');
    } else {
      console.log(`✅ Found ${users.length} user(s):\n`);
      users.forEach((user, index) => {
        console.log(`User ${index + 1}:`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Name: ${user.name}`);
        console.log(`  Role: ${user.role}`);
        console.log(`  Active: ${user.isActive}`);
        console.log(`  Created: ${user.createdAt}`);
        console.log('  ⚠️  Password: [stored as bcrypt hash - cannot retrieve]');
        console.log('');
      });
      
      console.log('\n💡 Note: Passwords are hashed and cannot be retrieved.');
      console.log('   If you need to login, you may need to reset the password.');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkUsers();
