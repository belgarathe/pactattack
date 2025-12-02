import type { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const createClientMock = () => {
  return {
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
  } as unknown as PrismaClient;
};

describe('ensureBoxGamesColumn', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('coalesces concurrent calls but reruns after completion', async () => {
    const client = createClientMock();
    const module = await import('@/lib/ensureBoxGamesColumn');
    module.__resetEnsureBoxGamesColumnForTests();

    const initialCalls = client.$executeRawUnsafe.mock.calls.length;

    // Two concurrent calls should share the same in-flight promise.
    await Promise.all([
      module.ensureBoxGamesColumn(client),
      module.ensureBoxGamesColumn(client),
    ]);

    const afterConcurrent = client.$executeRawUnsafe.mock.calls.length;
    expect(afterConcurrent).toBeGreaterThan(initialCalls);

    await module.ensureBoxGamesColumn(client);
    const afterSecondRun = client.$executeRawUnsafe.mock.calls.length;

    expect(afterSecondRun).toBeGreaterThan(afterConcurrent);
  });

  it('retries the migrations after a failure', async () => {
    const client = createClientMock();
    client.$executeRawUnsafe
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue(undefined);

    const module = await import('@/lib/ensureBoxGamesColumn');
    module.__resetEnsureBoxGamesColumnForTests();

    await expect(module.ensureBoxGamesColumn(client)).rejects.toThrow('boom');
    const callsAfterFailure = client.$executeRawUnsafe.mock.calls.length;

    await module.ensureBoxGamesColumn(client);
    const callsAfterRetry = client.$executeRawUnsafe.mock.calls.length;

    expect(callsAfterRetry).toBeGreaterThan(callsAfterFailure);
  });
});

