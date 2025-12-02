import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding 1,000 coins to test account...');

  const testEmail = 'test@pactattack.com';
  const coinsToAdd = 1000;

  // Find test user
  const testUser = await prisma.user.findUnique({
    where: { email: testEmail },
  });

  if (!testUser) {
    console.error(`Test user not found: ${testEmail}`);
    console.log('Please create the test user first using: npm run script scripts/create-test-user.ts');
    return;
  }

  // Update test user coins
  const updatedUser = await prisma.user.update({
    where: { email: testEmail },
    data: {
      coins: {
        increment: coinsToAdd,
      },
    },
  });

  console.log('\n✅ Coins added successfully!');
  console.log(`   Email: ${updatedUser.email}`);
  console.log(`   Previous coins: ${(updatedUser.coins - coinsToAdd).toLocaleString()}`);
  console.log(`   Coins added: ${coinsToAdd.toLocaleString()}`);
  console.log(`   New balance: ${updatedUser.coins.toLocaleString()} coins`);
}

main()
  .catch((error) => {
    console.error('Error adding coins:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



