import { describe, expect, it, beforeEach, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({
  getCurrentSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    box: {
      create: vi.fn(),
    },
  },
  ensureBoxGamesReady: vi.fn(),
}));

import { POST } from '@/app/api/admin/boxes/route';
import { getCurrentSession } from '@/lib/auth';
import { prisma, ensureBoxGamesReady } from '@/lib/prisma';

const mockedGetCurrentSession = vi.mocked(getCurrentSession);
const mockedEnsureBoxGamesReady = vi.mocked(ensureBoxGamesReady);
const mockedPrisma = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> };
  box: { create: ReturnType<typeof vi.fn> };
};

function createRequest(body: unknown) {
  return new Request('http://localhost/api/admin/boxes', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const validPayload = {
  name: 'Test Box',
  description: 'A sample description',
  imageUrl: 'https://example.com/image.png',
  price: 100,
  cardsPerPack: 3,
  featured: true,
  games: ['MAGIC_THE_GATHERING'],
};

describe('POST /api/admin/boxes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedEnsureBoxGamesReady.mockResolvedValue(undefined);
  });

  it('returns 401 when no session user', async () => {
    mockedGetCurrentSession.mockResolvedValue(null);

    const response = await POST(createRequest(validPayload));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ error: 'Unauthorized' });
    expect(mockedEnsureBoxGamesReady).toHaveBeenCalledTimes(1);
  });

  it('returns 403 when user is not admin', async () => {
    mockedGetCurrentSession.mockResolvedValue({ user: { email: 'user@example.com' } });
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', role: 'USER' });

    const response = await POST(createRequest(validPayload));
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json).toEqual({ error: 'Forbidden' });
  });

  it('returns 400 when payload is invalid', async () => {
    mockedGetCurrentSession.mockResolvedValue({ user: { email: 'admin@example.com' } });
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });

    const response = await POST(createRequest({}));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('Invalid input');
    expect(Array.isArray(json.details ?? [])).toBe(true);
  });

  it('creates a box when request is valid and user is admin', async () => {
    mockedGetCurrentSession.mockResolvedValue({ user: { email: 'admin@example.com' } });
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
    mockedPrisma.box.create.mockResolvedValue({
      id: 'box-1',
      ...validPayload,
      games: validPayload.games,
    });

    const response = await POST(createRequest(validPayload));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.box.id).toBe('box-1');
    expect(mockedPrisma.box.create).toHaveBeenCalledWith({
      data: {
        name: validPayload.name,
        description: validPayload.description,
        imageUrl: validPayload.imageUrl,
        price: validPayload.price,
        cardsPerPack: validPayload.cardsPerPack,
        featured: validPayload.featured,
        games: { set: validPayload.games },
        heroDisplayMode: 'AUTO',
      },
    });
  });
});

