import { PrismaClient } from '@prisma/client';
import { ensureBoxGamesColumn } from './ensureBoxGamesColumn';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  boxGamesMiddlewareRegistered?: boolean;
  boxGamesEnsurePromise?: Promise<void> | null;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export function ensureBoxGamesReady() {
  if (!globalForPrisma.boxGamesEnsurePromise) {
    globalForPrisma.boxGamesEnsurePromise = ensureBoxGamesColumn(prisma).catch((error) => {
      globalForPrisma.boxGamesEnsurePromise = null;
      throw error;
    });
  }
  return globalForPrisma.boxGamesEnsurePromise;
}

if (typeof prisma.$use === 'function') {
  if (!globalForPrisma.boxGamesMiddlewareRegistered) {
    prisma.$use(async (params, next) => {
      if (params.model === 'Box') {
        await ensureBoxGamesReady();
      }
      return next(params);
    });
    globalForPrisma.boxGamesMiddlewareRegistered = true;
  }
} else {
  // Prisma Accelerate / Edge clients do not expose $use, so wrap Box delegate to ensure compatibility.
  const boxDelegate = prisma.box;
  const proxy = new Proxy(boxDelegate, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function') {
        return value;
      }
      return async (...args: unknown[]) => {
        await ensureBoxGamesReady();
        return (value as (...fnArgs: unknown[]) => unknown).apply(target, args);
      };
    },
  });
  (prisma as PrismaClient & { box: typeof boxDelegate }).box = proxy;
}

// Verify Prisma Client is initialized
if (!prisma) {
  throw new Error('Prisma Client failed to initialize');
}

