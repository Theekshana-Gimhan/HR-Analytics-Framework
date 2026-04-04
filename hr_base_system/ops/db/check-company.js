const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'owner@simpala.lk' },
    include: { company: true }
  });
  console.log(JSON.stringify(user, null, 2));
  
  const companies = await prisma.company.findMany();
  console.log('\nAll companies:');
  console.log(JSON.stringify(companies, null, 2));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
