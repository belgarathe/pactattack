import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating test user account...');

  const email = 'test@pactattack.com';
  const password = 'test123';
  const name = 'Test User';
  const coins = 10000;

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create or update user
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      coins: coins, // Update coins to 10,000
      passwordHash, // Update password in case it changed
    },
    create: {
      email,
      name,
      passwordHash,
      role: 'USER',
      coins: coins,
    },
  });

  console.log('\n✅ Test user created/updated successfully!');
  console.log('\n📧 Login Credentials:');
  console.log(`   Email: ${user.email}`);
  console.log(`   Password: ${password}`);
  console.log(`   Coins: ${user.coins.toLocaleString()} 💎`);
  console.log(`   Role: ${user.role}`);
  console.log(`   User ID: ${user.id}`);
  console.log('\n🔗 Login at: http://localhost:3000/login');
}

main()
  .catch((error) => {
    console.error('Error creating test user:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

