const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.user.updateMany({
    where: { email: 'testuser@example.com' },
    data: { emailVerified: true },
  });
  console.log('User verified!');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
