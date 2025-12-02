import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'CardGame'
      ) THEN
        CREATE TYPE "CardGame" AS ENUM (
          'MAGIC_THE_GATHERING',
          'ONE_PIECE',
          'POKEMON',
          'LORCANA'
        );
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "SealedProductCatalog"
    ADD COLUMN IF NOT EXISTS "game" "CardGame" NOT NULL DEFAULT 'MAGIC_THE_GATHERING';
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "BoosterBox"
    ADD COLUMN IF NOT EXISTS "game" "CardGame";
  `);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

