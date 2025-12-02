import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';

const findManyMock = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    box: {
      findMany: (...args: unknown[]) => findManyMock(...args),
    },
  },
}));

vi.mock('@/lib/ensureBoxGamesColumn', () => ({
  ensureBoxGamesColumn: vi.fn().mockResolvedValue(undefined),
}));

const createBox = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'box-1',
  name: 'Test Box',
  description: 'Desc',
  imageUrl: 'https://example.com/img.png',
  price: 100,
  cardsPerPack: 3,
  isActive: true,
  featured: false,
  popularity: 0,
  games: ['POKEMON'],
  game: null,
  heroDisplayMode: 'AUTO',
  cards: [
    {
      id: 'card-1',
      scryfallId: 'scry-1',
      name: 'Rare Card',
      imageUrlGatherer: 'https://example.com/card.png',
      imageUrlScryfall: null,
      priceAvg: new Prisma.Decimal(12.5),
      priceLow: new Prisma.Decimal(8.5),
      priceHigh: new Prisma.Decimal(15.0),
      pullRate: new Prisma.Decimal(5.5),
      rarity: 'Rare',
    },
  ],
  boosterBoxes: [
    {
      id: 'sealed-1',
      name: 'Premium Sealed',
      imageUrl: 'https://example.com/sealed.png',
      setName: 'Alpha',
      setCode: 'ALP',
      productType: 'SET_BOOSTER_DISPLAY',
      priceAvg: new Prisma.Decimal(250),
      priceLow: new Prisma.Decimal(200),
      priceHigh: new Prisma.Decimal(300),
      catalogId: 'catalog-1',
      catalog: {
        id: 'catalog-1',
        name: 'Premium Sealed Catalog',
        imageUrl: 'https://example.com/catalog.png',
        priceAvg: new Prisma.Decimal(240),
        productType: 'SET_BOOSTER_DISPLAY',
        setName: 'Alpha',
        setCode: 'ALP',
      },
    },
  ],
  heroCard: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('getBoxes', () => {
  beforeEach(() => {
    vi.resetModules();
    findManyMock.mockReset();
  });

  it('returns transformed boxes so they appear in the marketplace list', async () => {
    findManyMock.mockResolvedValue([createBox()]);
    const { getBoxes } = await import('@/app/marketplace/page');

    const result = await getBoxes();

    expect(result).toHaveLength(1);
    expect(result[0].games).toEqual(['POKEMON']);
    expect(result[0].mostValuableCard?.name).toBe('Rare Card');
    expect(result[0].heroProduct?.type).toBe('sealed');
    expect(result[0].heroProduct?.name).toContain('Premium');
  });

  it('allows forcing card highlight in the marketplace', async () => {
    findManyMock.mockResolvedValue([createBox({ heroDisplayMode: 'CARD' })]);
    const { getBoxes } = await import('@/app/marketplace/page');

    const result = await getBoxes();

    expect(result[0].heroProduct?.type).toBe('card');
    expect(result[0].heroProduct?.name).toBe('Rare Card');
  });

  it('prioritizes the manually selected hero card when available', async () => {
    findManyMock.mockResolvedValue([
      createBox({
        heroDisplayMode: 'CARD',
        heroCard: {
          id: 'card-hero',
          scryfallId: 'scry-hero',
          name: 'Selected Hero Card',
          imageUrlGatherer: 'https://example.com/hero.png',
          imageUrlScryfall: null,
          priceAvg: new Prisma.Decimal(42),
          rarity: 'Mythic',
        },
        cards: [],
        boosterBoxes: [],
      }),
    ]);
    const { getBoxes } = await import('@/app/marketplace/page');

    const result = await getBoxes();

    expect(result[0].heroProduct?.type).toBe('card');
    expect(result[0].heroProduct?.name).toBe('Selected Hero Card');
  });

  it('falls back to cards when sealed highlight requested but unavailable', async () => {
    findManyMock.mockResolvedValue([
      createBox({
        heroDisplayMode: 'SEALED',
        boosterBoxes: [],
      }),
    ]);
    const { getBoxes } = await import('@/app/marketplace/page');

    const result = await getBoxes();

    expect(result[0].heroProduct?.type).toBe('card');
  });

  it('falls back to legacy single-game data when the database is outdated', async () => {
    const validationError = new Prisma.PrismaClientValidationError('Unknown argument `games`', {
      clientVersion: '6.19.0',
    });
    findManyMock
      .mockRejectedValueOnce(validationError)
      .mockResolvedValueOnce([
        createBox({
          games: [],
          game: 'MAGIC_THE_GATHERING',
          cards: [],
          boosterBoxes: [],
        }),
      ]);

    const { getBoxes } = await import('@/app/marketplace/page');

    const result = await getBoxes('MAGIC_THE_GATHERING');

    expect(findManyMock).toHaveBeenCalledTimes(2);
    expect(result[0].games).toEqual(['MAGIC_THE_GATHERING']);
    expect(result[0].mostValuableCard).toBeNull();
    expect(result[0].heroProduct).toBeNull();
  });
});

