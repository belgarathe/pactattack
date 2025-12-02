import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding 10,000 coins to admin account...');

  const adminEmail = 'admin@pactattack.com';
  const coinsToAdd = 10000;

  // Find admin user
  const admin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!admin) {
    console.error(`Admin user not found: ${adminEmail}`);
    console.log('Creating admin user...');
    
    // Create admin if it doesn't exist
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.default.hash('admin123', 10);
    
    const newAdmin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin User',
        passwordHash,
        role: 'ADMIN',
        coins: coinsToAdd,
      },
    });
    
    console.log('\n✅ Admin user created with 10,000 coins!');
    console.log(`   Email: ${newAdmin.email}`);
    console.log(`   Password: admin123`);
    console.log(`   Coins: ${newAdmin.coins.toLocaleString()}`);
    return;
  }

  // Update admin coins
  const updatedAdmin = await prisma.user.update({
    where: { email: adminEmail },
    data: {
      coins: {
        increment: coinsToAdd,
      },
    },
  });

  console.log('\n✅ Coins added successfully!');
  console.log(`   Email: ${updatedAdmin.email}`);
  console.log(`   Previous coins: ${(updatedAdmin.coins - coinsToAdd).toLocaleString()}`);
  console.log(`   Coins added: ${coinsToAdd.toLocaleString()}`);
  console.log(`   New balance: ${updatedAdmin.coins.toLocaleString()} coins`);
}

main()
  .catch((error) => {
    console.error('Error adding coins:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });




