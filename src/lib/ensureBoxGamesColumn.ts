import type { PrismaClient } from '@prisma/client';

let ensurePromise: Promise<void> | null = null;

export async function ensureCardSourceColumn(client: PrismaClient) {
  await client.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CardGame') THEN
        CREATE TYPE "CardGame" AS ENUM (
          'MAGIC_THE_GATHERING',
          'ONE_PIECE',
          'POKEMON',
          'LORCANA'
        );
      END IF;
    END $$;
  `);

  await client.$executeRawUnsafe(`
    ALTER TABLE "Box"
    ADD COLUMN IF NOT EXISTS "games" "CardGame"[] NOT NULL DEFAULT ARRAY['MAGIC_THE_GATHERING']::"CardGame"[];
  `);

  await client.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'Box'
          AND column_name = 'game'
      ) THEN
        UPDATE "Box"
        SET "games" = ARRAY["game"]
        WHERE COALESCE(cardinality("games"), 0) = 0;

        ALTER TABLE "Box"
        DROP COLUMN "game";
      END IF;
    END $$;
  `);

  await client.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'Card'
          AND column_name = 'sourceGame'
      ) THEN
        ALTER TABLE "Card"
        ADD COLUMN "sourceGame" "CardGame" NOT NULL DEFAULT 'MAGIC_THE_GATHERING';
      END IF;
    END $$;
  `);

  await client.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'Card_scryfallId_key'
      ) THEN
        DROP INDEX "Card_scryfallId_key";
      END IF;
    END $$;
  `);

  await client.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Card_scryfallId_boxId_key" ON "Card"("scryfallId", "boxId");
  `);
}

async function runCompatibilityMigrations(client: PrismaClient) {
  await ensureCardSourceColumn(client);
}

export async function ensureBoxGamesColumn(client: PrismaClient) {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await runCompatibilityMigrations(client);
    })().catch((error) => {
      console.error('Compatibility migrations failed', error);
      throw error;
    }).finally(() => {
      ensurePromise = null;
    });
  }

  return ensurePromise;
}

export function __resetEnsureBoxGamesColumnForTests() {
  ensurePromise = null;
}

export function isMissingSourceGameColumnError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = (error as Record<string, unknown>).code;
  const meta = (error as Record<string, unknown>).meta as Record<string, unknown> | undefined;
  const column =
    typeof meta?.column === 'string' ? meta.column : undefined;
  const message =
    typeof (error as Record<string, unknown>).message === 'string'
      ? ((error as Record<string, unknown>).message as string)
      : '';

  return (
    code === 'P2022' &&
    ((column && column.includes('Card.sourceGame')) ||
      message.includes('Card.sourceGame'))
  );
}

