import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { sealedProductSeeds } from './data/sealedProducts';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@pactattack.com' },
    update: {
      coins: 100000, // Always update to 100k for testing
    },
    create: {
      email: 'admin@pactattack.com',
      name: 'Admin User',
      passwordHash: adminPassword,
      role: 'ADMIN',
      coins: 100000,
    },
  });

  console.log('Created admin user:', admin.email);

  // Create test user
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@pactattack.com' },
    update: {},
    create: {
      email: 'user@pactattack.com',
      name: 'Test User',
      passwordHash: userPassword,
      role: 'USER',
      coins: 500,
    },
  });

  console.log('Created test user:', user.email);

  // Create sample box
  const box = await prisma.box.upsert({
    where: { id: 'sample-box-1' },
    update: {},
    create: {
      id: 'sample-box-1',
      name: 'Magic: The Gathering Starter Pack',
      description: 'A fantastic starter pack featuring cards from various Magic: The Gathering sets. Perfect for beginners and collectors alike!',
      imageUrl: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800',
      price: 100,
      cardsPerPack: 3,
      games: {
        set: ['MAGIC_THE_GATHERING'],
      },
      isActive: true,
      featured: true,
      popularity: 0,
    },
  });

  console.log('Created sample box:', box.name);

  // Create sample cards (using placeholder data - in production, fetch from Scryfall/Gatherer)
  const sampleCards = [
    {
      scryfallId: 'card-1',
      name: 'Lightning Bolt',
      setName: 'Magic 2021',
      setCode: 'M21',
      collectorNumber: '161',
      rarity: 'Common',
      imageUrlGatherer: 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=489456&type=card',
      colors: ['Red'],
      cmc: 1,
      type: 'Instant',
      pullRate: 60.0,
      coinValue: 1,
    },
    {
      scryfallId: 'card-2',
      name: 'Counterspell',
      setName: 'Magic 2021',
      setCode: 'M21',
      collectorNumber: '57',
      rarity: 'Uncommon',
      imageUrlGatherer: 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=489456&type=card',
      colors: ['Blue'],
      cmc: 2,
      type: 'Instant',
      pullRate: 30.0,
      coinValue: 5,
    },
    {
      scryfallId: 'card-3',
      name: 'Black Lotus',
      setName: 'Alpha',
      setCode: 'LEA',
      collectorNumber: '1',
      rarity: 'Mythic',
      imageUrlGatherer: 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=489456&type=card',
      colors: [],
      cmc: 0,
      type: 'Artifact',
      pullRate: 0.1,
      coinValue: 1000,
    },
  ];

  for (const cardData of sampleCards) {
    await prisma.card.upsert({
      where: {
        scryfallId_boxId: {
          scryfallId: cardData.scryfallId,
          boxId: box.id,
        },
      },
      update: {},
      create: {
        ...cardData,
        boxId: box.id,
        priceLow: 0.10,
        priceAvg: 0.50,
        priceHigh: 1.00,
        priceLastUpdated: new Date(),
        sourceGame: 'MAGIC_THE_GATHERING',
      },
    });
  }

  console.log('Created sample cards');

  for (const product of sealedProductSeeds) {
    await prisma.sealedProductCatalog.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        setName: product.setName,
        setCode: product.setCode,
        productType: product.productType,
        imageUrl: product.imageUrl,
        description: product.description,
        contents: product.contents,
        releaseDate: product.releaseDate ? new Date(product.releaseDate) : null,
        priceAvg: product.priceAvg ? product.priceAvg : undefined,
        tcgplayerId: product.tcgplayerId ?? null,
        sourceUri: product.sourceUri ?? null,
      },
      create: {
        slug: product.slug,
        name: product.name,
        setName: product.setName,
        setCode: product.setCode,
        productType: product.productType,
        imageUrl: product.imageUrl,
        description: product.description,
        contents: product.contents,
        releaseDate: product.releaseDate ? new Date(product.releaseDate) : undefined,
        priceAvg: product.priceAvg ? product.priceAvg : undefined,
        tcgplayerId: product.tcgplayerId ?? null,
        sourceUri: product.sourceUri ?? null,
      },
    });
  }

  console.log(`Seeded ${sealedProductSeeds.length} sealed products`);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

