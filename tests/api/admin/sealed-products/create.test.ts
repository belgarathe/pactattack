import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/admin/sealed-products/route';

vi.mock('@/lib/auth', () => ({
  getCurrentSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    sealedProductCatalog: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const { getCurrentSession } = await import('@/lib/auth');
const { prisma } = await import('@/lib/prisma');

const samplePayload = {
  name: 'Test Sealed Product',
  setName: 'Sample Set',
  setCode: 'SMP',
  productType: 'SET_BOOSTER_DISPLAY',
  imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAFgwJ/lSo7GQAAAABJRU5ErkJggg==',
  priceAvg: 149.99,
  msrp: 159.99,
  description: 'A demo sealed product for testing.',
  contents: 'Contains awesome things.',
  sourceUri: 'https://example.com/product',
  cardmarketProductId: 123456,
  tcgplayerId: 654321,
  releaseDate: new Date().toISOString(),
  game: 'MAGIC_THE_GATHERING',
};

describe('POST /api/admin/sealed-products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentSession as vi.Mock).mockResolvedValue({
      user: { email: 'admin@example.com' },
    });
    (prisma.user.findUnique as vi.Mock).mockResolvedValue({
      role: 'ADMIN',
    });
    (prisma.sealedProductCatalog.findUnique as vi.Mock).mockResolvedValue(null);
    (prisma.sealedProductCatalog.create as vi.Mock).mockResolvedValue({
      id: 'test-id',
      slug: 'test-sealed-product',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...samplePayload,
    });
  });

  it('creates a sealed product when payload is valid', async () => {
    const request = new Request('http://localhost/api/admin/sealed-products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(samplePayload),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.product).toBeDefined();
    expect(prisma.sealedProductCatalog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: samplePayload.name,
          imageUrl: samplePayload.imageUrl,
        }),
      })
    );
  });
});





